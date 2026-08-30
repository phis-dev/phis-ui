import { PhiMediaAssetFlags } from "../../constants/media";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../../plugins/runtime-modules/asset/ids";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "../../plugins/runtime-modules/asset/ids";
import type { PhiFormDescriptor, PhiFormHandlerProviderDescriptor } from "../../types/form-descriptor";
import { createPhiFormId } from "../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../types/signals";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../forms/form-registry";
import { flattenPhiFormLabels } from "../forms/form-labels";
import { PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_KEY } from "./asset-form-field-providers";

export const PHI_ASSET_METADATA_FORM_ID = createPhiFormId(PHI_SHARED_PACKAGE_NAME, "asset/metadata");
export const PHI_ASSET_FOLDER_FORM_ID = createPhiFormId(PHI_SHARED_PACKAGE_NAME, "asset/folder-create");
export const PHI_ASSET_METADATA_FORM_HANDLER_KEY = "site.asset.metadata.update";
export const PHI_ASSET_FOLDER_FORM_HANDLER_KEY = "site.asset.folder.create";
const PHI_ASSET_FORM_LABEL_SET_KEY = "@phis/ui/modules/asset/labels/metadata" as const;

const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);
const required = (key: string, fallback: string) => ([{
  providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
  message: label(key, fallback),
}] as const);
const flagOptions = [
  [PhiMediaAssetFlags.Featured, "featuredFlagLabel", "Featured"],
  [PhiMediaAssetFlags.Locked, "lockedFlagLabel", "Locked"],
  [PhiMediaAssetFlags.Mask, "maskFlagLabel", "Mask"],
] as const;

export const PHI_ASSET_METADATA_FORM_DESCRIPTOR = {
  schemaVersion: 1,
  key: PHI_ASSET_METADATA_FORM_ID,
  labelSetKey: PHI_ASSET_FORM_LABEL_SET_KEY,
  fields: [
    { key: "assetId", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
    { key: "imageUrl", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
    { key: "imageAlt", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
    {
      key: "folderId",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("folderPathLabel", "Folder"),
      placeholder: label("folderPathPlaceholder", "Choose a media folder"),
      optionsProvider: {
        providerKey: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaFolders,
        params: { valueMode: "id" },
      },
      config: { allowClear: true },
    },
    { key: "title", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text, label: label("titleLabel", "Title") },
    { key: "altText", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text, label: label("altLabel", "Alternative text") },
    {
      key: "presentationFlags",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
      label: label("flagsLabel", "Flags"),
      initialValue: [],
      options: flagOptions.map(([value, key, fallback]) => ({ value: String(value), label: label(key, fallback) })),
    },
    {
      key: "focalRect",
      fieldProviderKey: PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_KEY,
      label: label("focalRectLabel", "Focal rectangle"),
    },
  ],
  layout: {
    columns: { compact: 1, medium: 1, wide: 1 },
    gap: { compact: "sm", medium: "base" },
    labelPlacement: "side",
    labelAlign: "start",
    labelGrid: {
      compact: { span: 8, offset: 0 },
      medium: { span: 8, offset: 0 },
      wide: { span: 6, offset: 0 },
    },
    controlGrid: {
      compact: { span: 16, offset: 0 },
      medium: { span: 16, offset: 0 },
      wide: { span: 18, offset: 0 },
    },
  },
} as const satisfies PhiFormDescriptor;

export const PHI_ASSET_FOLDER_FORM_DESCRIPTOR = {
  schemaVersion: 1,
  key: PHI_ASSET_FOLDER_FORM_ID,
  labelSetKey: PHI_ASSET_FORM_LABEL_SET_KEY,
  fields: [
    {
      key: "name",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("folderNameLabel", "Name"),
      placeholder: label("folderNamePlaceholder", "Folder name"),
      validation: required("folderNameRequired", "Enter a folder name."),
      config: { minLength: 1, maxLength: 160 },
    },
    {
      key: "parentPath",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.cascader,
      label: label("parentFolderLabel", "Parent folder"),
      initialValue: "/",
      options: [{ value: "/", label: label("topLevelFolderLabel", "Top level") }],
      optionsProvider: {
        providerKey: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaFolders,
        params: { valueMode: "name-path" },
      },
      config: { allowRoot: true, allowClear: false, separator: "/", rootValue: "/", normalize: "raw" },
    },
  ],
  layout: {
    columns: { compact: 1, medium: 1, wide: 1 },
    gap: { compact: "sm", medium: "base" },
    labelPlacement: "side",
    labelAlign: "start",
    labelGrid: {
      compact: { span: 8, offset: 0 },
      medium: { span: 8, offset: 0 },
      wide: { span: 8, offset: 0 },
    },
    controlGrid: {
      compact: { span: 16, offset: 0 },
      medium: { span: 16, offset: 0 },
      wide: { span: 16, offset: 0 },
    },
  },
} as const satisfies PhiFormDescriptor;

async function loadAssetFormLabels(context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0]) {
  const { getPhiMediaWidgetLabels } = await import("./label-sets/media");
  const labels = await getPhiMediaWidgetLabels({
    apiBaseUrl: context.runtime.phis.apiBaseUrl,
    internalToken: context.runtime.phis.internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    folderPathLabel: labels.editor.folderPathLabel,
    folderPathPlaceholder: labels.editor.folderPathPlaceholder,
    titleLabel: labels.editor.titleLabel,
    altLabel: labels.editor.altLabel,
    flagsLabel: labels.editor.flagsLabel,
    focalRectLabel: labels.editor.focalRectLabel,
    folderNameLabel: labels.editor.folderNameLabel,
    folderNamePlaceholder: labels.editor.folderNamePlaceholder,
    folderNameRequired: labels.editor.folderNameRequired,
    parentFolderLabel: labels.editor.parentFolderLabel,
    topLevelFolderLabel: labels.editor.topLevelFolderLabel,
    privateFlagLabel: labels.editor.privateFlagLabel,
    archivedFlagLabel: labels.editor.archivedFlagLabel,
    downloadFlagLabel: labels.editor.downloadFlagLabel,
    featuredFlagLabel: labels.editor.featuredFlagLabel,
    lockedFlagLabel: labels.editor.lockedFlagLabel,
    maskFlagLabel: labels.editor.maskFlagLabel,
  });
}

export const PHI_ASSET_METADATA_RUNTIME_MODULE_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  formId: PHI_ASSET_METADATA_FORM_ID,
  version: 1,
  flags: 0,
  title: "Asset metadata",
  description: "Edit metadata for the selected Site asset.",
  category: "forms",
  tags: ["asset", "metadata"],
  descriptor: PHI_ASSET_METADATA_FORM_DESCRIPTOR,
  submitHandlerKey: PHI_ASSET_METADATA_FORM_HANDLER_KEY,
  confirmHandlerKey: null,
  previewHandlerKey: null,
  defaultConfig: {},
  variant: "default",
  config: {},
  previewUpstreamPath: null,
  loadLabels: loadAssetFormLabels,
});

export const PHI_ASSET_FOLDER_RUNTIME_MODULE_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  formId: PHI_ASSET_FOLDER_FORM_ID,
  version: 1,
  flags: 0,
  title: "Create asset folder",
  description: "Create a Site asset folder below an optional existing parent.",
  category: "forms",
  tags: ["asset", "folder"],
  descriptor: PHI_ASSET_FOLDER_FORM_DESCRIPTOR,
  submitHandlerKey: PHI_ASSET_FOLDER_FORM_HANDLER_KEY,
  confirmHandlerKey: null,
  previewHandlerKey: null,
  defaultConfig: {},
  variant: "default",
  config: {},
  previewUpstreamPath: null,
  loadLabels: loadAssetFormLabels,
});

export const PHI_ASSET_METADATA_FORM_HANDLER_PROVIDER_DESCRIPTOR = {
  key: createPhiSharedFormProviderKey("handler", "asset-metadata"),
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  title: "Asset metadata update",
  phase: "submit",
  handlerKey: PHI_ASSET_METADATA_FORM_HANDLER_KEY,
  category: "site",
  transport: "relay",
  method: "POST",
  endpointKey: null,
  upstreamPath: "/api/v1/forms/media-metadata",
  csrfPath: null,
  requiresCsrf: false,
  credentialPolicy: "site-session",
} satisfies PhiFormHandlerProviderDescriptor;

export const PHI_ASSET_FOLDER_FORM_HANDLER_PROVIDER_DESCRIPTOR = {
  key: createPhiSharedFormProviderKey("handler", "asset-folder-create"),
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  title: "Asset folder creation",
  phase: "submit",
  handlerKey: PHI_ASSET_FOLDER_FORM_HANDLER_KEY,
  category: "site",
  transport: "relay",
  method: "POST",
  endpointKey: null,
  upstreamPath: "/api/v1/forms/media-folder",
  csrfPath: null,
  requiresCsrf: false,
  credentialPolicy: "site-session",
} satisfies PhiFormHandlerProviderDescriptor;
