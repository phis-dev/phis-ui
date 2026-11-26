import { PhiImageAssetVariantKeyName } from "../../../constants/media";
import type { PhiImageAssetVariantKeyValue } from "../../../types/media";
import type { PhiControlOption } from "../../controls/phi-control-options";

/**
 * The name every variant the contracts know is shown by. Typed against the contracts' names, so a variant
 * added there without a name here fails the typecheck instead of being missing from every picker.
 */
const PHI_IMAGE_VARIANT_LABELS = {
  thumbnail: "Thumbnail",
  preview: "Preview",
  banner: "Banner",
  header: "Header",
  card: "Card",
  hero: "Hero",
  avatar: "Avatar",
  logo: "Logo",
  landscape: "Landscape",
  portrait: "Portrait",
  icon: "Icon",
  share: "Share",
} as const satisfies Record<(typeof PhiImageAssetVariantKeyName)[keyof typeof PhiImageAssetVariantKeyName], string>;

/**
 * The renditions an Asset is offered in, for every field that picks one; stored as the number the key is.
 * Built from the contracts' list, so every picker offers every variant the server renders.
 */
export const PHI_IMAGE_VARIANT_OPTIONS: PhiControlOption<number>[] = Object.entries(PhiImageAssetVariantKeyName).map(
  ([value, name]) => ({
    value: Number(value) as PhiImageAssetVariantKeyValue,
    label: PHI_IMAGE_VARIANT_LABELS[name as keyof typeof PHI_IMAGE_VARIANT_LABELS],
  }),
);
