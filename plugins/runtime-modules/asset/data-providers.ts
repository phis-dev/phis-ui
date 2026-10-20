import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS, PHI_ASSET_RUNTIME_ITEM_RENDERER_KEY } from "./ids";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";

/** How the Folder's pictures are ordered; the words a record binding's `sort` takes. */
export const PHI_MEDIA_FOLDER_IMAGES_SORTS = ["name_asc", "created_at_desc"] as const;
export const PHI_MEDIA_FOLDER_IMAGES_DEFAULT_LIMIT = 50;
/** What the server hands out at most (`/api/v1/site/media/folder-images`). */
export const PHI_MEDIA_FOLDER_IMAGES_MAX_LIMIT = 200;

export const PHI_ASSET_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaFolderChoices,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "Media folder choices",
    description: "Every folder of the Site's media, by its path, for a setting that names one.",
    // Named in a record binding's parameters, which the Builder edits on any page.
    availableToAuthoringChrome: true,
  },
  /*
   * The pictures of a Folder, read on the server while the page is drawn (`types/record-provider.ts`).
   * A Folder is a thing somebody keeps filling, so the page reads it rather than naming each picture:
   * what is public in the branch at render time is what the Gallery shows.
   */
  {
    key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaFolderImages,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    kind: "record",
    executionMode: "live",
    // The Builder draws a placeholder for a Gallery and reads nothing.
    authoringMode: "none",
    title: "Media folder pictures",
    description: "The public pictures of one media folder, with its subfolders unless told otherwise.",
    settingsFields: [
      {
        key: "folderId",
        type: "choice",
        label: "Folder",
        optionsProvider: { providerKey: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaFolderChoices },
      },
      { key: "topLevelOnly", type: "boolean", label: "This folder only", description: "Leave the pictures in its subfolders out." },
      {
        key: "sort",
        type: "choice",
        label: "Order",
        options: [
          { value: "name_asc", label: "By file name" },
          { value: "created_at_desc", label: "Newest first" },
        ],
      },
      { key: "limit", type: "number", label: "At most", min: 1, max: PHI_MEDIA_FOLDER_IMAGES_MAX_LIMIT },
    ],
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
