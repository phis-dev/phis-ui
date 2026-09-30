import { createPhiPresetCmsInstanceId } from "../../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType } from "../../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiCmsErrorCode } from "../../../../constants/cms-error-pages";

const ERROR_STATUS: Record<PhiCmsErrorCode, "403" | "404"> = {
  401: "403",
  403: "403",
  404: "404",
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
 * they are translated globally in the preset and set the node's `NoTranslate` flag.
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
};

const SYNTHETIC_ERROR_REGION_IDS = {
  regionContent: -700,
} as const;

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

  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    regions: [
      nodes.region({
        id: SYNTHETIC_ERROR_REGION_IDS.regionContent - code,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: layoutContentId,
        sortOrder: 30,
      }),
    ],
    layoutNodes: [
      nodes.layout({
        typeKey: "content",
        id: layoutContentId,
        parentLayoutNodeId: null,
        creationPreset: { layoutKind: "content", preset: "panel" },
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: `pub error ${code} page`,
        config: {
          anchor: "center",
        },
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "result",
        id: widgetResultId,
        parentLayoutNodeId: layoutContentId,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: `pub error ${code} result widget`,
        config: {
          status: ERROR_STATUS[code],
          code: String(code),
          title: copy.title,
          subTitle: copy.subTitle,
          /*
           * Only the 404 offers the way out, and only because only the 404 has one.
           *
           * The link goes to the root of the Area the refusal happened in. For a missing page that is
           * somewhere the visitor may go; for 401 and 403 it is the same door that just refused them.
           */
          homeLink: code === 404,
        },
      }),
    ],
  };
}
