"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PHI_SIGNAL_VALUE_SCHEMAS, type PhiSignalAddress } from "../../../../types/signals";
import { readPhiDraftStatusSignalValue, type PhiDraftStatusSignalValue } from "../../../../types/draft-status";
import { isPhiBuilderAreaKey } from "../../../../constants/cms-areas";
import { isPhiRecord } from "../../../../helpers/is-record";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { usePhiApplicationFeedback } from "../../../../components/runtime/use-phi-application-feedback";
import { resolvePhiBuilderCmsStoragePath } from "../../../../helpers/cms-paths";
import {
  findPhiPageNodePath,
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderPagePresetSource,
} from "../../../../helpers/cms-page-catalog";
import { createPhiBuilderControllerAddress } from "../controller/address";
import { createPhiBuilderHistoryContext, phiBuilderHistory } from "../history";
import {
  clearPhiBuilderDraftAllocation,
  getPhiBuilderDraftContextGeneration,
  invalidatePhiBuilderDraftContext,
} from "../developer-workspace-store";
import { createPhiBuilderDraftAllocationKey } from "../draft-allocation-key";
import { loadPhiBuilderPersistedPageCatalog } from "../page-catalog-client";
import { storePhiWorkspacePersistedPages } from "../workspace-catalog-actions";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderCommandWorkspace,
  PhiDeveloperBuilderWorkspaceState,
} from "../developer-workspace-types";

type PhiBuilderStoredDraftStatus = {
  requestKey: string;
  status: "draft" | "published" | "error";
  revisionId: number | null;
  error: string | null;
  /** The head of the workspace's undo history when this state was stored. */
  savedHead: unknown;
};

/** A history scope nothing records into, for the screens that report no draft. */
/** What `captureHistoryHead` hands out and `reportSaved` takes back; opaque to everyone in between. */
export type PhiBuilderSavedHistoryHead = { readonly head: unknown };

const PHI_BUILDER_NO_DRAFT_HISTORY_CONTEXT = "draft-status:none";

type PhiBuilderDraftStatusTarget = {
  /** Where the stored state is read; doubles as the identity of what is being reported on. */
  url: string;
  subject: string;
  historyContext: string;
};

function resolveTarget(
  workspace: PhiDeveloperBuilderCommandWorkspace,
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  navKey: string,
  state: PhiDeveloperBuilderWorkspaceState,
): PhiBuilderDraftStatusTarget | null {
  if (workspace === "navigation") {
    return {
      url: `/api/site/cms/navigation/draft?key=${encodeURIComponent(navKey)}`,
      subject: navKey,
      historyContext: createPhiBuilderHistoryContext({ workspace, area, navKey }),
    };
  }

  if (workspace === "pages") {
    if (!state.catalogHydrated || !state.pageCatalogHydratedByArea[area] || !pageKey) {
      return null;
    }
    const pages = resolvePhiBuilderActivePageCatalog(
      area,
      state.modulePresetPagesByArea,
      state.customPages,
      state.persistedPageCatalogByArea,
    );
    /*
     * A Page key the Area's catalog does not hold yet is a moment, like the catalog not being hydrated:
     * opened as `/builder/phis/ui/pages?phiBuilderArea=app`, the server stands on the Area's root, which
     * the client's catalog leaves out while it forwards, and the workspace moves to an offered Page right
     * after. Asking the catalog for the storage path of that key threw during render and took the whole
     * Builder down with a 500.
     */
    if (!findPhiPageNodePath(pages, pageKey)) {
      return null;
    }
    const storagePath = resolvePhiBuilderCmsStoragePath(area, pageKey, pages);
    /*
     * Addressed the way a save addresses it: a Module Page by its preset identity, which survives a
     * changed path. Asking by path found nothing after a move and reported the Page as published.
     */
    const presetSource = resolvePhiBuilderPagePresetSource(pageKey, pages);
    const address: Record<string, string> = presetSource
      ? { area, ownerModuleId: presetSource.ownerModuleId, presetKey: presetSource.presetKey }
      : { area, path: storagePath };
    return {
      url: `/api/site/cms/page/draft?${new URLSearchParams(address).toString()}`,
      subject: area === "public" ? storagePath : `${area}${storagePath}`,
      historyContext: createPhiBuilderHistoryContext({ workspace, area, pageKey }),
    };
  }

  if (workspace === "structure" || workspace === "modules") {
    if (!state.catalogHydrated) {
      return null;
    }
    /*
     * The Module selection has its own Draft, stored apart from the structure and naming no shell, so it
     * reports its own status: asking the structure endpoint here would show the shell's Draft on a page
     * that cannot save one. The structure's Draft is asked under the shell the Area takes.
     */
    if (workspace === "modules") {
      return {
        url: `/api/site/cms/area/modules/draft?${new URLSearchParams({ area }).toString()}`,
        subject: area === "public" ? "/" : `${area}/`,
        historyContext: createPhiBuilderHistoryContext({ workspace }),
      };
    }
    const sourcePreset = state.areaPresetSourcesByArea[area] ?? null;
    if (!sourcePreset) {
      throw new Error(`Builder target Area "${area}" has no source preset identity.`);
    }
    const query = new URLSearchParams({
      area,
      ownerModuleId: sourcePreset.ownerModuleId,
      presetKey: sourcePreset.presetKey,
    }).toString();
    return {
      url: `/api/site/cms/area/draft?${query}`,
      subject: area === "public" ? "/" : `${area}/`,
      historyContext: createPhiBuilderHistoryContext({ workspace, area }),
    };
  }

  return null;
}

/**
 * The draft state of the workspace on screen, stated for the Core Draft Status Widget.
 *
 * What is stored is read here once per workspace target -- the Area shell, its Module selection, a
 * Page, a Navigation -- and kept as the saved state; a save or a publish replaces it through
 * `reportSaved`. `unsaved` is the history having moved since: the head of the workspace's undo history
 * is remembered with every saved state, and any record, undo or redo that leaves a different head
 * standing means what is on screen is in no stored revision. Undoing back to the saved head is saved
 * again.
 *
 * Every change is broadcast; a Widget that mounts asks on `draftStatus`/`activate` and is answered
 * alone.
 */
export function usePhiBuilderDraftStatusController({
  commandWorkspace,
  effectiveArea,
  effectiveNavKey,
  effectivePageKey,
  state,
}: {
  commandWorkspace: PhiDeveloperBuilderCommandWorkspace;
  effectiveArea: PhiDeveloperBuilderArea;
  effectiveNavKey: string;
  effectivePageKey: string;
  state: PhiDeveloperBuilderWorkspaceState;
}) {
  const dispatchSignal = usePhiSignalDispatcher();
  const { showMessage } = usePhiApplicationFeedback();
  const target = resolveTarget(
    commandWorkspace,
    effectiveArea,
    effectivePageKey,
    effectiveNavKey,
    state,
  );
  const targetUrl = target?.url ?? null;
  const subject = target?.subject ?? null;
  const historyContext = target?.historyContext ?? null;
  const requestKey = targetUrl === null || historyContext === null
    ? null
    : `${targetUrl}:${getPhiBuilderDraftContextGeneration(historyContext)}`;
  const [stored, setStored] = useState<PhiBuilderStoredDraftStatus | null>(null);
  /*
   * The history head each target was last saved or first read at. The status is read again whenever the
   * target changes -- an Area switched away from and back -- and taking the head at that moment called
   * every edit made before it saved: back on an Area with an unsaved edit, the badge said "Published".
   * A target keeps its saved head until a revision action replaces that editing context.
   */
  const savedHeadsRef = useRef(new Map<string, { requestKey: string; head: unknown }>());
  const historyHead = phiBuilderHistory.useHead(historyContext ?? PHI_BUILDER_NO_DRAFT_HISTORY_CONTEXT);

  useEffect(() => {
    if (targetUrl === null || requestKey === null || historyContext === null) {
      return;
    }
    let cancelled = false;
    const settle = (next: Omit<PhiBuilderStoredDraftStatus, "requestKey" | "savedHead">) => {
      if (cancelled) {
        return;
      }
      const saved = savedHeadsRef.current.get(targetUrl);
      const savedHead = saved?.requestKey === requestKey ? saved.head
        : saved ? null : phiBuilderHistory.getHead(historyContext);
      savedHeadsRef.current.set(targetUrl, { requestKey, head: savedHead });
      setStored({ requestKey, ...next, savedHead });
    };

    void fetch(targetUrl, { method: "GET", cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) {
          settle({ status: "published", revisionId: null, error: null });
          return;
        }
        const body = (await response.json().catch(() => null)) as
          | { revisionId?: number | null; error?: string }
          | null;
        if (!response.ok) {
          settle({ status: "error", revisionId: null, error: body?.error ?? null });
          return;
        }
        const revisionId = Number.isInteger(body?.revisionId) ? (body?.revisionId as number) : null;
        settle({ status: revisionId != null ? "draft" : "published", revisionId, error: null });
      })
      .catch((error: unknown) => {
        settle({
          status: "error",
          revisionId: null,
          error: error instanceof Error ? error.message : null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [historyContext, requestKey, targetUrl]);

  const current: PhiDraftStatusSignalValue | null =
    stored === null || stored.requestKey !== requestKey || subject === null
      ? null
      : stored.status === "error"
        ? { status: "error", revisionId: null, subject, error: stored.error }
        : historyHead !== stored.savedHead
          ? { status: "unsaved", revisionId: stored.revisionId, subject }
          : { status: stored.status, revisionId: stored.revisionId, subject };

  const emitTo = useCallback((
    receiver: PhiSignalAddress | "broadcast",
    value: PhiDraftStatusSignalValue,
    correlationId?: string,
  ) => {
    dispatchSignal({
      scope: "area",
      channel: "draftStatus",
      action: "change",
      value,
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus,
      sender: createPhiBuilderControllerAddress(),
      receiver,
      correlationId,
      timestamp: Date.now(),
    });
  }, [dispatchSignal]);

  const serialized = current === null ? null : JSON.stringify(current);
  useEffect(() => {
    if (serialized !== null) {
      emitTo("broadcast", JSON.parse(serialized) as PhiDraftStatusSignalValue);
    }
  }, [emitTo, serialized]);

  usePhiSignalListener(
    (signal) => {
      if (
        signal.scope === "area" &&
        signal.channel === "draftStatus" &&
        signal.action === "change" &&
        signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.revisionsDraftStatus &&
        signal.receiver === "broadcast" &&
        signal.sender !== createPhiBuilderControllerAddress() &&
        isPhiRecord(signal.value)
      ) {
        // Revisions names the exact draft it replaced. Ordinary status messages describe the canvas.
        const { area, pageKey, areaModules } = signal.value as Record<string, unknown>;
        const status = readPhiDraftStatusSignalValue(signal.value)?.status;
        if (!isPhiBuilderAreaKey(area) || (status !== "draft" && status !== "published")) {
          return;
        }
        if (areaModules === true) {
          clearPhiBuilderDraftAllocation(createPhiBuilderDraftAllocationKey(area, "", "modules"));
        } else if (typeof pageKey === "string") {
          invalidatePhiBuilderDraftContext({ workspace: "pages", area, pageKey });
          /*
           * The Page's entry in the Area's catalog -- its scope id, pointers, deletion and pending path --
           * is the server's as well: a reset deletes the scope, a restore moves its working draft. The
           * catalog is read once per Area, so it is read again here, or Pages keeps the replaced entry.
           */
          void loadPhiBuilderPersistedPageCatalog(area, { refresh: true })
            .then((pages) => storePhiWorkspacePersistedPages(area, pages))
            .catch((error: unknown) => {
              showMessage({
                level: "error",
                content: error instanceof Error ? error.message : "Failed to load page catalog.",
              });
            });
        } else {
          invalidatePhiBuilderDraftContext({ workspace: "structure", area });
        }
        return;
      }
      if (
        signal.scope !== "area" ||
        signal.channel !== "draftStatus" ||
        signal.action !== "activate" ||
        signal.receiver !== createPhiBuilderControllerAddress() ||
        signal.sender == null
      ) {
        return;
      }
      // Not read yet: the broadcast that follows the read reaches the Widget that asked as well.
      if (current !== null) {
        emitTo(signal.sender, current, signal.correlationId);
      }
    },
    undefined,
    createPhiBuilderControllerAddress(),
  );

  /**
   * The head of the workspace's undo history, taken as a save or publish begins -- before the drafts
   * are read for the payload. A save awaits the server, and an edit made while it waits is in no stored
   * revision; stamping the head from after the await would have called that edit saved, and a reload
   * would have dropped it without a word. The token goes back in through `reportSaved`.
   */
  const captureHistoryHead = useCallback((): PhiBuilderSavedHistoryHead => ({
    head: historyContext === null ? null : phiBuilderHistory.getHead(historyContext),
  }), [historyContext]);

  /** A save or publish of the workspace on screen: the state it stored, and the head it was taken at. */
  function reportSaved(
    status: "draft" | "published",
    revisionId: number | null,
    savedAt: PhiBuilderSavedHistoryHead,
  ) {
    if (targetUrl === null || requestKey === null) {
      return;
    }
    savedHeadsRef.current.set(targetUrl, { requestKey, head: savedAt.head });
    setStored({
      requestKey,
      status,
      revisionId,
      error: null,
      savedHead: savedAt.head,
    });
  }

  /** Whether what is on screen is in no stored revision -- what a preview of the saved draft leaves out. */
  const hasUnsavedChanges = current?.status === "unsaved";

  return { captureHistoryHead, reportSaved, hasUnsavedChanges };
}
