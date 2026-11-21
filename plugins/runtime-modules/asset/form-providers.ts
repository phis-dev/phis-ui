import { PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";
import { PhiMediaKind } from "../../../constants/media";
import { PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY } from "../../../constants/media-library-provider-keys";
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
  /** Beneath the field when it offers public Assets only (`config.publicOnly`). */
  publicOnlyHint: "mediaAssetPublicOnlyHint",
  /** Beside a chosen Asset that is not public, where the field offers public ones only. */
  notPublic: "mediaAssetNotPublic",
  /** Where the preview would be, when the Asset could not be read. */
  unavailable: "mediaAssetUnavailable",
} as const;

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
      options: [
        { value: PhiMediaKind.Image, label: "Image" },
        { value: PhiMediaKind.Video, label: "Video" },
        { value: PhiMediaKind.Audio, label: "Audio" },
        { value: PhiMediaKind.Pdf, label: "PDF" },
        { value: PhiMediaKind.Markdown, label: "Markdown" },
        { value: PhiMediaKind.Font, label: "Font" },
      ],
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
      description: "The Site Folder the picker opens on and uploads into, by its path (\"Shop Images / Products\"); missing Folders are created. Empty: the root.",
    },
  ],
} satisfies PhiFormFieldTypeProviderDescriptor;
