import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../../ids";
import { readPhiSignalRouteSet, type PhiSignalRouteSet } from "../../../../../types/signals";
import type { PhiCmsWidgetConfigBase } from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsAssetInspectorWidgetConfig = PhiCmsWidgetConfigBase & {
  section: "preview" | "technical";
  signalRoutes?: PhiSignalRouteSet | null;
};

export function normalizePhiCmsAssetInspectorWidgetConfig(config: unknown): PhiCmsAssetInspectorWidgetConfig {
  const record = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {};
  return {
    section: record.section === "technical" ? "technical" : "preview",
    signalRoutes: readPhiSignalRouteSet(record.signalRoutes),
  };
}

export function parsePhiCmsAssetInspectorWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsAssetInspectorWidgetConfig {
  return normalizePhiCmsAssetInspectorWidgetConfig(config);
}

export const PHI_IMAGE_INSPECTOR_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("image-inspector"),
  typeKey: "image-inspector",
  title: "Asset Inspector",
  description: "Drawer inspector for the selected asset.",
  category: "media",
  iconFamily: "content",
  slotSizePolicy: "fill-inline",
  requiredDataProviders: [PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaCollection],
  runtimeSignals: {
    emits: [{
      id: "focalRectOpen",
      action: "open",
      valueType: "none",
    }],
    listens: [],
  },
  fields: [{ key: "section", type: "choice", label: "Section", options: [
    { value: "preview", label: "Preview" },
    { value: "technical", label: "Technical details" },
  ] }],
  defaultConfig: { section: "preview" },
  parseConfig: parsePhiCmsAssetInspectorWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsAssetInspectorWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "requiredDataProviders"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_IMAGE_INSPECTOR_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.ImageInspector;
