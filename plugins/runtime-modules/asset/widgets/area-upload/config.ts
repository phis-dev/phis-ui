import { isPhiRecord } from "../../../../../helpers/is-record";
import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsAreaUploadWidgetConfig } from "../../../../../types/media";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { requirePhiAssetController } from "../../../../../components/media/asset-controller-requirement";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../../ids";
import {
  readBoolean,
  readInteger,
  readRenderableBlockConfig,
  readString,
} from "../../../../../components/widgets/config/parser-primitives";

function normalizePhiCmsAreaUploadWidgetConfig(config: unknown): PhiCmsAreaUploadWidgetConfig {
  if (!isPhiRecord(config)) {
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

function parsePhiCmsAreaUploadWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsAreaUploadWidgetConfig {
  return normalizePhiCmsAreaUploadWidgetConfig(config);
}

export const PHI_AREA_UPLOAD_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("area-upload"),
  typeKey: "area-upload",
  // Without a folderPath an upload goes into the folder the Asset Controller holds, so the Controller is where this is.
  requiredRuntimeControllers: requirePhiAssetController,
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
    /*
     * A Folder of the Site Space by its path of names, "Shop Images / Products": every upload goes there,
     * whichever Folder the Controller has open, and the Folders it names that are missing are created on
     * the first upload. A path and not an id, so a preset can state it for every Site; it is resolved
     * when an upload begins (`resolvePhiMediaUploadInitOptions`). Empty: the Controller's Folder.
     */
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
  | "requiredRuntimeControllers"
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
