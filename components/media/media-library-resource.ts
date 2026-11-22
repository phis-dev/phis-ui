import { PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY } from "../../constants/media-library-provider-keys";
import type { PhiCollectionProviderResourceDescriptor } from "../../types/collection-provider";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../types/signals";

/**
 * The Media library's own Collection resource, `assets` of `PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection`,
 * as the Asset Module declares it (`plugins/runtime-modules/asset/data-providers.ts` names this object):
 * its filters, its Folder, lock, upload and delete actions, and its upload panel -- what the Media
 * renderer offers for it (COLLECTIONS.md, "The Media renderer").
 *
 * The Foundation's, like the keys beside it, because a Foundation surface binds that resource without a
 * page's registry and still has to hand the renderer its declaration: the Media preview grid
 * (`PhiAssetPreviewGridWidget`). One object, so the declaration the Area's registry holds and the one the
 * grid hands over cannot say different things.
 */
export const PHI_MEDIA_LIBRARY_ASSET_RESOURCE = {
  resourceKey: "assets",
  title: "Assets",
  itemIdentityPath: "id",
  itemRendererKey: PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY,
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
} as const satisfies PhiCollectionProviderResourceDescriptor;
