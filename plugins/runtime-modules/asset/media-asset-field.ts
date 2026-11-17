import { PhiMediaKind, isPhiMediaAssetPublic } from "../../../constants/media";
import type { PhiMediaAssetTile, PhiMediaKindValue } from "../../../types/media";
import { createPhiConfigReader } from "../../../components/widgets/config/strict-config-reader";

/*
 * The `media-asset` field: one Asset of the Site's Media library, chosen with the library's picker.
 *
 * The value is the Asset id as a number, `null` for none -- so `required` means "an Asset", and a save
 * that clears the field says so. Only the Site Space is ever offered (`FORMS.md`).
 */

export type PhiMediaAssetFieldConfig = {
  /** Which kind of Asset the picker lists. */
  mediaType: PhiMediaKindValue;
  /** Whether Assets that are not delivered publicly are greyed out in the picker. */
  publicOnly: boolean;
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
 * The field's config, read strictly (`strict-config-reader.ts`): a kind the picker does not list, or a
 * `publicOnly` that is not a boolean, is a `PhiConfigError` naming the field, never a default put in its
 * place -- a typo in `mediaType` would otherwise quietly offer another kind of file.
 */
export function readPhiMediaAssetFieldConfig(
  config: Readonly<Record<string, unknown>> | undefined,
): PhiMediaAssetFieldConfig {
  const reader = createPhiConfigReader(config ?? {}, "config");
  return {
    mediaType: reader.oneOf("mediaType", MEDIA_ASSET_FIELD_KINDS) ?? PhiMediaKind.Image,
    publicOnly: reader.boolean("publicOnly") ?? false,
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
