import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/public/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import { createPhiSignalAddress } from "../../../types/signals";
import { localizeAreaPath } from "../../../helpers/locale";
import { resolvePhiShellHeaderHeight } from "../../../helpers/shell-region-style";
import { createPhiCoreRuntimeControllerAddress } from "../../runtime/core-runtime-controller-address";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";

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
  regionHeaderBottom: -301,
  regionContent: -300,
} as const;

const SYNTHETIC_WELCOME_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-welcome-page",
}, [
  "layoutHeaderBottom",
  "layoutContent",
  "layoutContentStack",
]);

const SYNTHETIC_WELCOME_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "page",
  ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  presetKey: "pub-welcome-page",
}, [
  "widgetThemeModeSwitch",
  "widgetGreeting",
  "widgetMarkdown",
  "widgetReadMore",
]);

/**
 * The Public front door every Site has, and the one a Module's landing covers (MODULES.md, "Who owns an
 * address").
 *
 * An Area root is drawn without the Shell around it, and that is the whole point of a landing page:
 * the fonts and the root CSS arrive, nothing of the Area chrome does. So this tree brings the little
 * frame it wants itself -- a bar with the light and dark switch and a greeting -- and a Content Region
 * whose copy leads on to the home page that does wear the Shell.
 */
export async function buildPhiDefaultPubWelcomePageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
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
        id: SYNTHETIC_WELCOME_REGION_IDS.regionHeaderBottom,
        pageId: page.id,
        areaPresetId: null,
        regionType: PhiCmsRegionType.HeaderBottom,
        rootLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutHeaderBottom,
        status: PhiCmsStatus.Published,
        flags: 0,
        visibilityMask: page.visibilityMask,
        sortOrder: 25,
        config: {
          size: { height: `${resolvePhiShellHeaderHeight(runtime.site.theme?.shell, "bottom")}px` },
        },
      },
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
        creationPreset: { layoutKind: "threecol", preset: "panel" },
        typeKey: "three-column",
        id: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutHeaderBottom,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "pub welcome header bottom",
        config: {
          balancedSides: true,
          contentAlign: "center",
          style: { height: "100%" },
        },
      }),
      nodes.layout({
        typeKey: "content",
        id: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutContent,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "pub welcome page",
        config: {},
      }),
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutContentStack,
        parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutContent,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "pub welcome copy and way on",
        config: { anchor: { horizontal: "center", vertical: "middle" } },
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "switch",
        id: SYNTHETIC_WELCOME_WIDGET_IDS.widgetThemeModeSwitch,
        parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutHeaderBottom,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
        sortOrder: 0,
        label: "pub welcome theme mode switch",
        config: {
          defaultChecked: runtime.viewer.themeMode === "dark",
          checkedChildren: "Dark",
          unCheckedChildren: "Light",
          key: "themeMode",
          signalRoutes: {
            emits: [
              {
                routeKey: "pub-welcome-theme-mode-change",
                capabilityId: "change",
                scope: "site",
                channel: "themeMode",
                action: "change",
                valueType: "boolean",
                receiver: createPhiCoreRuntimeControllerAddress(),
              },
            ],
            listens: [
              {
                routeKey: "pub-welcome-theme-mode-follow",
                capabilityId: "themeMode",
                scope: "page",
                channel: "themeMode",
                action: "change",
                valueType: "boolean",
                receiver: createPhiSignalAddress("cms", SYNTHETIC_WELCOME_WIDGET_IDS.widgetThemeModeSwitch),
              },
            ],
          },
        },
      }),
      nodes.widget({
        typeKey: "simple-text",
        id: SYNTHETIC_WELCOME_WIDGET_IDS.widgetGreeting,
        parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutHeaderBottom,
        slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
        sortOrder: 0,
        label: "pub welcome greeting",
        // English source, like every Preset sentence: the Site translator makes it "Herzlich willkommen".
        config: { text: "A warm welcome" },
      }),
      nodes.widget({
        typeKey: "markdown",
        id: SYNTHETIC_WELCOME_WIDGET_IDS.widgetMarkdown,
        parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutContentStack,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[0].slotIndex,
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
        parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutContentStack,
        slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
        sortOrder: 0,
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
