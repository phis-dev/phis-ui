import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "./ids";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";

export const PHI_ASSET_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
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
        itemRendererKey: "@phis/ui/media-asset",
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
