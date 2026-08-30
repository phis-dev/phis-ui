import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import type {
  PhiCmsBorderWidgetConfig,
  PhiCmsPaddingWidgetConfig,
} from "../../../types/cms-config";
import type { PhiCmsBackgroundWidgetConfig } from "../../../components/widgets/config/background";
import type { PhiCmsGeometryWidgetConfig } from "../../../components/widgets/config/geometry";
import type { PhiAnchorWidgetPlacement } from "../../../components/controls/phi-anchor-control-contract";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiRuntimeModuleId } from "../../../types/cms-plugins";
import type { PhiShadow, PhiLayoutEffectId } from "../../../types/layout-style";

export const PHI_BUILDER_PREVIEW_SEARCH_PARAM = "phiBuilderPreview";
export const PHI_BUILDER_PREVIEW_ROUTE = "/builder/api/preview";
export const PHI_BUILDER_PREVIEW_TTL_MS = 1000 * 60 * 30;

export type PhiBuilderRootNodeKind = "layout" | "widget" | null;

export type PhiBuilderPreviewRegionDraft = PhiCmsGeometryWidgetConfig & {
  background?: PhiCmsBackgroundWidgetConfig | null;
  border?: PhiCmsBorderWidgetConfig | null;
  effect?: PhiLayoutEffectId | null;
  shadow?: PhiShadow | null;
  regionConfig?: Record<string, unknown> | null;
  rootNodeId?: PhiCmsInstanceId | null;
  rootNodeTypeKey?: string | null;
  rootNodeKind?: PhiBuilderRootNodeKind;
  rootNodeTitle?: string | null;
  rootNodePackageName?: string | null;
  rootNodeConfig?: Record<string, unknown> | null;
  rootNodeGeometry?: PhiCmsGeometryWidgetConfig | null;
  rootNodeAnchor?: PhiAnchorWidgetPlacement | null;
  rootNodePadding?: PhiCmsPaddingWidgetConfig | null;
  rootNodeBackground?: PhiCmsBackgroundWidgetConfig | null;
  rootNodeBorder?: PhiCmsBorderWidgetConfig | null;
  rootNodeShadow?: PhiShadow | null;
  rootNodeChildLayouts?: PhiCmsLayoutRenderNode[];
  rootNodeChildWidgets?: PhiCmsContentWidgetNode[];
};

export type PhiBuilderPreviewSnapshot = {
  version: 2;
  area: string;
  pageKey: string;
  runtimeModuleIds: PhiRuntimeModuleId[];
  regionDrafts: Record<string, PhiBuilderPreviewRegionDraft>;
};

export type PhiBuilderPreviewSnapshotId = string;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function serializePhiBuilderPreviewSnapshot(snapshot: PhiBuilderPreviewSnapshot) {
  return JSON.stringify(snapshot);
}

export function parsePhiBuilderPreviewSnapshot(value: string | null | undefined): PhiBuilderPreviewSnapshot | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed) || parsed.version !== 2) {
      return null;
    }

    const area = typeof parsed.area === "string" ? parsed.area.trim() : "";
    const pageKey = typeof parsed.pageKey === "string" ? parsed.pageKey.trim() : "";
    if (
      !area ||
      !pageKey ||
      !Array.isArray(parsed.runtimeModuleIds) ||
      parsed.runtimeModuleIds.some((moduleId) => typeof moduleId !== "string" || moduleId.length === 0) ||
      !isRecord(parsed.regionDrafts)
    ) {
      return null;
    }
    const regionDraftEntries = Object.entries(parsed.regionDrafts);
    if (regionDraftEntries.some(([, draft]) => !isRecord(draft))) {
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
