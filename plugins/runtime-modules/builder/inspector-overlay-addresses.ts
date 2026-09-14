import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/builder/ids";
import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";

/**
 * The preset these addresses belong to, which is the Builder's Overlay contribution and not its Area
 * shell. The shell is a starting point an operator may save over; these Overlays are the tool doing
 * the saving, so they are contributed to the Area rather than declared in the tree it replaces.
 */
export const PHI_BUILDER_INSPECTOR_OVERLAY_PRESET_KEY = "builder-inspector-overlay-preset";

const PHI_BUILDER_INSPECTOR_PRESET_IDENTITY = {
  domain: "area",
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: PHI_BUILDER_INSPECTOR_OVERLAY_PRESET_KEY,
} as const;

export const PHI_BUILDER_INSPECTOR_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(PHI_BUILDER_INSPECTOR_PRESET_IDENTITY, ["regionInspector", "layoutInspector", "widgetInspector", "effectsEditor", "signalWiring"]);
export const PHI_BUILDER_INSPECTOR_DRAWER_OVERLAY_IDS = [
  PHI_BUILDER_INSPECTOR_OVERLAY_IDS.regionInspector,
  PHI_BUILDER_INSPECTOR_OVERLAY_IDS.layoutInspector,
  PHI_BUILDER_INSPECTOR_OVERLAY_IDS.widgetInspector,
] as const;
export const PHI_BUILDER_INSPECTOR_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(PHI_BUILDER_INSPECTOR_PRESET_IDENTITY, ["regionInspectorHeader", "layoutInspectorHeader", "widgetInspectorHeader", "regionInspectorBody", "layoutInspectorBody", "widgetInspectorBody", "effectsHeader", "effectsBody", "effectsFooter", "signalWiringBody", "signalWiringFooter"]);
export const PHI_BUILDER_INSPECTOR_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(PHI_BUILDER_INSPECTOR_PRESET_IDENTITY, ["regionInspectorHeaderWidget", "layoutInspectorHeaderWidget", "widgetInspectorHeaderWidget", "effectsTabs", "effectsAppearanceForm", "effectsTransitionsForm", "effectsViewportForm", "effectsCommands", "signalWiringForm", "signalWiringRoutes", "signalWiringCommands"]);

export const PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS = {
  appearance: PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsAppearanceForm,
  transitions: PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsTransitionsForm,
  viewport: PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsViewportForm,
} as const;
export const PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(
  PHI_BUILDER_INSPECTOR_PRESET_IDENTITY,
  [
    "regionGeometry", "regionViewport", "regionPadding", "regionBackground", "regionBorder", "regionShadow",
    "layoutSettings", "layoutAnchor", "layoutViewport", "layoutBackground", "layoutBorder", "layoutShadow", "layoutSignals",
    "widgetSettings", "widgetGeometry", "widgetViewport", "widgetSignals",
    "layoutPadding",
  ],
);
