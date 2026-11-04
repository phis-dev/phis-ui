"use client";

import { isPhiRecord } from "../../../helpers/is-record";
import { createPhiResponseReader, requirePhiField } from "../../../components/widgets/config/strict-config-reader";

import {
  resolvePhiBuilderCatalogApiArea,
  type PhiBuilderPageCatalogArea,
  type PhiBuilderPersistedPageCatalogEntry,
} from "../../../helpers/cms-page-catalog";

const persistedPageCatalogRequests = new Map<
  PhiBuilderPageCatalogArea,
  Promise<PhiBuilderPersistedPageCatalogEntry[]>
>();

export function loadPhiBuilderPersistedPageCatalog(
  area: PhiBuilderPageCatalogArea,
  options: { refresh?: boolean } = {},
) {
  if (options.refresh) {
    persistedPageCatalogRequests.delete(area);
  }

  const cached = persistedPageCatalogRequests.get(area);
  if (cached) return cached;

  const request = (async () => {
    const url = new URL("/api/site/cms/pages", window.location.origin);
    url.searchParams.set("area", resolvePhiBuilderCatalogApiArea(area));
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json().catch(() => null)) as
      | { pages?: PhiBuilderPersistedPageCatalogEntry[]; error?: string; details?: string[] }
      | null;

    if (!response.ok) {
      const detail = body?.details?.length ? ` ${body.details.join(" ")}` : "";
      throw new Error(`${body?.error ?? "Failed to load page catalog."}${detail}`);
    }

    return Array.isArray(body?.pages) ? body.pages : [];
  })();

  persistedPageCatalogRequests.set(area, request);
  void request.catch(() => {
    if (persistedPageCatalogRequests.get(area) === request) {
      persistedPageCatalogRequests.delete(area);
    }
  });
  return request;
}

export async function changePhiBuilderPagePath(input: {
  area: PhiBuilderPageCatalogArea;
  pageScopeId: number;
  path: string;
}) {
  if (!Number.isSafeInteger(input.pageScopeId) || input.pageScopeId <= 0) {
    throw new Error("Page path changes require a positive Page Scope id.");
  }
  const response = await fetch(`/api/site/cms/pages/${input.pageScopeId}/path`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ area: resolvePhiBuilderCatalogApiArea(input.area), path: input.path }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = isPhiRecord(body) ? body : {};
    const message = typeof failure.message === "string" ? failure.message : null;
    const error = typeof failure.error === "string" ? failure.error : null;
    throw new Error(message ?? error ?? `Page path change failed (${response.status}).`);
  }
  /*
   * Read, not cast. The server always counts the references that follow the Page (`references.total`);
   * a missing count used to read as 0, which told the author nothing would follow a rename that moved
   * links all over the Site.
   */
  const reader = createPhiResponseReader(body, "The Page path change");
  const pendingPath = reader.record.pendingPath;
  return {
    pageScopeId: requirePhiField(reader, "pageScopeId", "a whole number", reader.integer),
    /* Still the address the Page answers on: a rename is a pending change until somebody publishes. */
    path: requirePhiField(reader, "path", "a path", reader.string),
    pendingPath: pendingPath === null ? null : requirePhiField(reader, "pendingPath", "a path or null", reader.string),
    references: requirePhiField(reader, "references", "the references that follow the Page", (key) =>
      reader.object(key, (references) =>
        requirePhiField(references, "total", "a whole number", references.integer))),
  };
}
