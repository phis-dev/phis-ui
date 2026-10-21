import { PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS } from "../../../constants/cms-layout-types";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiTourDefinition, PhiTourStepDefinition, PhiTourStepSignal } from "../../../types/tours";
import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";
import { PHI_THEME_PAGE_LAYOUT_IDS, PHI_THEME_PAGE_WIDGET_IDS } from "./page-ids";

/** Turns the workspace's Stack to one of its four panels, as the Segmented above it does. */
function showPanel(slot: number): PhiTourStepSignal {
  return {
    receiver: `cms:${PHI_THEME_PAGE_LAYOUT_IDS.layoutBrandStack}`,
    channel: "activeSlotKey",
    action: "change",
    valueType: "string",
    value: PHI_CMS_SEQUENTIAL_LAYOUT_SLOTS[slot]!.key,
  };
}

/**
 * One panel of the workspace, pointed at by its controls. The step turns the Stack to the panel and back
 * to Color when it is left, the panel the workspace opens with; from one panel step to the next both
 * arrive together, so the Stack simply moves on.
 */
function panelStep(key: string, slot: number, controls: PhiCmsInstanceId, title: string, description: string) {
  return {
    key,
    target: `cms:${controls}`,
    title,
    description,
    placement: "right",
    prepare: [showPanel(slot)],
    release: [showPanel(0)],
  } as const satisfies PhiTourStepDefinition;
}

/**
 * The Theme workspace's Tour (TODOS.md, "A Tour for the Theme workspace").
 *
 * What the workspace does not say out loud is its first step: the selector picks what a draft starts
 * from. A Module's Theme is a base to start from, never edited through it, and installing a package
 * that ships a look changes nothing for the Site. The rest is the order a person meets the workspace in.
 */
export const PHI_THEME_WORKSPACE_TOUR = {
  id: `${PHI_THEME_RUNTIME_MODULE_ID}/workspace`,
  version: 1,
  steps: [
    {
      key: "theme-choice",
      target: `cms:${PHI_THEME_PAGE_WIDGET_IDS.widgetBrandContextSelect}`,
      title: "What your draft starts from",
      description: "The Site's published theme, its draft, or a theme a Module brings. Picking one makes it the base of your theme draft; the Module's theme itself stays as it is.",
      placement: "bottom",
    },
    {
      key: "theme-parts",
      target: `cms:${PHI_THEME_PAGE_WIDGET_IDS.widgetThemeStackSegmented}`,
      title: "Four parts of the theme",
      description: "Colour, style, background and brand: each opens its own controls on the left, with the preview beside them.",
      placement: "bottom",
    },
    panelStep(
      "color",
      0,
      PHI_THEME_PAGE_WIDGET_IDS.widgetBrandThemeControls,
      "Colour from a few seeds",
      "A palette is picked whole, or each colour is set on its own. Every colour is a seed: Primary, Info, Success, Warning, Error, Link, the text and the background each grow into the shades for hover, borders and backgrounds, and Custom grows into ten steps of its own.",
    ),
    panelStep(
      "style",
      1,
      PHI_THEME_PAGE_WIDGET_IDS.widgetBrandStyleControls,
      "Buttons and corners",
      "A shape sets the corners at once -- square, subtle, rounded or pill -- for buttons and fields alike. Below it the details: the buttons' shadows, the corner radius in three sizes, how tall controls are, and the fonts and their size.",
    ),
    panelStep(
      "background",
      2,
      PHI_THEME_PAGE_WIDGET_IDS.widgetBrandBackgroundControls,
      "Behind everything",
      "The root background is one layer behind the whole Site: a colour, a gradient or an image, still or in parallax, with an overlay of colour, pattern or noise on top. The chrome overlay is a second ground the header, the sider and the footer share, and the chrome shadow sets how they cast onto the Page. Each is set for light and dark.",
    ),
    panelStep(
      "brand",
      3,
      PHI_THEME_PAGE_WIDGET_IDS.widgetBrandIdentityControls,
      "The Site's own marks",
      "The logo, one per mode, and where a click on it leads; the wordmark, the Site's name in type; and the two short lines the Brand shows beside them.",
    ),
    {
      key: "preview-mode",
      target: `cms:${PHI_THEME_PAGE_WIDGET_IDS.widgetBrandPreviewModeSwitch}`,
      title: "Light and dark",
      description: "See the theme in either mode. This switches the preview, not the Site.",
      placement: "bottom",
    },
    {
      key: "draft-status",
      target: `cms:${PHI_THEME_PAGE_WIDGET_IDS.widgetDraftStatus}`,
      title: "Where your changes stand",
      description: "What you change here is a draft. The Site keeps its published theme until the draft is published.",
      placement: "bottom",
    },
  ],
} as const satisfies PhiTourDefinition;
