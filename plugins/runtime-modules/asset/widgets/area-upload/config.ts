import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../../ids";
import {
  readBoolean,
  readInteger,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsAreaUploadWidgetConfig = PhiCmsWidgetConfigBase & {
  allowDelete?: boolean;
  multiple?: boolean;
  accept?: string;
  folderPath?: string;
  presentationFlags?: number;
};

export function normalizePhiCmsAreaUploadWidgetConfig(config: unknown): PhiCmsAreaUploadWidgetConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {
      allowDelete: true,
      multiple: true,
      accept: "*/*",
      folderPath: undefined,
      presentationFlags: undefined,
    };
  }

  const raw = config as Record<string, unknown>;
  return {
    ...readRenderableBlockConfig(raw),
    allowDelete: readBoolean(raw.allowDelete) ?? true,
    multiple: readBoolean(raw.multiple) ?? true,
    accept: readString(raw.accept) ?? "*/*",
    folderPath: readString(raw.folderPath),
    presentationFlags: readInteger(raw.presentationFlags),
  };
}

export function parsePhiCmsAreaUploadWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsAreaUploadWidgetConfig {
  return normalizePhiCmsAreaUploadWidgetConfig(config);
}

export const PHI_AREA_UPLOAD_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("area-upload"),
  typeKey: "area-upload",
  title: "Area Upload",
  description: "Dropzone and temporary upload wall for area-scoped media assets.",
  category: "media",
  iconFamily: "content",
  slotSizePolicy: "fill-inline",
  requiredDataProviders: [PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaCollection],
  fields: [
    { key: "allowDelete", type: "boolean", label: "Allow Delete" },
    { key: "multiple", type: "boolean", label: "Multiple" },
    { key: "accept", type: "string", label: "Accept" },
    { key: "folderPath", type: "string", label: "Folder Path" },
    { key: "presentationFlags", type: "number", label: "Flags", min: 0, precision: 0 },
  ],
  defaultConfig: {
    allowDelete: true,
    multiple: true,
    accept: "*/*",
    folderPath: "",
    presentationFlags: 0,
  },
  parseConfig: parsePhiCmsAreaUploadWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsAreaUploadWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "requiredDataProviders"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_AREA_UPLOAD_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.AreaUpload;
