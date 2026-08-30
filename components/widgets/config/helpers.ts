import { resolvePhiCmsWidgetPluginKey } from "../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../types";

export function parsePhiEmptyWidgetConfig(): Record<string, never> {
  return {};
}

export type PhiCmsPaddingOnlyWidgetConfig = {
  padding?: number | string;
};

export function parsePhiPaddingOnlyWidgetConfig(
  rawConfig: Record<string, unknown> | null | undefined,
): PhiCmsPaddingOnlyWidgetConfig {
  const raw = rawConfig ?? {};
  const padding = raw.padding;

  return {
    padding: typeof padding === "number" || typeof padding === "string" ? padding : undefined,
  };
}

export type PhiWidgetDefinitionBase<TConfig> = Pick<
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
  | "defaultConfig"
  | "parseConfig"
>;

export function createPhiCmsWidgetDefinition<TConfig>(options: {
  typeKey: string;
  title: string;
  description: string;
  category?: PhiWidgetDefinitionBase<TConfig>["category"];
  iconFamily?: PhiWidgetDefinitionBase<TConfig>["iconFamily"];
  runtimeSignals?: PhiWidgetDefinitionBase<TConfig>["runtimeSignals"];
  slotSizePolicy?: PhiWidgetDefinitionBase<TConfig>["slotSizePolicy"];
  fields?: PhiWidgetDefinitionBase<TConfig>["fields"];
  defaultConfig?: TConfig;
  parseConfig: (raw: Record<string, unknown>) => TConfig;
}): PhiWidgetDefinitionBase<TConfig> {
  return {
    kind: "widget",
    pluginKey: resolvePhiCmsWidgetPluginKey(options.typeKey),
    typeKey: options.typeKey,
    title: options.title,
    description: options.description,
    category: options.category ?? "content",
    iconFamily: options.iconFamily ?? "content",
    runtimeSignals: options.runtimeSignals,
    slotSizePolicy: options.slotSizePolicy,
    fields: options.fields ?? [],
    defaultConfig: options.defaultConfig,
    parseConfig: options.parseConfig,
  };
}
