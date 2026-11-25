import { PhiMediaAssetFlags } from "../../../constants/media";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";
import type { PhiFormDescriptor, PhiFormHandlerProviderDescriptor } from "../../../types/form-descriptor";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { flattenPhiFormLabels } from "../../../components/forms/form-labels";
import { PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_KEY } from "./form-providers";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
import { phiFormLabel as label, phiFormRequired as required } from "../../../components/forms/form-descriptor-text";

export const PHI_ASSET_METADATA_FORM_ID = createPhiFormId(PHI_SHARED_PACKAGE_NAME, "asset/metadata");
export const PHI_ASSET_FOLDER_FORM_ID = createPhiFormId(PHI_SHARED_PACKAGE_NAME, "asset/folder-create");
const PHI_ASSET_METADATA_FORM_HANDLER_KEY = "site.asset.metadata.update";
const PHI_ASSET_FOLDER_FORM_HANDLER_KEY = "site.asset.folder.create";
const PHI_ASSET_FORM_LABEL_SET_KEY = "@phis/ui/modules/asset/labels/metadata" as const;

const flagOptions = [
  [PhiMediaAssetFlags.Featured, "featuredFlagLabel", "Featured"],
  [PhiMediaAssetFlags.Locked, "lockedFlagLabel", "Locked"],
  [PhiMediaAssetFlags.Mask, "maskFlagLabel", "Mask"],
  [PhiMediaAssetFlags.Background, "backgroundFlagLabel", "Background"],
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
  /*
   * Tracks of its own, against the house columns: this Form stands in the Asset inspector Drawer, 377px
   * less the Collapsible's inset, which is `compact` -- where the default stacks its labels -- and an
   * inspector keeps its labels beside the fields, as the Variants row above it does.
   */
  layout: {
    gap: { compact: "sm", medium: "base" },
    label: {
      compact: { start: 1, end: 9 },
      medium: { start: 1, end: 9 },
      wide: { start: 1, end: 7 },
    },
    control: {
      compact: { start: 9, end: 25 },
      medium: { start: 9, end: 25 },
      wide: { start: 7, end: 25 },
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
  // The house columns (`PHI_FORM_DEFAULT_LAYOUT`), like every other side-label Form.
  layout: {
    gap: { compact: "sm", medium: "base" },
  },
} as const satisfies PhiFormDescriptor;

async function loadAssetFormLabels(context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0]) {
  const [{ getPhiMediaWidgetLabels }, { getPhiAssetModuleLabels }] = await Promise.all([
    import("../../../components/media/label-sets/media"),
    import("./labels"),
  ]);
  const options = {
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: context.runtime.locale.current,
  };
  // The editor's own words are this Module's; the four flag words are the Foundation's, because Core's
  // toolbar flag filter says the same ones.
  const [{ editor }, { tool }] = await Promise.all([
    getPhiAssetModuleLabels(options),
    getPhiMediaWidgetLabels(options),
  ]);
  return flattenPhiFormLabels({
    folderPathLabel: editor.folderPathLabel,
    folderPathPlaceholder: editor.folderPathPlaceholder,
    titleLabel: editor.titleLabel,
    altLabel: editor.altLabel,
    flagsLabel: editor.flagsLabel,
    focalRectLabel: editor.focalRectLabel,
    folderNameLabel: editor.folderNameLabel,
    folderNamePlaceholder: editor.folderNamePlaceholder,
    folderNameRequired: editor.folderNameRequired,
    parentFolderLabel: editor.parentFolderLabel,
    topLevelFolderLabel: editor.topLevelFolderLabel,
    featuredFlagLabel: tool.featuredFlagLabel,
    lockedFlagLabel: tool.lockedFlagLabel,
    maskFlagLabel: tool.maskFlagLabel,
    backgroundFlagLabel: tool.backgroundFlagLabel,
  });
}

export const PHI_ASSET_METADATA_RUNTIME_MODULE_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  areas: ["builder"],
  formId: PHI_ASSET_METADATA_FORM_ID,
  version: 1,
  flags: 0,
  title: "Asset metadata",
  description: "Edit metadata for the selected Site asset.",
  category: "forms",
  tags: ["asset", "metadata"],
  descriptor: PHI_ASSET_METADATA_FORM_DESCRIPTOR,
  submitHandlerKey: PHI_ASSET_METADATA_FORM_HANDLER_KEY,
  loadLabels: loadAssetFormLabels,
});

export const PHI_ASSET_FOLDER_RUNTIME_MODULE_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  areas: ["builder"],
  formId: PHI_ASSET_FOLDER_FORM_ID,
  version: 1,
  flags: 0,
  title: "Create asset folder",
  description: "Create a Site asset folder below an optional existing parent.",
  category: "forms",
  tags: ["asset", "folder"],
  descriptor: PHI_ASSET_FOLDER_FORM_DESCRIPTOR,
  submitHandlerKey: PHI_ASSET_FOLDER_FORM_HANDLER_KEY,
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
