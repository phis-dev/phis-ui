import type { PhiCmsLayoutRenderNode } from "../../../types/cms";
import type { PhiCmsGeometryWidgetConfig } from "../../../components/widgets/config/geometry";
import type { PhiRuntimeModuleId } from "../../../types/cms-plugins";
import { isPhiRecord } from "../../../helpers/is-record";
import type { PhiSurface } from "../../../types/surface";

export const PHI_BUILDER_PREVIEW_SEARCH_PARAM = "phiBuilderPreview";
export const PHI_BUILDER_PREVIEW_ROUTE = "/builder/api/preview";
export const PHI_BUILDER_PREVIEW_TTL_MS = 1000 * 60 * 30;

export type PhiBuilderRootNodeKind = "layout" | "widget" | null;

export type PhiBuilderPreviewRegionDraft = PhiCmsGeometryWidgetConfig & {
  /** The Region's own look; the root Layout's is its `config.surface`. */
  surface?: PhiSurface | null;
  regionConfig?: Record<string, unknown> | null;
  /**
   * The Region's root Layout: one Layout node like every node nested in it, edited, rendered and
   * stored the same way. Its look is its `config.surface`; the Region's own is `surface` above.
   */
  rootNode?: PhiCmsLayoutRenderNode | null;
};

export type PhiBuilderPreviewSnapshot = {
  version: 2;
  area: string;
  pageKey: string;
  runtimeModuleIds: PhiRuntimeModuleId[];
  regionDrafts: Record<string, PhiBuilderPreviewRegionDraft>;
};

export type PhiBuilderPreviewSnapshotId = string;

export function serializePhiBuilderPreviewSnapshot(snapshot: PhiBuilderPreviewSnapshot) {
  return JSON.stringify(snapshot);
}

export function parsePhiBuilderPreviewSnapshot(value: string | null | undefined): PhiBuilderPreviewSnapshot | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isPhiRecord(parsed) || parsed.version !== 2) {
      return null;
    }

    const area = typeof parsed.area === "string" ? parsed.area.trim() : "";
    const pageKey = typeof parsed.pageKey === "string" ? parsed.pageKey.trim() : "";
    if (
      !area ||
      !pageKey ||
      !Array.isArray(parsed.runtimeModuleIds) ||
      parsed.runtimeModuleIds.some((moduleId) => typeof moduleId !== "string" || moduleId.length === 0) ||
      !isPhiRecord(parsed.regionDrafts)
    ) {
      return null;
    }
    const regionDraftEntries = Object.entries(parsed.regionDrafts);
    if (regionDraftEntries.some(([, draft]) => !isPhiRecord(draft))) {
      return null;
    }
    const regionDrafts = Object.fromEntries(
      regionDraftEntries,
    ) as Record<string, PhiBuilderPreviewRegionDraft>;

    return {
      version: 2,
      area,
      pageKey,
      runtimeModuleIds: parsed.runtimeModuleIds as PhiRuntimeModuleId[],
      regionDrafts,
    };
  } catch {
    return null;
  }
}

export async function savePhiBuilderPreviewSnapshotRequest(
  snapshot: PhiBuilderPreviewSnapshot,
): Promise<PhiBuilderPreviewSnapshotId> {
  const response = await fetch(PHI_BUILDER_PREVIEW_ROUTE, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: serializePhiBuilderPreviewSnapshot(snapshot),
  });
  if (!response.ok) {
    throw new Error(`Preview snapshot request failed with status ${response.status}.`);
  }
  const payload = await response.json() as { id?: unknown };
  if (typeof payload.id !== "string" || payload.id.length === 0) {
    throw new Error("Preview snapshot response has no valid id.");
  }
  return payload.id;
}
