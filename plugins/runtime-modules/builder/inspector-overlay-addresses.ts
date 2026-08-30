import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/builder/ids";
import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";

export const PHI_BUILDER_INSPECTOR_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap({ domain: "area", ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID, presetKey: "builder-area-preset" }, ["regionInspector", "layoutInspector", "widgetInspector", "effectsEditor", "signalWiring"]);
export const PHI_BUILDER_INSPECTOR_DRAWER_OVERLAY_IDS = [
  PHI_BUILDER_INSPECTOR_OVERLAY_IDS.regionInspector,
  PHI_BUILDER_INSPECTOR_OVERLAY_IDS.layoutInspector,
  PHI_BUILDER_INSPECTOR_OVERLAY_IDS.widgetInspector,
] as const;
export const PHI_BUILDER_INSPECTOR_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({ domain: "area", ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID, presetKey: "builder-area-preset" }, ["regionInspectorHeader", "layoutInspectorHeader", "widgetInspectorHeader", "regionInspectorBody", "layoutInspectorBody", "widgetInspectorBody", "effectsHeader", "effectsBody", "effectsFooter", "signalWiringBody", "signalWiringFooter"]);
export const PHI_BUILDER_INSPECTOR_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({ domain: "area", ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID, presetKey: "builder-area-preset" }, ["regionInspectorHeaderWidget", "layoutInspectorHeaderWidget", "widgetInspectorHeaderWidget", "effectsTabs", "effectsAppearanceForm", "effectsTransitionsForm", "effectsViewportForm", "effectsCommands", "signalWiringForm", "signalWiringRoutes", "signalWiringCommands"]);

export const PHI_BUILDER_EFFECTS_FORM_WIDGET_IDS = {
  appearance: PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsAppearanceForm,
  transitions: PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsTransitionsForm,
  viewport: PHI_BUILDER_INSPECTOR_WIDGET_IDS.effectsViewportForm,
} as const;
export const PHI_BUILDER_INSPECTOR_SECTION_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(
  { domain: "area", ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID, presetKey: "builder-area-preset" },
  [
    "regionGeometry", "regionViewport", "regionPadding", "regionBackground", "regionBorder", "regionShadow",
    "layoutSettings", "layoutAnchor", "layoutViewport", "layoutBackground", "layoutBorder", "layoutShadow", "layoutChrome", "layoutSignals",
    "widgetSettings", "widgetGeometry", "widgetViewport", "widgetSignals",
  ],
);
