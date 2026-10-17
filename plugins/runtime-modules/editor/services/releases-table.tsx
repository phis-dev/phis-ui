"use client";

import { useCallback, useMemo, useRef, type ReactNode } from "react";

import {
  createPhiTableProviderRequestInit,
  readPhiTableRows,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
} from "../../../../types/table-widget";
import {
  PhiTableProviderClient,
  type PhiTableProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-table-provider";
import {
  readPhiTableProviderResponse,
  type ReadPhiTableProviderResponseOptions,
} from "../../../../components/widgets/client/shared/phi-table-provider-response";
import { PHI_EDITOR_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import { PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY, PHI_EDITOR_RELEASES_RESOURCE_KEY } from "../ids";

const RELEASES_API_PATH = "/api/site/editor/releases";
const RESPONSE_OPTIONS: ReadPhiTableProviderResponseOptions = { subject: "Releases" };

type ReleasePerson = { name?: string | null; email?: string | null } | null;

/** One acting request: where it goes and how. Kept per row so an action never reconstructs it. */
type ReleaseAct = { path: string; method: "POST" | "DELETE"; body?: Record<string, unknown> };

type ReleaseRow = Record<string, unknown> & {
  id: string;
  publish: ReleaseAct | null;
  reject: ReleaseAct | null;
};

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPerson(value: unknown) {
  const person = (value ?? null) as ReleasePerson;
  return readText(person?.name) ?? readText(person?.email) ?? "";
}

function describePlace(item: Record<string, unknown>) {
  const place = (item.place ?? item) as Record<string, unknown>;
  const area = readText(place.area) ?? "";
  const address = readText(place.path) ?? readText(place.presetKey);
  return address ? `${area} · ${address}` : area;
}

/**
 * Core's queue as the Table speaks it: one row per waiting thing, the words a reader needs, and the request
 * each of its two acts makes.
 *
 * An Area's draft is listed and not published from here: publishing an Area names the Shell preset it
 * stands on, which the queue does not carry. The Builder publishes it.
 */
function toReleaseRow(item: Record<string, unknown>): ReleaseRow | null {
  switch (item.kind) {
    case "content": {
      const contentId = item.contentId;
      return {
        id: `content:${String(contentId)}`,
        kind: "content",
        what: readText(item.preview) ?? readText(item.storage) ?? "",
        where: describePlace(item),
        by: readPerson(item.writtenBy),
        at: item.writtenAt,
        publishable: true,
        rejectable: true,
        publish: {
          path: "/api/site/editor/content/publish",
          method: "POST",
          body: { contentId, versionId: item.submittedVersionId },
        },
        reject: { path: `/api/site/editor/content/submit?contentId=${String(contentId)}`, method: "DELETE" },
      };
    }
    case "entry": {
      const contentId = item.contentId;
      const entryKind = String(item.entryKind ?? "");
      const base = `/api/site/editor/entries/${encodeURIComponent(entryKind)}`;
      return {
        id: `entry:${entryKind}:${String(contentId)}`,
        kind: "entry",
        what: readText(item.title) ?? readText(item.slug) ?? "",
        where: entryKind,
        by: readPerson(item.writtenBy),
        at: item.writtenAt,
        publishable: true,
        rejectable: true,
        publish: { path: `${base}/publish`, method: "POST", body: { contentId, versionId: item.submittedVersionId } },
        reject: { path: `${base}/submit?contentId=${String(contentId)}`, method: "DELETE" },
      };
    }
    case "page": {
      const address = readText(item.path)
        ? { path: item.path }
        : { ownerModuleId: item.ownerModuleId, presetKey: item.presetKey };
      return {
        id: `page:${String(item.revisionId)}`,
        kind: "page",
        what: readText(item.path) ?? readText(item.presetKey) ?? "",
        where: describePlace(item),
        by: readPerson(item.savedBy),
        at: item.savedAt,
        publishable: true,
        rejectable: false,
        publish: {
          path: "/api/site/cms/page/publish",
          method: "POST",
          body: { area: item.area, revisionId: item.revisionId, ...address },
        },
        reject: null,
      };
    }
    case "area":
      return {
        id: `area:${String(item.area)}:${String(item.part)}`,
        kind: "area",
        what: String(item.part ?? ""),
        where: String(item.area ?? ""),
        by: readPerson(item.savedBy),
        at: item.savedAt,
        // The Area's publish names the Shell preset it stands on; a draft without one has nothing to name.
        publishable: Boolean(readText(item.ownerModuleId) && readText(item.presetKey)),
        rejectable: false,
        publish: readText(item.ownerModuleId) && readText(item.presetKey)
          ? {
              path: item.part === "modules" ? "/api/site/cms/area/modules/publish" : "/api/site/cms/area/publish",
              method: "POST",
              body: {
                area: item.area,
                revisionId: item.revisionId,
                ownerModuleId: item.ownerModuleId,
                presetKey: item.presetKey,
              },
            }
          : null,
        reject: null,
      };
    default:
      return null;
  }
}

/**
 * The Publisher's queue for a Table, and its two acts: publish what was submitted, or send it back.
 *
 * A refusal keeps its reason: Core answers `403` to anybody who may not publish and `409` to a version
 * somebody wrote past, and that sentence is what the Table shows.
 */
export function PhiEditorReleasesTableProviderClient({ children }: { children: ReactNode }) {
  const rowsRef = useRef(new Map<string, ReleaseRow>());

  const query = useCallback(async ({ resourceKey, signal }: PhiTableProviderQueryRequest) => {
    if (resourceKey !== PHI_EDITOR_RELEASES_RESOURCE_KEY) {
      throw new PhiTableProviderError("resource-not-found", `Unknown releases resource "${resourceKey}".`);
    }
    const result = await readPhiTableProviderResponse<{ items?: unknown }>(
      await fetch(RELEASES_API_PATH, createPhiTableProviderRequestInit(signal)),
      RESPONSE_OPTIONS,
    );
    const rows = readPhiTableRows(result?.items)
      .map(toReleaseRow)
      .filter((row): row is ReleaseRow => row !== null);
    rowsRef.current = new Map(rows.map((row) => [row.id, row]));
    // The acts stay here; the Table gets the words.
    const visible = rows.map((row) => {
      const { publish, reject, ...rest } = row;
      void publish;
      void reject;
      return rest;
    });
    return { rows: visible, total: visible.length, page: 1, pageSize: Math.max(visible.length, 1) };
  }, []);

  const mutate = useCallback(async (request: PhiTableProviderMutationRequest) => {
    if (request.kind !== "action") {
      throw new PhiTableProviderError("mutation-not-supported", "Releases are acted on, not edited.");
    }
    if (request.actionKey === "refresh") {
      return { status: "accepted" as const, invalidation: "view" as const };
    }
    const row = rowsRef.current.get(String(request.rowIdentity));
    if (!row) {
      throw new PhiTableProviderError(
        "record-not-loaded",
        "That item is no longer in the current view. Reload the Table and try again.",
      );
    }
    const act = request.actionKey === "publish" ? row.publish : request.actionKey === "reject" ? row.reject : null;
    if (!act) {
      throw new PhiTableProviderError("action-not-supported", `"${request.actionKey}" does not apply to this item.`);
    }
    await readPhiTableProviderResponse<unknown>(
      await fetch(act.path, {
        method: act.method,
        cache: "no-store",
        credentials: "include",
        headers: {
          accept: "application/json",
          ...(act.body ? { "content-type": "application/json" } : {}),
        },
        ...(act.body ? { body: JSON.stringify(act.body) } : {}),
        signal: request.signal,
      }),
      RESPONSE_OPTIONS,
    );
    // Either act takes the row out of the queue, so the whole list is read again.
    return { status: "accepted" as const, invalidation: "resource" as const };
  }, []);

  const registration = useMemo<PhiTableProviderRegistration>(() => ({
    key: PHI_EDITOR_RELEASES_DATA_PROVIDER_KEY,
    resources: PHI_EDITOR_RUNTIME_DATA_PROVIDER_DESCRIPTORS[0].resources,
    query,
    mutate,
  }), [mutate, query]);

  return <PhiTableProviderClient registration={registration}>{children}</PhiTableProviderClient>;
}
