"use client";

import {
  createPhiControlOptionsProviderClient,
  type PhiControlOptionsProviderContext,
} from "../controls/phi-options-provider";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../../plugins/runtime-modules/asset/ids";
import { PHI_ASSET_CONTROLLER_STORE_KEY } from "./asset-controller-signals";
import { phiImagePreviewStore, type PhiImagePreviewStoreState } from "./phi-image-preview-store";
import {
  buildPhiMediaFolderCascaderOptions,
  buildPhiMediaFolderValueById,
} from "./phi-media-scope-controller";

export const PhiMediaFoldersOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaFolders,
  subscribe: (listener) => phiImagePreviewStore.subscribe(PHI_ASSET_CONTROLLER_STORE_KEY, listener),
  getSnapshot: () => phiImagePreviewStore.getSnapshot(PHI_ASSET_CONTROLLER_STORE_KEY),
  resolve: (context: PhiControlOptionsProviderContext) => {
    const state = context.snapshot as PhiImagePreviewStoreState;
    const configuredOptions = context.options ?? [];
    const valueMode = context.optionsProvider?.params?.valueMode;
    if (valueMode === "id") {
      const byId = new Map(state.folders.map((folder) => [folder.id, folder] as const));
      const namePath = (folderId: number) => {
        const names: string[] = [];
        const visited = new Set<number>();
        let currentId: number | null = folderId;
        while (currentId != null && !visited.has(currentId)) {
          visited.add(currentId);
          const folder = byId.get(currentId);
          if (!folder) break;
          names.unshift(folder.name);
          currentId = folder.parentId;
        }
        return names.join(" / ");
      };
      return {
        options: [
          ...configuredOptions,
          ...state.folders.map((folder) => ({ value: String(folder.id), label: namePath(folder.id) })),
        ],
        value: state.folderId == null ? undefined : String(state.folderId),
      };
    }
    if (valueMode === "name-path") {
      const byId = new Map(state.folders.map((folder) => [folder.id, folder] as const));
      const namePath = (folderId: number | null) => {
        const names: string[] = [];
        const visited = new Set<number>();
        let currentId = folderId;
        while (currentId != null && !visited.has(currentId)) {
          visited.add(currentId);
          const folder = byId.get(currentId);
          if (!folder) break;
          names.unshift(folder.name);
          currentId = folder.parentId;
        }
        return names.length > 0 ? `/${names.join("/")}` : "/";
      };
      return {
        options: [
          ...configuredOptions,
          ...state.folders.map((folder) => ({ value: namePath(folder.id), label: folder.name })),
        ],
        value: namePath(state.folderId),
      };
    }
    const folderPathValue = state.folderPath?.length ? `/${state.folderPath.join("/")}` : undefined;
    return {
      options: [...configuredOptions, ...buildPhiMediaFolderCascaderOptions(state.folders)],
      value: folderPathValue ?? buildPhiMediaFolderValueById(state.folders, state.folderId),
    };
  },
});
