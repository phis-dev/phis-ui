import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import type { PhiTableProviderResourceDescriptor } from "../../../types/table-widget";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS, PHI_ASSET_RUNTIME_ITEM_RENDERER_KEY } from "./ids";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";


/** The existing User and Group Spaces, one resource per kind, for the Admin storage table. */
export const PHI_ASSET_STORAGE_SPACES_RESOURCES: readonly PhiTableProviderResourceDescriptor[] = [
  {
    resourceKey: "userSpaces",
    title: "User Spaces",
    rowIdentityPath: "id",
    fields: [
      { key: "id", title: "Space", type: "number", required: true },
      { key: "owner", title: "Owner", type: "string", required: true },
      { key: "email", title: "Email", type: "string" },
      { key: "storageProfileId", title: "Storage profile", type: "string", required: true, mutable: true },
      // Megabytes, as every quota field of the settings states them. Empty inherits the Site default.
      { key: "quotaMegabytes", title: "Quota", type: "number", mutable: true, constraints: { min: 0 } },
      { key: "effectiveQuotaMegabytes", title: "Effective quota", type: "number" },
      { key: "usedMegabytes", title: "Used", type: "number" },
    ],
    query: { search: true, sorting: "none", pagination: "offset", total: true },
    actions: [{ key: "refresh", title: "Refresh", scope: "resource" }],
  },
  {
    resourceKey: "groupSpaces",
    title: "Group Spaces",
    rowIdentityPath: "id",
    fields: [
      { key: "id", title: "Space", type: "number", required: true },
      { key: "owner", title: "Owner", type: "string", required: true },
      { key: "email", title: "Email", type: "string" },
      { key: "storageProfileId", title: "Storage profile", type: "string", required: true, mutable: true },
      // Megabytes, as every quota field of the settings states them. Empty inherits the Site default.
      { key: "quotaMegabytes", title: "Quota", type: "number", mutable: true, constraints: { min: 0 } },
      { key: "effectiveQuotaMegabytes", title: "Effective quota", type: "number" },
      { key: "usedMegabytes", title: "Used", type: "number" },
    ],
    query: { search: true, sorting: "none", pagination: "offset", total: true },
    actions: [{ key: "refresh", title: "Refresh", scope: "resource" }],
  },
];

export const PHI_ASSET_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaStorageSpaces,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    kind: "table",
    executionMode: "live",
    authoringMode: "none",
    title: "Media Spaces and their storage",
    description: "The site's existing User and Group Spaces, with the storage profile each writes to and its quota.",
    resources: PHI_ASSET_STORAGE_SPACES_RESOURCES,
  },
  {
    key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaStorageProfiles,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "Storage profiles",
    description: "The site's storage profiles, for a setting that points Spaces at one.",
  },
  {
    key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaFolderChoices,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "Media folder choices",
    description: "Every folder of the Site's media, under the folder it stands in, for a setting that names one.",
    // Named in a record binding's parameters, which the Builder edits on any page.
    availableToAuthoringChrome: true,
  },
  {
    key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaFolders,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "Media folders",
    description: "Published media folder hierarchy supplied by the Asset runtime controller.",
    // The Builder's own pickers read this regardless of whether the edited Area activates
    // this Module: a phis:asset reference resolves through the core resolver either way.
    availableToAuthoringChrome: true,
  },
  {
    key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaCollection,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    kind: "collection",
    executionMode: "live",
    authoringMode: "none",
    title: "Media collection",
    description: "Provider-owned media asset queries and mutations.",
    // The Builder's own pickers read this regardless of whether the edited Area activates
    // this Module: a phis:asset reference resolves through the core resolver either way.
    availableToAuthoringChrome: true,
    resources: [
      {
        resourceKey: "assets",
        title: "Assets",
        itemIdentityPath: "id",
        itemRendererKey: PHI_ASSET_RUNTIME_ITEM_RENDERER_KEY,
        selectionValueSchema: PHI_SIGNAL_VALUE_SCHEMAS.mediaAssetSelection,
        defaultForWidget: true,
        query: {
          search: true,
          pagination: true,
          filterFields: [
            { key: "kind", title: "Kind", type: "enum[]" },
            { key: "presentationFlags", title: "Flags", type: "enum[]" },
            { key: "folderId", title: "Folder", type: "path" },
          ],
        },
        actions: [
          { key: "createFolder", title: "Create folder", scope: "resource" },
          // The Folder the listing is filtered to; Core refuses every change to what a locked one holds.
          { key: "lockFolder", title: "Lock folder", scope: "resource" },
          { key: "unlockFolder", title: "Unlock folder", scope: "resource" },
          { key: "upload", title: "Upload", scope: "resource", panelKey: "upload" },
          { key: "refresh", title: "Reload", scope: "resource" },
          { key: "update", title: "Update", scope: "item" },
          { key: "delete", title: "Delete", scope: "item" },
        ],
        panels: [{ key: "upload", title: "Upload assets" }],
      },
    ],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
