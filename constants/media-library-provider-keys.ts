import type { PhiFormProviderKey } from "../types/form-descriptor";
import { createPhiModuleScopedKey } from "./runtime-module-ownership";
import {
  createPhiSharedRuntimeDataProviderKey,
  createPhiSharedRuntimeItemRendererKey,
} from "./runtime-data-provider-key";

/**
 * The Media library as a Foundation contract.
 *
 * A Widget that offers an image picker has to name the Provider it reads -- in its
 * `requiredDataProviders`, or in a `dataSource` its config carries -- so the tree scan mounts it. Naming
 * it used to mean importing `plugins/runtime-modules/asset/ids`, and a Module importing another Module
 * is forbidden: it binds the two at compile time, so Theme stopped building without the Asset Module
 * rather than losing one picker. An installed package cannot reach that file at all.
 *
 * So the name lives here and the answer stays in the Module. Whoever wants a picker cites these keys;
 * whether anything serves them is decided by the installation, and a Widget whose Provider is absent
 * degrades to an empty library rather than failing to compile. That is the whole difference between
 * depending on a Module and depending on a capability.
 *
 * This is not ownership: `constants/runtime-module-ownership.ts` still records the Asset Module as the
 * owner, and these keys still read `@phis/ui/modules/asset/...`. The Foundation states the contract,
 * never the implementation, and holds no reference to the Module that meets it.
 */
export const PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS = {
  collection: createPhiSharedRuntimeDataProviderKey("collections", "media"),
  folders: createPhiSharedRuntimeDataProviderKey("options", "media-folders"),
  /**
   * Every Folder of the Site Space as a choice, loaded by the choice itself. The Asset Module answers it,
   * and the Builder reads it in any Area (`availableToAuthoringChrome`); the folder pictures Provider
   * names it for its Folder setting.
   */
  folderChoices: createPhiSharedRuntimeDataProviderKey("options", "media-folder-choices"),
  /**
   * The public pictures of one Folder, read on the server while the page is drawn (a `record`
   * Provider). Served by Core, not by the Asset Module: showing what is public needs no Media
   * management in the Area, as an Image Widget does not. The Gallery Widget starts bound to it.
   */
  folderImages: createPhiSharedRuntimeDataProviderKey("records", "media-folder-images"),
} as const;

/**
 * The card that draws a media asset, named on the same terms as the Providers above.
 *
 * A Module that wants to show media its own way registers another Render Client under its own key and a
 * Site names that one in the Widget's `itemRendererKey`. It cites this one to say which items it is
 * replacing -- and cites it from here, so offering an alternative never means importing the Asset
 * Module.
 */
export const PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY =
  createPhiSharedRuntimeItemRendererKey("media-asset");

/**
 * The `media-asset` Form field type, named on the same terms: one Asset of the Site's Media library,
 * chosen with the library's picker. A Form of any Module cites this key in its `fieldProviderKey`; the
 * Asset Module owns the field type, declares it in its `formProviders` and serves its control, and the
 * Form widget mounts that for the Form where the Module is active (FORMS.md). The Foundation names it and
 * holds no reference to the Module -- the resolver reads it to mount the library Provider the picker needs.
 */
export const PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY =
  createPhiModuleScopedKey("form-field", "media-asset") as PhiFormProviderKey;

/**
 * The `media-assets` Form field type: several Assets of the Site's Media library, as an ordered list of
 * their ids -- the many-picture counterpart of `media-asset`, for a record that has several (a product's
 * gallery). Named on the same terms: the Asset Module owns, declares and serves it (FORMS.md), and the
 * resolver reads this key to mount the library Provider its picker and tiles read.
 */
export const PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY =
  createPhiModuleScopedKey("form-field", "media-assets") as PhiFormProviderKey;
