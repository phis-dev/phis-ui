import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/public/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import { localizeAreaPath } from "../../../helpers/locale";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

/**
 * Placeholder copy, carried inline for the reason the terms are: a Module cannot put a file into the
 * Site's `public/` directory, and the Markdown Widget persists inline copy the moment the Site takes the
 * page over.
 */
const PHI_DEFAULT_PUB_WELCOME_MARKDOWN = `# Welcome

This Site runs on phis.

This page is the front door every Site starts with. It stands at the root until a Module offers a
landing of its own, or until the Site takes this page over in the Builder and makes it its own.
`;

const SYNTHETIC_WELCOME_REGION_IDS = {
  regionContent: -300,
} as const;

const SYNTHETIC_WELCOME_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-welcome-page",
}, [
  "layoutContent",
]);

const SYNTHETIC_WELCOME_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-welcome-page",
}, [
  "widgetMarkdown",
  "widgetReadMore",
]);

/**
 * The Public front door every Site has, and the one a Module's landing covers (MODULES.md, "Who owns an
 * address").
 *
 * An Area root is drawn without the Shell around it, and that is the whole point of a landing page:
 * the fonts and the root CSS arrive, nothing of the Area chrome does. So this tree is its Content Region
 * and nothing else -- with one way on, to the home page that does wear the Shell.
 */
export async function buildPhiDefaultPubWelcomePageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: {
    locale: { current: string };
  };
}): Promise<PhiResolvedCmsPageTree> {
  const nodes = createPhiCmsPresetNodes(page);
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
        config: {},
      },
    ],
    layoutNodes: [
      nodes.layout({
        typeKey: "content",
        id: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "pub welcome page",
        config: {},
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "markdown",
        id: SYNTHETIC_WELCOME_WIDGET_IDS.widgetMarkdown,
        parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "pub welcome markdown widget",
        config: {
          sourceMode: "inline",
          markdown: PHI_DEFAULT_PUB_WELCOME_MARKDOWN,
          translate: true,
        },
      }),
      nodes.widget({
        typeKey: "button",
        id: SYNTHETIC_WELCOME_WIDGET_IDS.widgetReadMore,
        parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 1,
        label: "pub welcome read more button",
        config: {
          key: "read-more",
          label: "Read more...",
          buttonType: "primary",
          /* A link, not a command: it renders a real anchor, which works before hydration. */
          href: localizeAreaPath(runtime.locale.current, "public", "/home"),
        },
      }),
    ],
  };
}
