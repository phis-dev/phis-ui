import { PhiImageAssetVariantKey } from "../../../constants/media";
import type { PhiControlOption } from "../../controls/phi-control-options";

/** The renditions an Asset is offered in, for every field that picks one; stored as the number the key is. */
export const PHI_IMAGE_VARIANT_OPTIONS: PhiControlOption<number>[] = [
  { value: PhiImageAssetVariantKey.Thumbnail, label: "Thumbnail" },
  { value: PhiImageAssetVariantKey.Preview, label: "Preview" },
  { value: PhiImageAssetVariantKey.Banner, label: "Banner" },
  { value: PhiImageAssetVariantKey.Header, label: "Header" },
  { value: PhiImageAssetVariantKey.Card, label: "Card" },
  { value: PhiImageAssetVariantKey.Hero, label: "Hero" },
  { value: PhiImageAssetVariantKey.Avatar, label: "Avatar" },
  { value: PhiImageAssetVariantKey.Logo, label: "Logo" },
  { value: PhiImageAssetVariantKey.Landscape, label: "Landscape" },
  { value: PhiImageAssetVariantKey.Portrait, label: "Portrait" },
];
