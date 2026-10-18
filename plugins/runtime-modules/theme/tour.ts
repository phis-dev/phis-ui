import type { PhiTourDefinition } from "../../../types/tours";
import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";
import { PHI_THEME_PAGE_WIDGET_IDS } from "./page-ids";

/**
 * The Theme workspace's Tour (TODOS.md, "A Tour for the Theme workspace").
 *
 * What the workspace does not say out loud is its first step: a Module's Theme is offered and never
 * taken, so installing a package that ships a look changes nothing until somebody picks it here. The
 * rest is the order a person meets the workspace in.
 */
export const PHI_THEME_WORKSPACE_TOUR = {
  id: `${PHI_THEME_RUNTIME_MODULE_ID}/workspace`,
  version: 1,
  steps: [
    {
      key: "theme-choice",
      target: `cms:${PHI_THEME_PAGE_WIDGET_IDS.widgetBrandContextSelect}`,
      title: "Which theme you are working on",
      description: "The Site's published theme, its draft, or a theme a Module brings. A Module's theme changes nothing until it is picked here.",
      placement: "bottom",
    },
    {
      key: "theme-parts",
      target: `cms:${PHI_THEME_PAGE_WIDGET_IDS.widgetThemeStackSegmented}`,
      title: "Colour and style",
      description: "Switch between the palette and the shapes and type of the theme.",
      placement: "bottom",
    },
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
