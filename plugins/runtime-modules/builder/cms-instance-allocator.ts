"use client";

import { createPhiDraftCmsInstanceId, type PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { isPhiBuilderPageScopedRegion } from "./region-keys";
import {
  getPhiDeveloperBuilderDraftAllocation,
  savePhiDeveloperBuilderDraft,
} from "./persistence";
import {
  builderWorkspaceStore,
  getPhiDeveloperBuilderStateSnapshot,
  getPhiDeveloperRegionDraftsSnapshot,
} from "./developer-workspace-store";
import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";
import { createPhiBuilderDraftAllocationKey } from "./draft-allocation-key";
import { resolvePhiBuilderActivePageCatalog } from "../../../helpers/cms-page-catalog";
import type { PhiBuilderPluginMeta } from "../../../types/builder";

const pendingDraftCreations = new Map<string, Promise<void>>();

export function getPhiBuilderDraftAllocationKey(
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  regionKey: string,
) {
  return createPhiBuilderDraftAllocationKey(
    area,
    pageKey,
    isPhiBuilderPageScopedRegion(regionKey) ? "page" : "area",
  );
}

async function ensurePhiBuilderDraftAllocation(input: {
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  regionKey: string;
  builderPlugins: readonly PhiBuilderPluginMeta[];
}) {
  const allocationKey = getPhiBuilderDraftAllocationKey(input.area, input.pageKey, input.regionKey);
  if (getPhiDeveloperBuilderStateSnapshot("public").draftAllocations[allocationKey]) {
    return;
  }

  let pending = pendingDraftCreations.get(allocationKey);
  if (!pending) {
    pending = (async () => {
      const state = getPhiDeveloperBuilderStateSnapshot("public");
      const workspaceKind = isPhiBuilderPageScopedRegion(input.regionKey) ? "pages" : "structure";
      const existing = await getPhiDeveloperBuilderDraftAllocation({
        area: input.area,
        pageKey: input.pageKey,
        pages: resolvePhiBuilderActivePageCatalog(
          input.area,
          state.modulePresetPagesByArea,
          state.customPages,
          state.persistedPageCatalogByArea,
        ),
        workspaceKind,
        areaPresetSource: state.areaPresetSourcesByArea[input.area] ?? null,
      });
      if (existing) {
        return;
      }
      const saved = await savePhiDeveloperBuilderDraft(
        state,
        getPhiDeveloperRegionDraftsSnapshot(),
        workspaceKind,
        {
          builderPlugins: input.builderPlugins,
          scope: { area: input.area, pageKey: input.pageKey },
        },
      );
      if (!Number.isSafeInteger(saved.revisionId) || (saved.revisionId ?? 0) <= 0) {
        throw new Error("Draft creation did not return a valid revision id.");
      }
    })().finally(() => pendingDraftCreations.delete(allocationKey));
    pendingDraftCreations.set(allocationKey, pending);
  }
  await pending;
}

export async function allocatePhiBuilderCmsInstanceId(input: {
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  regionKey: string;
  builderPlugins: readonly PhiBuilderPluginMeta[];
}): Promise<PhiCmsInstanceId> {
  await ensurePhiBuilderDraftAllocation(input);
  const allocationKey = getPhiBuilderDraftAllocationKey(input.area, input.pageKey, input.regionKey);
  let allocated: PhiCmsInstanceId | null = null;

  builderWorkspaceStore.patch("public", (current) => {
    const allocation = current.draftAllocations[allocationKey];
    if (!allocation) {
      throw new Error(`Missing Draft allocation state for "${allocationKey}".`);
    }
    allocated = createPhiDraftCmsInstanceId({
      domain: isPhiBuilderPageScopedRegion(input.regionKey) ? "page" : "area",
      draftRevisionId: allocation.revisionId,
      sequence: allocation.nextNodeSequence,
    });
    return {
      ...current,
      draftAllocations: {
        ...current.draftAllocations,
        [allocationKey]: {
          ...allocation,
          nextNodeSequence: allocation.nextNodeSequence + 1,
        },
      },
    };
  });

  if (!allocated) {
    throw new Error(`Failed to allocate a CMS instance id for "${allocationKey}".`);
  }
  return allocated;
}
