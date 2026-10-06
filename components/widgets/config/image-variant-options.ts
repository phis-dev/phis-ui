import { PhiImageAssetVariantKey } from "../../../constants/media";

/** The renditions an Asset is offered in, for every field that picks one. */
export const PHI_IMAGE_VARIANT_OPTIONS = [
  { value: String(PhiImageAssetVariantKey.Thumbnail), label: "Thumbnail" },
  { value: String(PhiImageAssetVariantKey.Preview), label: "Preview" },
  { value: String(PhiImageAssetVariantKey.Banner), label: "Banner" },
  { value: String(PhiImageAssetVariantKey.Header), label: "Header" },
  { value: String(PhiImageAssetVariantKey.Card), label: "Card" },
  { value: String(PhiImageAssetVariantKey.Hero), label: "Hero" },
  { value: String(PhiImageAssetVariantKey.Avatar), label: "Avatar" },
  { value: String(PhiImageAssetVariantKey.Logo), label: "Logo" },
  { value: String(PhiImageAssetVariantKey.Landscape), label: "Landscape" },
  { value: String(PhiImageAssetVariantKey.Portrait), label: "Portrait" },
];
