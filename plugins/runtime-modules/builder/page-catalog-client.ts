"use client";

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
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    message?: string;
    pageScopeId?: number;
    oldPath?: string;
    path?: string;
    references?: {
      total?: number;
      bySource?: { page?: number; navigation?: number; content?: number; area?: number };
    };
  } | null;
  if (!response.ok || typeof body?.path !== "string") {
    throw new Error(body?.message ?? body?.error ?? `Page path change failed (${response.status}).`);
  }
  return {
    pageScopeId: body.pageScopeId ?? input.pageScopeId,
    oldPath: body.oldPath ?? null,
    path: body.path,
    references: Number.isSafeInteger(body.references?.total) ? body.references!.total as number : 0,
  };
}
