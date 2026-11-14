"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import type { PhiMediaAssetFolder } from "../../../../types/media";
import {
  createPhiControlOptionsProviderClient,
  type PhiControlOptionsProviderContext,
} from "../../../../components/controls/phi-options-provider";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import { readPhiMediaFolders } from "../../../../components/media/phi-image-preview-data";
import { PHI_ASSET_CONTROLLER_STORE_KEY } from "../../../../components/media/asset-controller-signals";
import { phiImagePreviewStore, type PhiImagePreviewStoreState } from "../../../../components/media/phi-image-preview-store";
import {
  buildPhiMediaFolderCascaderOptions,
  buildPhiMediaFolderNamesById,
  buildPhiMediaFolderValueById,
} from "../../../../components/media/media-folder-options";
import { isPhiMediaFolderLocked } from "../../../../components/media/media-folder-lock";

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
          /*
           * The Asset's Folder, chosen in its metadata: a locked Folder takes nothing in, so it is not
           * offered as a destination. The one the Asset already stands in stays readable as the value.
           */
          ...state.folders.map((folder) => ({
            value: String(folder.id),
            label: namePath(folder.id),
            ...(isPhiMediaFolderLocked(folder) ? { icon: "lock", disabled: true } : {}),
          })),
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
          /*
           * A parent for a new Folder. A locked one is marked rather than disabled: a disabled row in a
           * cascader cannot be opened, and the Folders below a locked one still take new ones.
           */
          ...state.folders.map((folder) => ({
            value: namePath(folder.id),
            label: folder.name,
            ...(isPhiMediaFolderLocked(folder) ? { icon: "lock" } : {}),
          })),
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
  return readPhiMediaFolders(isPhiRecord(payload) ? payload.folders : undefined, "The media folders route");
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

const STORAGE_SETTINGS_PATH = "/api/site/admin/media/storage";

async function loadStorageProfiles() {
  const response = await fetch(STORAGE_SETTINGS_PATH, {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Failed to load the site's storage profiles.");
  // Only what a choice shows. A profile this cannot name is left out rather than offered as a guess.
  const profiles = isPhiRecord(payload) && isPhiRecord(payload.storage) && Array.isArray(payload.storage.profiles)
    ? payload.storage.profiles
    : null;
  if (!profiles) throw new Error("The storage settings route answered without its profiles.");
  return profiles.flatMap((profile) =>
    isPhiRecord(profile) && Number.isSafeInteger(profile.id) && typeof profile.key === "string"
      && typeof profile.providerId === "string"
      ? [{ id: profile.id as number, key: profile.key, providerId: profile.providerId }]
      : []);
}

/**
 * The Site's Storage Profiles as choices, by id. Named by key and Provider, because that is what the
 * operator gave them; the key alone does not say whether a Profile is local or a bucket.
 */
export const PhiMediaStorageProfilesOptionsProviderClient = createPhiControlOptionsProviderClient({
  key: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaStorageProfiles,
  load: loadStorageProfiles,
  resolveLoadKey: () => "site-media-storage-profiles",
  resolve: (context: PhiControlOptionsProviderContext) => {
    const profiles = Array.isArray(context.asyncData)
      ? context.asyncData as { id: number; key: string; providerId: string }[]
      : [];
    return {
      options: profiles.map((profile) => ({ value: String(profile.id), label: `${profile.key} (${profile.providerId})` })),
    };
  },
});
