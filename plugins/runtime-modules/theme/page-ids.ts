import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";
import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";

const PHI_THEME_PAGE_ID_CONTEXT = {
  domain: "area" as const,
  ownerModuleId: PHI_THEME_RUNTIME_MODULE_ID,
  presetKey: "builder-theme-page",
};

/** The Theme page's frame and the Stack its four panels take turns in. */
export const PHI_THEME_PAGE_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(PHI_THEME_PAGE_ID_CONTEXT, [
  "layoutHeaderBottom",
  "layoutContent",
  "layoutBrandControlsHeader",
  "layoutBrandStack",
  "layoutBrandCardsRow",
  "layoutBrandStylePanel",
  "layoutBrandBackgroundPanel",
  "layoutBrandIdentityPanel",
]);

/*
 * The command toolbar is not listed: its id is `createPhiCommandToolbarId`, the one derivation the Theme
 * Controller addresses its undo and redo through as well.
 */
export const PHI_THEME_PAGE_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(PHI_THEME_PAGE_ID_CONTEXT, [
  "widgetDraftStatus",
  "widgetBrandContextSelect",
  "widgetBrandPreviewModeSwitch",
  "widgetThemeStackSegmented",
  "widgetBrandThemeControls",
  "widgetBrandThemePreview",
  "widgetBrandStyleControls",
  "widgetBrandStylePreview",
  "widgetBrandBackgroundControls",
  "widgetBrandBackgroundPreview",
  "widgetBrandIdentityControls",
  "widgetBrandIdentityPreview",
]);
