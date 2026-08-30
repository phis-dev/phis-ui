import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";

export type PhiBuilderWorkspaceWidgetConfig = Record<string, never>;

function parseBuilderWorkspaceWidgetConfig(): PhiBuilderWorkspaceWidgetConfig {
  return {};
}


type PhiBuilderWorkspaceWidgetDefinition<TConfig> = Pick<
  PhiCmsWidgetPlugin<TConfig>,
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

function createBuilderWorkspaceWidgetDefinition<TConfig>(options: {
  typeKey: string;
  title: string;
  description: string;
  parseConfig: (raw: Record<string, unknown>) => TConfig;
  fields?: PhiBuilderWorkspaceWidgetDefinition<TConfig>["fields"];
  runtimeSignals?: PhiBuilderWorkspaceWidgetDefinition<TConfig>["runtimeSignals"];
  slotSizePolicy?: PhiBuilderWorkspaceWidgetDefinition<TConfig>["slotSizePolicy"];
}): PhiBuilderWorkspaceWidgetDefinition<TConfig> {
  return {
    kind: "widget",
    pluginKey: resolvePhiCmsWidgetPluginKey(options.typeKey),
    typeKey: options.typeKey,
    title: options.title,
    description: options.description,
    category: "workspace",
    iconFamily: "builder",
    runtimeSignals: options.runtimeSignals,
    slotSizePolicy: options.slotSizePolicy ?? "fill",
    fields: options.fields ?? [],
    parseConfig: options.parseConfig,
  };
}

export const PHI_BUILDER_PAGES_WORKSPACE_WIDGET_DEFINITION = createBuilderWorkspaceWidgetDefinition({
  typeKey: "builder-pages-workspace",
  title: "Builder Pages Workspace",
  description: "Page editing workspace for the Builder Area.",
  parseConfig: parseBuilderWorkspaceWidgetConfig,
});

export const PHI_BUILDER_SHELLS_WORKSPACE_WIDGET_DEFINITION = createBuilderWorkspaceWidgetDefinition({
  typeKey: "builder-shells-workspace",
  title: "Builder Shells Workspace",
  description: "Shell editing workspace for the Builder Area.",
  parseConfig: parseBuilderWorkspaceWidgetConfig,
});
