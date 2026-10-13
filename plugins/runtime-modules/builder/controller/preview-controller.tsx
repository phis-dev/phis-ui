"use client";

import { startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getPhiBuilderDefaultRegionDraft } from "../region-defaults";
import {
  getPhiBuilderRegionDraftKey,
  PHI_BUILDER_PAGE_REGION_KEYS,
  PHI_BUILDER_SHELL_REGION_KEYS,
} from "../region-keys";
import {
  PHI_BUILDER_PREVIEW_SEARCH_PARAM,
  savePhiBuilderPreviewSnapshotRequest,
} from "../preview-transport";
import { getPhiDeveloperRegionDraftsSnapshot } from "../developer-workspace-store";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderRegionDraft,
  PhiDeveloperBuilderWorkspaceState,
} from "../developer-workspace-types";

function materializePhiBuilderPreviewRegionDrafts(
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  regionDrafts: Record<string, PhiDeveloperBuilderRegionDraft>,
) {
  const nextDrafts: Record<string, PhiDeveloperBuilderRegionDraft> = {};
  const regionKeys = [...PHI_BUILDER_SHELL_REGION_KEYS, ...PHI_BUILDER_PAGE_REGION_KEYS];

  for (const regionKey of regionKeys) {
    const draftKey = getPhiBuilderRegionDraftKey(area, regionKey, pageKey);
    nextDrafts[draftKey] = {
      ...getPhiBuilderDefaultRegionDraft(regionKey),
      ...(regionDrafts[draftKey] ?? {}),
    };
  }

  for (const [draftKey, draft] of Object.entries(regionDrafts)) {
    if (nextDrafts[draftKey] == null) {
      nextDrafts[draftKey] = draft;
    }
  }

  return nextDrafts;
}

export function usePhiDeveloperBuilderPreviewModeController(
  state: Pick<PhiDeveloperBuilderWorkspaceState, "area" | "pageKey" | "runtimeModuleIdsByArea">,
) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const enterEditor = () => {
    if (typeof pathname !== "string") {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    if (!nextSearchParams.has(PHI_BUILDER_PREVIEW_SEARCH_PARAM)) {
      return;
    }

    nextSearchParams.delete(PHI_BUILDER_PREVIEW_SEARCH_PARAM);
    const nextHref = nextSearchParams.toString() ? `${pathname}?${nextSearchParams.toString()}` : pathname;
    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  };

  const enterPreview = async () => {
    if (typeof pathname !== "string") {
      return;
    }

    const materializedRegionDrafts = materializePhiBuilderPreviewRegionDrafts(
      state.area,
      state.pageKey,
      getPhiDeveloperRegionDraftsSnapshot(),
    );
    const snapshot = {
      version: 2,
      area: state.area,
      pageKey: state.pageKey,
      runtimeModuleIds: state.runtimeModuleIdsByArea[state.area] ?? [],
      regionDrafts: materializedRegionDrafts,
    } as const;
    const previewId = await savePhiBuilderPreviewSnapshotRequest(snapshot);
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set(PHI_BUILDER_PREVIEW_SEARCH_PARAM, previewId);
    const nextHref = `${pathname}?${nextSearchParams.toString()}`;

    startTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  };

  return {
    enterEditor,
    enterPreview,
  };
}
