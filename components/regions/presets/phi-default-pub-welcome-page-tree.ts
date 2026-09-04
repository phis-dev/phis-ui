import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/public/ids";
import {
  PHI_CMS_DEFAULT_SLOT_INDEX,
  PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS,
  PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX,
} from "../../../constants/cms-layout-types";
import { PhiCmsFlags, PhiCmsPageType, PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { PHI_TR_CTX_WEB_UI_LABEL } from "../../../gateway/tr";
import { buildPhiCmsLayoutNode, buildPhiCmsWidgetNode } from "../../../helpers/cms-node-factories";
import { resolvePhiBrandContact } from "../../../helpers/brand-contact";
import { resolvePhiBrandWordmarkText } from "../../../helpers/brand-wordmark";
import { resolvePhiLayoutCreationPreset } from "../../../helpers/cms-layout-defaults";
import { trGlobal } from "../../../server-helpers/translate";
import { PHI_PADDING } from "../../../theme/phi-tokens";
import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";

const SYNTHETIC_WELCOME_REGION_IDS = {
  regionHeaderBottom: -298,
  regionContent: -300,
  regionFooterTop: -302,
} as const;

const NODE_KEYS = [
  "layoutHeaderBottom",
  "layoutHeaderActions",
  "layoutContent",
  "layoutFooterTop",
] as const;

const WIDGET_KEYS = [
  "widgetBrand",
  "widgetNav",
  "widgetLocale",
  "widgetMarkdown",
  "widgetFooterBrand",
  "widgetFooterLinks",
  "widgetFooterContact",
] as const;

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
 * The Public front door, and the one page in the installation that is a landing page on purpose.
 *
 * An Area root is drawn without the Shell around it, which is what makes a landing page worth having:
 * the fonts and the root CSS arrive, nothing of the Area chrome does, and the first paint is not
 * waiting on a header the visitor may never use. What that costs is the header itself, so this page
 * carries its own -- a brand, the Public header navigation and the locale switch in `header_bottom`,
 * and the quick links and contact in `footer_top`, both of them Page-owned regions.
 *
 * `includeLandingChrome` is false wherever this tree is reused inside a Shell -- the App Area's Home
 * page is the case -- because there the header above it is already drawn and a second one would only
 * repeat it.
 */
export async function buildPhiDefaultPubWelcomePageTree({
  page,
  runtime,
  includeLandingChrome = false,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
  includeLandingChrome?: boolean;
}): Promise<PhiResolvedCmsPageTree> {
  const brandWordmarkText = resolvePhiBrandWordmarkText(runtime);
  const contact = resolvePhiBrandContact(runtime);
  const quickLinksTitle = includeLandingChrome
    ? await trGlobal("Quick Links", 0, PHI_TR_CTX_WEB_UI_LABEL)
    : "";

  return {
    page: {
      ...page,
      pageType: PhiCmsPageType.Landing,
      status: PhiCmsStatus.Published,
    },
    overlays: [],
    regions: [
      ...(includeLandingChrome
        ? [{
            id: SYNTHETIC_WELCOME_REGION_IDS.regionHeaderBottom,
            pageId: page.id,
            areaPresetId: null,
            regionType: PhiCmsRegionType.HeaderBottom,
            rootLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutHeaderBottom,
            status: PhiCmsStatus.Published,
            flags: 0,
            visibilityMask: page.visibilityMask,
            sortOrder: 0,
            config: {
              mode: runtime.site.theme?.mode ?? "light",
              sticky: true,
              effect: "glass",
              shadow: "none",
              border: false,
              size: { height: "55px" },
              offsetTop: 0,
            },
          }]
        : []),
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
      ...(includeLandingChrome
        ? [{
            id: SYNTHETIC_WELCOME_REGION_IDS.regionFooterTop,
            pageId: page.id,
            areaPresetId: null,
            regionType: PhiCmsRegionType.FooterTop,
            rootLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutFooterTop,
            status: PhiCmsStatus.Published,
            flags: 0,
            visibilityMask: page.visibilityMask,
            sortOrder: 40,
            config: {
              mode: runtime.site.theme?.mode ?? "light",
              shadow: "none",
              border: false,
            },
          }]
        : []),
    ],
    layoutNodes: [
      ...(includeLandingChrome
        ? [
            buildPhiCmsLayoutNode({
              typeKey: "three-column",
              id: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutHeaderBottom,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub welcome header",
              config: {
                ...resolvePhiLayoutCreationPreset("threecol", "panel"),
                balancedSides: false,
                justify: "space-between",
                contentAlign: "center",
              },
            }),
            buildPhiCmsLayoutNode({
              typeKey: "flex",
              id: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutHeaderActions,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutHeaderBottom,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
              sortOrder: 20,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub welcome header actions",
              config: {
                ...resolvePhiLayoutCreationPreset("flex", "panel"),
                anchor: { horizontal: "right", vertical: "middle" },
                verticalSeparators: false,
                wrap: false,
                paddingLeft: 0,
                paddingRight: 0,
              },
            }),
          ]
        : []),
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
      ...(includeLandingChrome
        ? [
            buildPhiCmsLayoutNode({
              typeKey: "three-column",
              id: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutFooterTop,
              siteId: page.siteId,
              parentLayoutNodeId: null,
              slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
              sortOrder: 40,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub welcome footer",
              config: {
                ...resolvePhiLayoutCreationPreset("threecol", "panel"),
                balancedSides: true,
                align: "stretch",
                justify: "space-between",
                paddingTop: PHI_PADDING.base,
                paddingBottom: PHI_PADDING.base,
                style: { minHeight: "96px" },
              },
            }),
          ]
        : []),
    ],
    contentWidgets: [
      ...(includeLandingChrome
        ? [
            buildPhiCmsWidgetNode({
              typeKey: "brand",
              id: SYNTHETIC_WELCOME_WIDGET_IDS.widgetBrand,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutHeaderBottom,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub welcome header brand",
              config: {
                fallbackTitle: brandWordmarkText,
                logoYOffset: -4,
              },
            }),
            buildPhiCmsWidgetNode({
              typeKey: "header-navigation",
              id: SYNTHETIC_WELCOME_WIDGET_IDS.widgetNav,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutHeaderBottom,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
              sortOrder: 10,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub welcome header navigation",
              config: { navKey: "public:header" },
            }),
            buildPhiCmsWidgetNode({
              typeKey: "locale",
              id: SYNTHETIC_WELCOME_WIDGET_IDS.widgetLocale,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutHeaderActions,
              slotIndex: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[1].slotIndex,
              sortOrder: 10,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub welcome header locale",
              config: {},
            }),
          ]
        : []),
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
      ...(includeLandingChrome
        ? [
            buildPhiCmsWidgetNode({
              typeKey: "brand",
              id: SYNTHETIC_WELCOME_WIDGET_IDS.widgetFooterBrand,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutFooterTop,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Left,
              sortOrder: 0,
              status: PhiCmsStatus.Published,
              flags: PhiCmsFlags.NoTranslate,
              visibilityMask: page.visibilityMask,
              label: "pub welcome footer brand",
              config: {
                fallbackTitle: brandWordmarkText,
                showLogo: false,
              },
            }),
            buildPhiCmsWidgetNode({
              typeKey: "quick-links",
              id: SYNTHETIC_WELCOME_WIDGET_IDS.widgetFooterLinks,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutFooterTop,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Middle,
              sortOrder: 10,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub welcome footer quick links",
              config: {
                title: quickLinksTitle,
                navKey: "public:footer",
                columns: 2,
                separator: true,
              },
            }),
            buildPhiCmsWidgetNode({
              typeKey: "simple-text",
              id: SYNTHETIC_WELCOME_WIDGET_IDS.widgetFooterContact,
              siteId: page.siteId,
              parentLayoutNodeId: SYNTHETIC_WELCOME_LAYOUT_IDS.layoutFooterTop,
              slotIndex: PHI_CMS_THREE_COLUMN_LAYOUT_SLOT_INDEX.Right,
              sortOrder: 20,
              status: PhiCmsStatus.Published,
              flags: 0,
              visibilityMask: page.visibilityMask,
              label: "pub welcome footer contact",
              config: {
                text: contact.label,
                href: contact.href,
                icon: contact.icon,
              },
            }),
          ]
        : []),
    ],
  };
}
