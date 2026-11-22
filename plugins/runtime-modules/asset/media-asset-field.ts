import { PhiMediaKind, isPhiMediaAssetPublic } from "../../../constants/media";
import type { PhiMediaAssetTile, PhiMediaKindValue } from "../../../types/media";
import {
  createPhiConfigReader,
  type PhiConfigReader,
} from "../../../components/widgets/config/strict-config-reader";
import {
  isPhiMediaFolderPathTemplate,
  splitPhiMediaFolderNamePath,
} from "../../../components/media/media-folder-name-path";

/*
 * The `media-asset` field: one Asset of the Site's Media library, chosen with the library's picker.
 *
 * The value is the Asset id as a number, `null` for none -- so `required` means "an Asset", and a save
 * that clears the field says so. Only the Site Space is ever offered (`FORMS.md`), and a file uploaded in
 * the picker goes there too, into the Folder the picker shows.
 */

export type PhiMediaAssetFieldConfig = {
  /** Which kind of Asset the picker lists. */
  mediaType: PhiMediaKindValue;
  /**
   * Whether Assets that are not delivered publicly are greyed out in the picker -- and an uploaded one
   * that is not is left unchosen. Core delivers what goes into the Site Space publicly by default.
   */
  publicOnly: boolean;
  /**
   * The Folder of the Site Space the picker opens on, by its path of names from the root ("Shop Images /
   * Products"): it opens on the deepest of them that is there, and an upload from there creates the
   * missing ones and goes into the whole path. Empty: the Folder the picker last showed, at first the
   * root. A path and not an id, so a Module's Form states it for every Site.
   *
   * A name may hold placeholders, `{key}`, read from the Form's values when the picker opens
   * (`resolvePhiMediaFolderPathTemplate`, `components/media/media-folder-name-path.ts`): "Shop Images /
   * {category} / {product}". These are the names as written, placeholders unresolved.
   */
  folderPath: readonly string[];
};

const MEDIA_ASSET_FIELD_KINDS = [
  PhiMediaKind.Image,
  PhiMediaKind.Video,
  PhiMediaKind.Audio,
  PhiMediaKind.Pdf,
  PhiMediaKind.Markdown,
  PhiMediaKind.Font,
] as const satisfies readonly PhiMediaKindValue[];

/**
 * The field's config, read strictly (`strict-config-reader.ts`): a kind the picker does not list, a
 * `publicOnly` that is not a boolean, or a `folderPath` that is not a text or holds a brace that opens no
 * placeholder (`{}`, `{a`, `a}`, `{a{b}}`) is a `PhiConfigError` naming the field, never a default put in
 * its place -- a typo in `mediaType` would otherwise quietly offer another kind of file, and a broken
 * placeholder would become a Folder named after it.
 */
export function readPhiMediaAssetFieldConfig(
  config: Readonly<Record<string, unknown>> | undefined,
): PhiMediaAssetFieldConfig {
  const reader = createPhiConfigReader(config ?? {}, "config");
  return {
    ...readPhiMediaFieldTarget(reader),
    publicOnly: reader.boolean("publicOnly") ?? false,
  };
}

/**
 * What the `media-asset` and the `media-assets` field read alike: the kind the picker lists and the
 * upload takes (images where none is named), and the Folder path it opens on and uploads into, with its
 * placeholders unresolved -- by the same strict rules, so the two fields cannot read one setting two ways.
 */
export function readPhiMediaFieldTarget(
  reader: PhiConfigReader,
): Pick<PhiMediaAssetFieldConfig, "mediaType" | "folderPath"> {
  return {
    mediaType: reader.oneOf("mediaType", MEDIA_ASSET_FIELD_KINDS) ?? PhiMediaKind.Image,
    folderPath: splitPhiMediaFolderNamePath(reader.value(
      "folderPath",
      "a Folder path whose placeholders read {key}",
      (value) => typeof value === "string" && isPhiMediaFolderPathTemplate(value) ? value : undefined,
    )),
  };
}

/**
 * The Asset id a Form value holds, or `null`. A value that is not a positive whole number is not an id,
 * and showing it as one would put a request for Asset `NaN` on the wire.
 */
export function readPhiMediaAssetFieldValue(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** Whether the picker lets one Asset be chosen: always, unless the field offers public Assets only. */
export function isPhiMediaAssetFieldSelectable(
  config: PhiMediaAssetFieldConfig,
  asset: Pick<PhiMediaAssetTile, "deliveryPolicy" | "lifecycleStatus">,
) {
  return !config.publicOnly || isPhiMediaAssetPublic(asset.deliveryPolicy, asset.lifecycleStatus);
}

/**
 * Whether an Asset uploaded in the field's picker is one it lets be chosen, and if not, why: of the kind
 * the picker lists, and public where the field offers public Assets only. The same question a pick
 * answers, asked of what the upload made -- Core does not know the field's kind, and a file the browser
 * could not name reaches it unrefused.
 */
export function readPhiMediaAssetFieldUploadRefusal(
  config: PhiMediaAssetFieldConfig,
  asset: Pick<PhiMediaAssetTile, "kind" | "deliveryPolicy" | "lifecycleStatus">,
): "kind" | "notPublic" | null {
  if (asset.kind !== config.mediaType) return "kind";
  return isPhiMediaAssetFieldSelectable(config, asset) ? null : "notPublic";
}
