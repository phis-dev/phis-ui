"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import type { PhiMediaAssetFolder } from "../../../../types/media";
import {
  createPhiControlOptionsProviderClient,
  type PhiControlOptionsProviderContext,
} from "../../../../components/controls/phi-options-provider";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { PHI_ASSET_CONTROLLER_STORE_KEY } from "../../../../components/media/asset-controller-signals";
import { phiImagePreviewStore, type PhiImagePreviewStoreState } from "../../../../components/media/phi-image-preview-store";
import {
  buildPhiMediaFolderCascaderOptions,
  buildPhiMediaFolderNamesById,
  buildPhiMediaFolderValueById,
} from "../../../../components/media/media-folder-options";

export const PhiMediaFoldersOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaFolders,
  subscribe: (listener) => phiImagePreviewStore.subscribe(PHI_ASSET_CONTROLLER_STORE_KEY, listener),
  getSnapshot: () => phiImagePreviewStore.getSnapshot(PHI_ASSET_CONTROLLER_STORE_KEY),
  resolve: (context: PhiControlOptionsProviderContext) => {
    const state = context.snapshot as PhiImagePreviewStoreState;
    const configuredOptions = context.options ?? [];
    const valueMode = context.optionsProvider?.params?.valueMode;
    if (valueMode === "id") {
      const namePath = (folderId: number) => buildPhiMediaFolderNamesById(state.folders, folderId).join(" / ");
      return {
        options: [
          ...configuredOptions,
          ...state.folders.map((folder) => ({ value: String(folder.id), label: namePath(folder.id) })),
        ],
        value: state.folderId == null ? undefined : String(state.folderId),
      };
    }
    if (valueMode === "name-path") {
      const namePath = (folderId: number | null) => {
        const names = buildPhiMediaFolderNamesById(state.folders, folderId);
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

/**
 * Every Folder of the Site Space, by its path, for a setting that names one on a page that is not the
 * Media page. `PhiMediaFoldersOptionsProviderClient` reads the library's store, which only the Media
 * page fills; this asks the folders route itself and keeps the whole list, because the list is small
 * and a Gallery's author reads it once.
 */
const FOLDERS_PATH = "/api/site/media/folders";

async function loadFolders() {
  const response = await fetch(FOLDERS_PATH, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Failed to load the Site's media folders.");
  const folders = isPhiRecord(payload) && Array.isArray(payload.folders) ? payload.folders : [];
  return folders.filter(isPhiRecord) as unknown as PhiMediaAssetFolder[];
}

export const PhiMediaFolderChoicesOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaFolderChoices,
  load: loadFolders,
  resolveLoadKey: () => "site-media-folders",
  resolve: (context: PhiControlOptionsProviderContext) => {
    const folders = Array.isArray(context.asyncData) ? context.asyncData as PhiMediaAssetFolder[] : [];
    const pathOf = (folderId: number) => buildPhiMediaFolderNamesById(folders, folderId).join(" / ");
    return {
      options: [...folders]
        .sort((left, right) => pathOf(left.id).localeCompare(pathOf(right.id)))
        .map((folder) => ({ value: String(folder.id), label: pathOf(folder.id) })),
    };
  },
});
