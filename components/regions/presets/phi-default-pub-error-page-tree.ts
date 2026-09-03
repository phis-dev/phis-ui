import { createPhiPresetCmsInstanceId } from "../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/public/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

export type PhiCmsErrorCode = 401 | 403 | 404 | 500;

const ERROR_STATUS: Record<PhiCmsErrorCode, "403" | "404" | "500"> = {
  401: "403",
  403: "403",
  404: "404",
  500: "500",
};

/**
 * The source text, and the source text only.
 *
 * It goes into the widget config untranslated, because the `result` widget translates through the Site
 * translator -- which is the point: a Site defines its own error strings, and it can only do that if
 * what reaches the translator is the source rather than an already translated string. Pre-translating
 * here would register the German text as a Site source, ask for a de->de translation, and show the
 * translation in the builder inspector where every other widget shows the original.
 *
 * The admin presets are the deliberate other case: their labels are system copy shared across Sites, so
 * they are translated globally in the preset and carry `translate: false` into the widget.
 */
const ERROR_SOURCE_COPY: Record<PhiCmsErrorCode, { title: string; subTitle: string }> = {
  401: {
    title: "Not authorized",
    subTitle: "You are not authorized to view this page.",
  },
  403: {
    title: "Forbidden",
    subTitle: "You are not allowed to view this page.",
  },
  404: {
    title: "Not found",
    subTitle: "This page could not be found.",
  },
  500: {
    title: "Something went wrong",
    subTitle: "Something went wrong.",
  },
};

const SYNTHETIC_ERROR_REGION_IDS = {
  regionContent: -700,
} as const;

export function resolvePhiCmsErrorPagePath(code: PhiCmsErrorCode) {
  return `/error/${code}`;
}

export function parsePhiCmsErrorCode(value: string | number | null | undefined): PhiCmsErrorCode | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  return parsed === 401 || parsed === 403 || parsed === 404 || parsed === 500 ? parsed : null;
}

export async function buildPhiDefaultPubErrorPageTree({
  code,
  page,
}: {
  code: PhiCmsErrorCode;
  page: PhiCmsPageNode;
}): Promise<PhiResolvedCmsPageTree> {
  const copy = ERROR_SOURCE_COPY[code];
  const presetKey = `pub-error-${code}-page`;
  const layoutContentId = createPhiPresetCmsInstanceId({
      domain: "page",
      ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey,
    nodeKey: "layoutContent",
  });
  const widgetResultId = createPhiPresetCmsInstanceId({
      domain: "page",
      ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    presetKey,
    nodeKey: "widgetResult",
  });

  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Standard,
      status: PhiCmsStatus.Published,
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_ERROR_REGION_IDS.regionContent - code,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: layoutContentId,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 30,
        config: {
          maxSize: { width: 960 },
          margin: "0 auto",
        },
      },
    ],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        typeKey: "content",
        id: layoutContentId,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "content", preset: "panel" },
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: `pub error ${code} page`,
        config: {
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          anchor: "center",
        },
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        typeKey: "result",
        id: widgetResultId,
        siteId: page.siteId,
        parentLayoutNodeId: layoutContentId,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: `pub error ${code} result widget`,
        config: {
          status: ERROR_STATUS[code],
          code: String(code),
          title: copy.title,
          subTitle: copy.subTitle,
        },
        contentId: null,
      }),
    ],
  };
}
