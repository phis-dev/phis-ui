import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsAssetFocalRectWidgetConfig } from "../../../../../types/media";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  readPhiSignalRouteSet,
} from "../../../../../types/signals";

export function parsePhiCmsAssetFocalRectWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsAssetFocalRectWidgetConfig {
  return {
    signalRoutes: readPhiSignalRouteSet(config.signalRoutes),
  };
}

export const PHI_ASSET_FOCAL_RECT_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("asset-focal-rect"),
  typeKey: "asset-focal-rect",
  title: "Asset Focal Rectangle",
  description: "Spatial editor for the selected Asset focal rectangle.",
  category: "media",
  iconFamily: "media",
  slotSizePolicy: "fill-inline",
  runtimeSignals: {
    emits: [
      {
        id: "focalRectChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formField,
      },
      { id: "close", action: "close", valueType: "none" },
    ],
    listens: [
      {
        id: "command",
        channel: "focalRectCommand",
        action: "activate",
        valueType: "string",
      },
    ],
  },
  fields: [],
  defaultConfig: {},
  parseConfig: parsePhiCmsAssetFocalRectWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsAssetFocalRectWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
