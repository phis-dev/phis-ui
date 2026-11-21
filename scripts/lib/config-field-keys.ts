// Why this file exists: which config keys an Inspector field writes was worked out in
// validate-core-widget-placements.ts, and validate-widget-config-reads.ts asks the same question of every
// Widget. A composite field (padding, radius, image, a two-key dimension) writes other keys than its own,
// and any field may patch more on change; both validators have to see the same set.
import type { PhiCmsConfigField } from "../../types/cms-plugins";

/** Every config path the field writes: its own key or the keys it writes instead, and what it patches. */
export function writtenConfigPaths(field: PhiCmsConfigField): string[] {
  const patched = [
    ...("patchOnChange" in field && field.patchOnChange ? Object.keys(field.patchOnChange) : []),
    ...("optionPresets" in field && field.optionPresets
      ? [...field.optionPresets.locks, ...(field.optionPresets.prefills ?? [])]
      : []),
  ];
  if (field.type === "radius") {
    return [field.topLeftKey, field.topRightKey, field.bottomLeftKey, field.bottomRightKey, ...patched];
  }
  if (field.type === "padding") {
    const keys = [
      field.paddingKey,
      field.gapKey,
      field.paddingTopKey,
      field.paddingRightKey,
      field.paddingBottomKey,
      field.paddingLeftKey,
    ].filter((key): key is string => key !== undefined);
    return [...(keys.length > 0 ? keys : [field.key]), ...patched];
  }
  if (field.type === "image") {
    return ["sourceKind", "assetId", "variantKey", "variantVersion", "sourceUrl", "alt", ...patched];
  }
  if (field.type === "dimension" && (field.widthKey || field.heightKey)) {
    const keys = [field.widthKey, field.heightKey].filter((key): key is string => key !== undefined);
    return [...keys, ...patched];
  }
  return [field.key, ...patched];
}
