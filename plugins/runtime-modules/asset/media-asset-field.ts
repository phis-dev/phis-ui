import { PhiMediaKind, isPhiMediaAssetPublic } from "../../../constants/media";
import type { PhiMediaAssetTile, PhiMediaKindValue } from "../../../types/media";
import { createPhiConfigReader } from "../../../components/widgets/config/strict-config-reader";
import { splitPhiMediaFolderNamePath } from "../../../components/media/media-folder-name-path";
import { readPhiDotPath } from "../../../helpers/dot-path";

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
   * (`resolvePhiMediaAssetFieldFolderPath`): "Shop Images / {category} / {product}". These are the names
   * as written, placeholders unresolved.
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
    mediaType: reader.oneOf("mediaType", MEDIA_ASSET_FIELD_KINDS) ?? PhiMediaKind.Image,
    publicOnly: reader.boolean("publicOnly") ?? false,
    folderPath: splitPhiMediaFolderNamePath(reader.value(
      "folderPath",
      "a Folder path whose placeholders read {key}",
      (value) => typeof value === "string" && isPhiMediaAssetFolderPathTemplate(value) ? value : undefined,
    )),
  };
}

/* `{key}`: a Form value's key, a dotted path into it for a value that is a record. */
const PHI_MEDIA_ASSET_FOLDER_PATH_PLACEHOLDER = /\{([A-Za-z0-9_.-]+)\}/gu;

function isPhiMediaAssetFolderPathTemplate(value: string) {
  return !/[{}]/u.test(value.replace(PHI_MEDIA_ASSET_FOLDER_PATH_PLACEHOLDER, ""));
}

/*
 * A Form value as a Folder name: a text or a number, trimmed, and a `/` in it a `-`, so a value can name
 * a Folder but never add a level of them. Anything else -- empty, absent, a list, a record -- is no name.
 */
function readPhiMediaAssetFolderPathValue(value: unknown) {
  const text = typeof value === "string" ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
  return text.replace(/\//gu, "-").replace(/\s+/gu, " ").trim();
}

/**
 * The Folder path a `folderPath` names for the Form's values as they are now: each `{key}` the value
 * under `key` (the Form's current values, those loaded from its record included). A name whose
 * placeholder has no value is left out whole -- "Shop Images / {category} / {product}" without a
 * category is "Shop Images / <product>" -- and a name that comes out empty is left out too.
 */
export function resolvePhiMediaAssetFieldFolderPath(
  folderPath: readonly string[],
  values: Readonly<Record<string, unknown>>,
): string[] {
  return folderPath.flatMap((segment) => {
    let missing = false;
    const resolved = segment.replace(PHI_MEDIA_ASSET_FOLDER_PATH_PLACEHOLDER, (_placeholder, key: string) => {
      const value = readPhiMediaAssetFolderPathValue(readPhiDotPath(values, key));
      if (!value) missing = true;
      return value;
    }).replace(/\s+/gu, " ").trim();
    return missing || !resolved ? [] : [resolved];
  });
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
