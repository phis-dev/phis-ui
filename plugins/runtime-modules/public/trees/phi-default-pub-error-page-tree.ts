import { createPhiPresetCmsInstanceId } from "../../../../types/cms-instance-id";
import { PHI_TEXT_SOURCE_PRESET } from "../../../../helpers/text-source";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../../constants/cms-layout-types";
import { PhiCmsPageType } from "../../../../constants/phi-cms";
import {
  buildPhiBasePageContentScaffold,
  PHI_BASE_PAGE_LAYOUT_NODE_ID,
} from "../../../../components/regions/presets/phi-base-page-layout";
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
 * It goes into the widget config untranslated and marked `textSource: "preset"`: these are the
 * platform's words, the same on every Site, so the `result` widget translates them through the global
 * store (`helpers/text-source.ts`). Pre-translating here would freeze one locale into every Site that
 * adopts the page. An author who rewrites a text in the Builder drops the marker, and from then on the
 * words are the Site's and its own store translates them.
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
  const scaffold = buildPhiBasePageContentScaffold({ page, regionId: SYNTHETIC_ERROR_REGION_IDS.regionContent - code });
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    /*
     * The code is the title, and a code is not words: stated here, it never reaches the translator the
     * route title would otherwise go through. Only the result's title and text are the Site's to word.
     */
    pageMeta: {
      title: { msgId: 0, source: String(code), value: String(code) },
      description: null,
    },
    overlays: [],
    regions: [scaffold.region],
    layoutNodes: [
      // The base scaffold every module Page stands on; the result is centred in the Layout inside it.
      scaffold.layoutNode,
      nodes.layout({
        typeKey: "content",
        id: layoutContentId,
        parentLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
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
          textSource: PHI_TEXT_SOURCE_PRESET,
          status: ERROR_STATUS[code],
          code: String(code),
          title: copy.title,
          subTitle: copy.subTitle,
          /*
           * Every error page offers a way out: it draws no Shell, so there is nothing else to press. A
           * missing page goes to the root of its own Area, which the visitor may open. A refusal goes to
           * the Site's public home instead -- the Area's root is the same door that just refused them.
           */
          homeLink: true,
          homeLinkTarget: code === 404 ? "area" : "site",
        },
      }),
    ],
  };
}
