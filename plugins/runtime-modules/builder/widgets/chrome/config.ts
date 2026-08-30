import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS, readPhiSignalRouteSet, type PhiSignalRouteSet } from "../../../../../types/signals";

export type PhiBuilderChromeWidgetConfig = {
  signalRoutes?: PhiSignalRouteSet;
};

function parseBuilderChromeWidgetConfig(config: Record<string, unknown>): PhiBuilderChromeWidgetConfig {
  return { signalRoutes: readPhiSignalRouteSet(config.signalRoutes) ?? undefined };
}

type PhiBuilderChromeWidgetDefinition = Pick<
  PhiCmsWidgetPlugin<PhiBuilderChromeWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "runtimeSignals"
  | "slotSizePolicy"
  | "fields"
  | "parseConfig"
>;

function createBuilderChromeWidgetDefinition(options: {
  typeKey: string;
  title: string;
  description: string;
  runtimeSignals?: PhiBuilderChromeWidgetDefinition["runtimeSignals"];
  slotSizePolicy?: PhiBuilderChromeWidgetDefinition["slotSizePolicy"];
}): PhiBuilderChromeWidgetDefinition {
  return {
    kind: "widget",
    pluginKey: resolvePhiCmsWidgetPluginKey(options.typeKey),
    typeKey: options.typeKey,
    title: options.title,
    description: options.description,
    category: "workspace",
    iconFamily: "builder",
    runtimeSignals: options.runtimeSignals,
    slotSizePolicy: options.slotSizePolicy,
    fields: [],
    parseConfig: parseBuilderChromeWidgetConfig,
  };
}

export const PHI_BUILDER_MODE_SWITCH_WIDGET_DEFINITION = createBuilderChromeWidgetDefinition({
  typeKey: "builder-mode-switch",
  title: "Builder Mode Switch",
  description: "Editor and preview switch for Builder workspaces.",
});

export const PHI_BUILDER_INSPECTOR_HEADER_WIDGET_DEFINITION = createBuilderChromeWidgetDefinition({
  typeKey: "builder-inspector-header",
  title: "Builder Inspector Header",
  description: "Dynamic node kind and type heading for Builder inspector overlays.",
});

export type PhiBuilderInspectorSectionWidgetSpec = {
  typeKey: string;
  view: "region" | "layout" | "widget";
  section: string;
  title: string;
};

export const PHI_BUILDER_INSPECTOR_SECTION_WIDGET_SPECS = [
  { typeKey: "builder-region-geometry-inspector", view: "region", section: "geometry", title: "Region Geometry" },
  { typeKey: "builder-region-viewport-inspector", view: "region", section: "viewport", title: "Region Viewport" },
  { typeKey: "builder-region-padding-inspector", view: "region", section: "padding", title: "Region Padding" },
  { typeKey: "builder-region-background-inspector", view: "region", section: "background", title: "Region Background" },
  { typeKey: "builder-region-border-inspector", view: "region", section: "border", title: "Region Border" },
  { typeKey: "builder-region-shadow-inspector", view: "region", section: "shadow", title: "Region Shadow" },
  { typeKey: "builder-layout-settings-inspector", view: "layout", section: "settings", title: "Layout Settings" },
  { typeKey: "builder-layout-anchor-inspector", view: "layout", section: "anchor", title: "Layout Anchor" },
  { typeKey: "builder-layout-viewport-inspector", view: "layout", section: "viewport", title: "Layout Viewport" },
  { typeKey: "builder-layout-background-inspector", view: "layout", section: "background", title: "Layout Background" },
  { typeKey: "builder-layout-border-inspector", view: "layout", section: "border", title: "Layout Border" },
  { typeKey: "builder-layout-shadow-inspector", view: "layout", section: "shadow", title: "Layout Shadow" },
  { typeKey: "builder-layout-fields-inspector", view: "layout", section: "chrome", title: "Layout Fields" },
  { typeKey: "builder-layout-signals-inspector", view: "layout", section: "signals", title: "Layout Signals" },
  { typeKey: "builder-widget-settings-inspector", view: "widget", section: "settings", title: "Widget Settings" },
  { typeKey: "builder-widget-geometry-inspector", view: "widget", section: "geometry", title: "Widget Geometry" },
  { typeKey: "builder-widget-viewport-inspector", view: "widget", section: "viewport", title: "Widget Viewport" },
  { typeKey: "builder-widget-signals-inspector", view: "widget", section: "signals", title: "Widget Signals" },
] as const satisfies readonly PhiBuilderInspectorSectionWidgetSpec[];

export const PHI_BUILDER_INSPECTOR_SECTION_WIDGET_DEFINITIONS =
  PHI_BUILDER_INSPECTOR_SECTION_WIDGET_SPECS.map((spec) => ({
    spec,
    definition: createBuilderChromeWidgetDefinition({
      typeKey: spec.typeKey,
      title: `${spec.title} Inspector`,
      description: `Builder Inspector section for ${spec.title.toLowerCase()} settings.`,
      slotSizePolicy: "fill-inline",
      runtimeSignals: {
        emits: [{
          id: "change",
          action: "change",
          valueType: "json",
          valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.builderInspector,
        }],
      },
    }),
  }));

export const PHI_DEVELOPER_BUILDER_DRAFT_STATUS_WIDGET_DEFINITION = createBuilderChromeWidgetDefinition({
  typeKey: "builder-draft-status",
  title: "Builder Draft Status",
  description: "Builder header status showing whether the current scope is draft or published.",
});
