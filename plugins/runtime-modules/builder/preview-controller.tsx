"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getPhiBuilderDefaultRegionDraft } from "./region-defaults";
import {
  getPhiBuilderRegionDraftKey,
  PHI_BUILDER_PAGE_REGION_KEYS,
  PHI_BUILDER_SHELL_REGION_KEYS,
} from "./region-keys";
import {
  PHI_BUILDER_PREVIEW_SEARCH_PARAM,
  savePhiBuilderPreviewSnapshotRequest,
  serializePhiBuilderPreviewSnapshot,
} from "./preview-transport";
import { getPhiDeveloperRegionDraftsSnapshot } from "./developer-workspace-store";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderMode,
  PhiDeveloperBuilderRegionDraft,
  PhiDeveloperBuilderWorkspaceState,
} from "./developer-workspace-types";

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

export function usePhiDeveloperBuilderPreviewUrlSync(
  state: Pick<PhiDeveloperBuilderWorkspaceState, "area" | "pageKey" | "builderMode" | "runtimeModuleIdsByArea">,
  regionDrafts: Record<string, PhiDeveloperBuilderRegionDraft>,
) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastPreviewRef = useRef<{ payload: string; id: string } | null>(null);
  const pendingPreviewRef = useRef(false);

  useEffect(() => {
    if (typeof pathname !== "string") {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (state.builderMode !== "preview") {
      pendingPreviewRef.current = false;
      if (!nextSearchParams.has(PHI_BUILDER_PREVIEW_SEARCH_PARAM)) {
        return;
      }

      nextSearchParams.delete(PHI_BUILDER_PREVIEW_SEARCH_PARAM);
      lastPreviewRef.current = null;
      const nextHref = nextSearchParams.toString() ? `${pathname}?${nextSearchParams.toString()}` : pathname;
      startTransition(() => {
        router.replace(nextHref, { scroll: false });
      });
      return;
    }

    const snapshot = {
      version: 2,
      area: state.area,
      pageKey: state.pageKey,
      runtimeModuleIds: state.runtimeModuleIdsByArea[state.area] ?? [],
      regionDrafts,
    } as const;
    const serializedPreview = serializePhiBuilderPreviewSnapshot(snapshot);
    const lastPreview = lastPreviewRef.current;

    if (
      lastPreview?.payload === serializedPreview &&
      nextSearchParams.get(PHI_BUILDER_PREVIEW_SEARCH_PARAM) === lastPreview.id
    ) {
      return;
    }

    let cancelled = false;
    pendingPreviewRef.current = true;

    savePhiBuilderPreviewSnapshotRequest(snapshot)
      .then((previewId) => {
        if (cancelled) {
          return;
        }

        pendingPreviewRef.current = false;
        lastPreviewRef.current = {
          payload: serializedPreview,
          id: previewId,
        };

        const updatedSearchParams = new URLSearchParams(searchParams.toString());
        updatedSearchParams.set(PHI_BUILDER_PREVIEW_SEARCH_PARAM, previewId);
        const nextHref = `${pathname}?${updatedSearchParams.toString()}`;

        startTransition(() => {
          router.replace(nextHref, { scroll: false });
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        pendingPreviewRef.current = false;
        lastPreviewRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, regionDrafts, router, searchParams, state.area, state.builderMode, state.pageKey, state.runtimeModuleIdsByArea]);
}

export function usePhiDeveloperBuilderPreviewModeController(
  state: Pick<PhiDeveloperBuilderWorkspaceState, "area" | "pageKey" | "builderMode" | "runtimeModuleIdsByArea">,
) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingMode, setPendingMode] = useState<PhiDeveloperBuilderMode | null>(null);
  const effectiveBuilderMode = pendingMode ?? state.builderMode;
  const isPendingPreviewTransition = pendingMode === "preview" && state.builderMode !== "preview";

  const enterEditor = () => {
    setPendingMode("editor");

    if (typeof pathname !== "string") {
      setPendingMode(null);
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    if (!nextSearchParams.has(PHI_BUILDER_PREVIEW_SEARCH_PARAM)) {
      setPendingMode(null);
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

    setPendingMode("preview");

    try {
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
    } catch (error) {
      setPendingMode(null);
      throw error;
    }
  };

  return {
    effectiveBuilderMode,
    isPendingPreviewTransition,
    enterEditor,
    enterPreview,
  };
}
