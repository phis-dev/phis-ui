import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/public/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

const SYNTHETIC_WELCOME_REGION_IDS = {
  regionContent: -300,
} as const;

const NODE_KEYS = ["layoutContent"] as const;

const WIDGET_KEYS = ["widgetMarkdown"] as const;

const SYNTHETIC_WELCOME_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-welcome-page",
}, NODE_KEYS);

const SYNTHETIC_WELCOME_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-welcome-page",
}, WIDGET_KEYS);

/**
 * The Public front door: what stands at `/` until the Site has authored something of its own.
 *
 * An Area root is drawn without the Shell around it, and that is the whole point of a landing page:
 * the fonts and the root CSS arrive, nothing of the Area chrome does, and the first paint is not
 * waiting on a header the visitor may never use. So this tree is its Content Region and nothing else.
 *
 * It used to carry a second header and footer of its own -- a brand, the Public header navigation and
 * the locale switch in `header_bottom`, quick links and contact in `footer_top` -- behind an
 * `includeLandingChrome` flag, so that the root would not look barer than the pages around it. The
 * result was a page-owned copy of the Shell that no one could tell apart from the Shell: `/en` drew a
 * header and a footer that the Area root is defined not to draw, and the only way to find out that
 * they were the Page's own was to read this file. A landing that redraws the chrome it exists to omit
 * is not a landing, so the flag is gone rather than defaulted -- there is no caller it was true for
 * except this one, and none that wants it back.
 */
export async function buildPhiDefaultPubWelcomePageTree({
  page,
}: {
  page: PhiCmsPageNode;
}): Promise<PhiResolvedCmsPageTree> {
  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Landing,
      status: PhiCmsStatus.Published,
    },
    overlays: [],
    regions: [
      {
        id: SYNTHETIC_WELCOME_REGION_IDS.regionContent,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutContent,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 30,
        config: {
          maxSize: { width: 1120 },
          margin: "0 auto",
        },
      },
    ],
    layoutNodes: [
      buildPhiCmsLayoutNode({
        typeKey: "content",
        id: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutContent,
        siteId: page.siteId,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub welcome page",
        config: {},
      }),
    ],
    contentWidgets: [
      buildPhiCmsWidgetNode({
        typeKey: "markdown",
        id: SYNTHETIC_WELCOME_WIDGET_IDS.widgetMarkdown,
        siteId: page.siteId,
        parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        label: "pub welcome markdown widget",
        config: {
          sourceUrl: "/welcome.md",
          translate: true,
        },
        contentId: null,
      }),
    ],
  };
}
