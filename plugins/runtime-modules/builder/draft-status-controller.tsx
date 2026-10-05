"use client";

import { useCallback, useEffect, useState } from "react";

import { PHI_SIGNAL_VALUE_SCHEMAS, type PhiSignalAddress } from "../../../types/signals";
import type { PhiDraftStatusSignalValue } from "../../../types/draft-status";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../components/runtime/runtime-signal-bus";
import { resolvePhiBuilderCmsStoragePath } from "../../../helpers/cms-paths";
import { resolvePhiBuilderActivePageCatalog } from "../../../helpers/cms-page-catalog";
import { createPhiBuilderControllerAddress } from "./controller/address";
import { createPhiBuilderHistoryContext, phiBuilderHistory } from "./history";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderCommandWorkspace,
  PhiDeveloperBuilderWorkspaceState,
} from "./developer-workspace-types";

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
    const storagePath = resolvePhiBuilderCmsStoragePath(area, pageKey, pages);
    return {
      url: `/api/site/cms/page/draft?${new URLSearchParams({ area, path: storagePath }).toString()}`,
      subject: area === "public" ? storagePath : `${area}${storagePath}`,
      historyContext: createPhiBuilderHistoryContext({ workspace, area, pageKey }),
    };
  }

  if (workspace === "structure" || workspace === "modules") {
    if (!state.catalogHydrated) {
      return null;
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
    /*
     * The Module selection has its own Draft on the same Area revision, so it reports its own status:
     * asking the structure endpoint here would show the shell's Draft on a page that cannot save one.
     */
    return {
      url: workspace === "modules"
        ? `/api/site/cms/area/modules/draft?${query}`
        : `/api/site/cms/area/draft?${query}`,
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
  const [stored, setStored] = useState<PhiBuilderStoredDraftStatus | null>(null);
  const historyHead = phiBuilderHistory.useHead(historyContext ?? PHI_BUILDER_NO_DRAFT_HISTORY_CONTEXT);

  useEffect(() => {
    if (targetUrl === null) {
      return;
    }
    let cancelled = false;
    const settle = (next: Omit<PhiBuilderStoredDraftStatus, "requestKey" | "savedHead">) => {
      if (cancelled) {
        return;
      }
      setStored({
        requestKey: targetUrl,
        ...next,
        savedHead: historyContext === null ? null : phiBuilderHistory.getHead(historyContext),
      });
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
  }, [historyContext, targetUrl]);

  const current: PhiDraftStatusSignalValue | null =
    stored === null || stored.requestKey !== targetUrl || subject === null
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
    if (targetUrl === null) {
      return;
    }
    setStored({
      requestKey: targetUrl,
      status,
      revisionId,
      error: null,
      savedHead: savedAt.head,
    });
  }

  return { captureHistoryHead, reportSaved };
}
