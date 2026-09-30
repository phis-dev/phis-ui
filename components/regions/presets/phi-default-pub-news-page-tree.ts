import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_NEWS_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/news/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

const PHI_NEWS_PAGE_PRESET_KEY = "public-news-page";

/**
 * The heading, carried inline for the same reason the other Public presets carry theirs: a Module cannot
 * put a file into the Site's `public/` directory, and the Markdown Widget persists this copy the moment
 * the Site takes the page over in the Builder.
 */
const PHI_DEFAULT_PUB_NEWS_MARKDOWN = "# News\n";

const SYNTHETIC_NEWS_REGION_IDS = {
  regionContent: -320,
} as const;

const SYNTHETIC_NEWS_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_NEWS_PAGE_PRESET_KEY,
}, [
  "layoutContent",
]);

const SYNTHETIC_NEWS_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_NEWS_PAGE_PRESET_KEY,
}, [
  "widgetHeading",
  "widgetNewsList",
]);

/**
 * The News page: a heading and the list, inside the frame every Public page wears.
 *
 * Two Widgets rather than one, because the heading is the Site's to change and the list is not: what the
 * list shows is whatever Core answers. A Site that wants an introduction above its news adds it here in
 * the Builder without touching the part that reads.
 */
export async function buildPhiDefaultPubNewsPageTree({
  page,
}: {
  page: PhiCmsPageNode;
}): Promise<PhiResolvedCmsPageTree> {
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    regions: [
      nodes.region({
        id: SYNTHETIC_NEWS_REGION_IDS.regionContent,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_NEWS_LAYOUT_IDS.layoutContent,
        sortOrder: 30,
      }),
    ],
    layoutNodes: [
      /*
       * A vertical Flex, not the `content` Layout the one-Widget presets use: `content` has a single slot,
       * so a second Widget placed in it is dropped without a word. `flex-vertical` carries a sequence,
       * which is what a heading above a list is.
       */
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: SYNTHETIC_NEWS_LAYOUT_IDS.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        label: "pub news page",
      }),
    ],
    // `stack` rather than two `widget` calls: it counts the slots, so the list sits under the heading
    // rather than in the same one.
    contentWidgets: nodes.stack(SYNTHETIC_NEWS_LAYOUT_IDS.layoutContent, [
      {
        typeKey: "markdown",
        id: SYNTHETIC_NEWS_WIDGET_IDS.widgetHeading,
        label: "pub news heading widget",
        config: {
          sourceMode: "inline",
          markdown: PHI_DEFAULT_PUB_NEWS_MARKDOWN,
          translate: true,
        },
      },
      {
        typeKey: "news-list",
        id: SYNTHETIC_NEWS_WIDGET_IDS.widgetNewsList,
        label: "pub news list widget",
        config: {},
      },
    ]),
  };
}
