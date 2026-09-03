import {
  PHI_SIGNAL_VALUE_SCHEMAS,
} from "../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../types/cms-plugins";
import {
  PHI_ASSET_CONTROLLER_KEY,
  PHI_ASSET_CONTROLLER_PLUGIN_KEY,
} from "./asset-controller-address";
import { PHI_ASSET_SIGNAL_CHANNELS } from "./asset-controller-signals";

export type PhiAssetRuntimeControllerConfig = Record<string, never>;

export function parsePhiAssetRuntimeControllerConfig(): PhiAssetRuntimeControllerConfig {
  return {};
}

export const PHI_ASSET_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_ASSET_CONTROLLER_PLUGIN_KEY,
  key: PHI_ASSET_CONTROLLER_KEY,
  title: "Asset Controller",
  description: "Headless controller for asset search, filtering, pagination, reloads, and media preview state.",
  iconFamily: "media",
  allowedMountScopes: ["area", "page"],
  runtimeSignals: {
    emits: [
      {
        id: "pagination",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.pagination,
      },
      { id: "dialogClose", action: "close", valueType: "none" },
      { id: "dialogOpen", action: "open", valueType: "none" },
      { id: "formSubmit", action: "activate", valueType: "none" },
      { id: "formReset", action: "activate", valueType: "none" },
      { id: "reload", action: "activate", valueType: "none" },
      {
        id: "formValues",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      },
    ],
    listens: [
      {
        id: "kind",
        channel: PHI_ASSET_SIGNAL_CHANNELS.kind,
        action: "change",
        valueType: "string",
      },
      {
        id: "presentationFlags",
        channel: PHI_ASSET_SIGNAL_CHANNELS.presentationFlags,
        action: "change",
        valueType: "number[]",
      },
      {
        id: "path",
        channel: PHI_ASSET_SIGNAL_CHANNELS.path,
        action: "change",
        valueType: "path",
      },
      {
        id: "query",
        channel: PHI_ASSET_SIGNAL_CHANNELS.query,
        action: "change",
        valueType: "string",
      },
      {
        id: "pagination",
        channel: PHI_ASSET_SIGNAL_CHANNELS.pagination,
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.pagination,
      },
      {
        id: "reload",
        channel: PHI_ASSET_SIGNAL_CHANNELS.reload,
        action: "activate",
        valueType: "none",
      },
      {
        id: "selection",
        channel: PHI_ASSET_SIGNAL_CHANNELS.selection,
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.mediaAssetSelection,
      },
      {
        id: "collectionAction",
        channel: PHI_ASSET_SIGNAL_CHANNELS.collectionAction,
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.collectionAction,
      },
      {
        id: "formCommand",
        channel: PHI_ASSET_SIGNAL_CHANNELS.command,
        action: "activate",
        valueType: "string",
      },
      {
        id: "formSuccess",
        channel: PHI_ASSET_SIGNAL_CHANNELS.submit,
        action: "activate",
        valueType: "none",
      },
      {
        id: "formSubmitting",
        channel: PHI_ASSET_SIGNAL_CHANNELS.submitting,
        action: "change",
        valueType: "boolean",
      },
      {
        id: "folderCommand",
        channel: PHI_ASSET_SIGNAL_CHANNELS.folderCommand,
        action: "activate",
        valueType: "string",
      },
      {
        id: "folderSuccess",
        channel: PHI_ASSET_SIGNAL_CHANNELS.folderSubmit,
        action: "activate",
        valueType: "none",
      },
      {
        id: "folderSubmitting",
        channel: PHI_ASSET_SIGNAL_CHANNELS.folderSubmitting,
        action: "change",
        valueType: "boolean",
      },
    ],
  },
  defaultConfig: {},
  parseConfig: parsePhiAssetRuntimeControllerConfig,
} satisfies PhiRuntimeControllerDefinition<PhiAssetRuntimeControllerConfig>;
