import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";
import { PhiMediaKind } from "../../../constants/media";
import {
  PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY,
  PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY,
} from "../../../constants/media-library-provider-keys";
import type { PhiFormFieldTypeProviderDescriptor } from "../../../types/form-descriptor";
import { createPhiSharedFormProviderKey } from "../../../components/forms/form-provider-contract";

export const PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_KEY = createPhiSharedFormProviderKey(
  "field",
  "asset-focal-rect",
);

export const PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_DESCRIPTOR = {
  key: PHI_ASSET_FOCAL_RECT_FORM_PROVIDER_KEY,
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  title: "Asset focal rectangle",
  description: "Edits one transient focal rectangle as an atomic Form value.",
  valueType: "json",
  presentation: "hidden",
} satisfies PhiFormFieldTypeProviderDescriptor;

/**
 * The `media-asset` field type: one Asset of the Site's Media library, chosen with the library's picker.
 * The Asset Module owns it, so a Form in any other Module may use it, and the Form widget mounts this
 * Module's field Providers for it where the Module is active (`FORMS.md`).
 */
/**
 * The `media-asset` field's wording, read from the Form's Label Set and falling back to English. The
 * picker's own wording (title, search, folder, empty, failed) is the Media picker's and is not repeated.
 */
export const PHI_FORM_MEDIA_ASSET_LABEL_KEYS = {
  choose: "mediaAssetChoose",
  change: "mediaAssetChange",
  remove: "mediaAssetRemove",
  /** Beside a chosen Asset that is not public, where the field offers public ones only. */
  notPublic: "mediaAssetNotPublic",
  /** Where the preview would be, when the Asset could not be read. */
  unavailable: "mediaAssetUnavailable",
} as const;

// The kinds a Media field's picker lists, offered alike by `media-asset` and `media-assets`.
const MEDIA_FIELD_KIND_OPTIONS = [
  { value: PhiMediaKind.Image, label: "Image" },
  { value: PhiMediaKind.Video, label: "Video" },
  { value: PhiMediaKind.Audio, label: "Audio" },
  { value: PhiMediaKind.Pdf, label: "PDF" },
  { value: PhiMediaKind.Markdown, label: "Markdown" },
  { value: PhiMediaKind.Font, label: "Font" },
];

export const PHI_ASSET_MEDIA_ASSET_FORM_PROVIDER_DESCRIPTOR = {
  key: PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY,
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  title: "Media asset",
  description: "One Asset of the Site's Media library, as its id.",
  valueType: "number",
  presentation: "control",
  settingsFields: [
    {
      key: "mediaType",
      type: "choice",
      mode: "single",
      valueType: "string",
      label: "Kind",
      description: "Image when nothing is named.",
      options: MEDIA_FIELD_KIND_OPTIONS,
    },
    {
      key: "publicOnly",
      type: "boolean",
      label: "Public only",
      description: "Offer only Assets that are delivered publicly. The picker greys out the others; the Server that takes the value decides.",
    },
    {
      key: "folderPath",
      type: "string",
      label: "Folder path",
      description: "The Site Folder the picker opens on and uploads into, by its path (\"Shop Images / Products\"); missing Folders are created on the first upload. {key} puts in a value of the Form; a name whose value is empty is left out. Empty: the root.",
    },
  ],
} satisfies PhiFormFieldTypeProviderDescriptor;

/**
 * The most Assets a `media-assets` field holds whatever its config says: the most the Media list answers
 * by id in one read (`GET /api/site/media?id=…`), which is how the field reads its tiles.
 */
export const PHI_MEDIA_ASSETS_FIELD_MOST = 100;

/**
 * The `media-assets` field's own wording, read from the Form's Label Set and falling back to English. Its
 * buttons and the picker and upload surface they open say the Media Label Set's words
 * (`PHI_FORM_MEDIA_ASSET_PICKER_LABEL_KEYS`, "Choose from Media library" and the upload toggle among them).
 */
export const PHI_FORM_MEDIA_ASSETS_LABEL_KEYS = {
  /** A tile's button that takes the Asset out of the value. */
  remove: "mediaAssetsRemove",
  /** The drag handle's name for assistive technology. */
  reorder: "mediaAssetsReorder",
  /** The name on a tile whose Asset the library did not answer. */
  unavailable: "mediaAssetsUnavailable",
  /** Said where the value holds more than `max`, or more were offered than fit; `%1` is `max`. */
  tooMany: "mediaAssetsTooMany",
} as const;

/**
 * The `media-assets` field type: several Assets of the Site's Media library, as an ordered list of their
 * ids. The Asset Module owns it as it owns `media-asset`. `json`, as the `upload` field's list of Asset
 * ids is: the Form contract's value types have no list of numbers.
 */
export const PHI_ASSET_MEDIA_ASSETS_FORM_PROVIDER_DESCRIPTOR = {
  key: PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY,
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  title: "Media assets",
  description: "Several Assets of the Site's Media library, as their ids in order.",
  valueType: "json",
  presentation: "control",
  settingsFields: [
    {
      key: "mediaType",
      type: "choice",
      mode: "single",
      valueType: "string",
      label: "Kind",
      description: "Image when nothing is named.",
      options: MEDIA_FIELD_KIND_OPTIONS,
    },
    {
      key: "folderPath",
      type: "string",
      label: "Folder path",
      description: "The Site Folder the picker opens on and uploads go into, by its path (\"Shop Images / Products\"); missing Folders are created on the first upload. {key} puts in a value of the Form; a name whose value is empty is left out. Empty: the root.",
    },
    {
      key: "max",
      type: "number",
      label: "Most Assets",
      description: `The most Assets the field holds, from 1 to ${PHI_MEDIA_ASSETS_FIELD_MOST} (the default).`,
      min: 1,
      max: PHI_MEDIA_ASSETS_FIELD_MOST,
      precision: 0,
    },
  ],
} satisfies PhiFormFieldTypeProviderDescriptor;
