import { PhiMediaDeliveryPolicy, PhiMediaKind, PhiMediaLifecycleStatus } from "../../../constants/media";
import type { PhiMediaCollectionItem } from "../../../types/media";
import { createPhiConfigReader } from "../../../components/widgets/config/strict-config-reader";
import { PHI_MEDIA_ASSETS_FIELD_MOST } from "./form-providers";
import { readPhiMediaAssetFieldValue, readPhiMediaFieldTarget, type PhiMediaAssetFieldConfig } from "./media-asset-field";
import type { PhiAddonMediaLimits } from "../../../types/server-capabilities";

/*
 * The `media-assets` field: several Assets of the Site's Media library, as an ordered list of their ids --
 * the many-picture counterpart of `media-asset`, for a record that has several (a product's gallery).
 *
 * The value is the ids in the order shown, `[]` for none: a save that removes every picture says so, and
 * `required` means "at least one" (Ant Design's required rule refuses an empty list). Like `media-asset`
 * it offers the Site Space only, and an upload goes there too.
 */

export type PhiMediaAssetsFieldConfig = Pick<PhiMediaAssetFieldConfig, "mediaType" | "folderPath"> & {
  /**
   * The most Assets the value may hold, from 1 to `PHI_MEDIA_ASSETS_FIELD_MOST` (the default): the field
   * offers no more choosing or uploading once it is full, and a value beyond it holds the Form's submit.
   */
  max: number;
};

/**
 * The field's config, read strictly as `media-asset`'s is (`readPhiMediaFieldTarget`): a kind the picker
 * does not list, a broken placeholder in `folderPath`, or a `max` that is not a whole number from 1 to
 * `PHI_MEDIA_ASSETS_FIELD_MOST` is a `PhiConfigError` naming the field, never a default in its place.
 */
export function readPhiMediaAssetsFieldConfig(
  config: Readonly<Record<string, unknown>> | undefined,
): PhiMediaAssetsFieldConfig {
  const reader = createPhiConfigReader(config ?? {}, "config");
  return {
    ...readPhiMediaFieldTarget(reader),
    max: reader.value(
      "max",
      `a whole number from 1 to ${PHI_MEDIA_ASSETS_FIELD_MOST}`,
      (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= PHI_MEDIA_ASSETS_FIELD_MOST
        ? value
        : undefined,
    ) ?? PHI_MEDIA_ASSETS_FIELD_MOST,
  };
}

/**
 * The field's config under the Media limits of the Add-on behind the Form: its own `max` stands where it
 * is lower than the Add-on's `maxPerField`, and the Add-on's where the field's would be higher -- a field
 * may hold fewer than the Add-on takes, never more. Everything that reads `max` (full, the refusal before
 * a file is sent, the hold on a value beyond it, the sentence that says so) then reads the one it may hold.
 */
export function limitPhiMediaAssetsFieldConfig(
  config: PhiMediaAssetsFieldConfig,
  limits: PhiAddonMediaLimits | undefined,
): PhiMediaAssetsFieldConfig {
  const most = limits?.maxPerField;
  return most != null && most < config.max ? { ...config, max: most } : config;
}

/**
 * The Asset ids a Form value holds, in its order: a list's entries that are Asset ids (positive whole
 * numbers, as `media-asset` reads its one), each once; anything that is not a list holds none.
 */
export function readPhiMediaAssetsFieldValue(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const ids: number[] = [];
  for (const entry of value) {
    const id = readPhiMediaAssetFieldValue(entry);
    if (id != null && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/**
 * The value with Assets added at its end: the ones it does not hold yet, while there is room under `max`.
 * Which ones did not fit is said apart, so the field can say why they are missing.
 */
export function addPhiMediaAssetsFieldIds(
  ids: readonly number[],
  added: readonly number[],
  max: number,
): { ids: number[]; refused: number[] } {
  const next = [...ids];
  const refused: number[] = [];
  for (const id of added) {
    if (next.includes(id)) continue;
    if (next.length >= max) refused.push(id);
    else next.push(id);
  }
  return { ids: next, refused };
}

/**
 * The tiles for the value, in the value's order and not the answer's: each id as the library answered
 * it, and an id it did not answer (released, or out of the reader's reach) as an unavailable tile --
 * named `unavailableName`, of no kind the tile would load a picture for -- which can still be removed.
 */
export function orderPhiMediaAssetsFieldTiles(
  ids: readonly number[],
  answered: ReadonlyMap<number, PhiMediaCollectionItem>,
  unavailableName: string,
): { tile: PhiMediaCollectionItem; available: boolean }[] {
  return ids.map((id) => {
    const tile = answered.get(id);
    return tile ? { tile, available: true } : { tile: buildUnavailableTile(id, unavailableName), available: false };
  });
}

function buildUnavailableTile(id: number, name: string): PhiMediaCollectionItem {
  return {
    id,
    // `other` draws the kind's icon: an image tile would ask the optimiser for a picture that is not there.
    kind: PhiMediaKind.Other,
    originalName: name,
    title: null,
    altText: null,
    contentType: "application/octet-stream",
    deliveryUrl: "",
    thumbnailUrl: null,
    previewUrl: null,
    blurDataUrl: null,
    // Public and ready, so the tile shows the kind's icon rather than the restricted one.
    deliveryPolicy: PhiMediaDeliveryPolicy.Public,
    lifecycleStatus: PhiMediaLifecycleStatus.Ready,
    width: null,
    height: null,
  };
}
