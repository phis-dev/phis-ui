export const PHI_PADDING = {
  xxs: 3,
  xs: 8,
  sm: 13,
  base: 21,
  md: 34,
  lg: 55,
  xl: 89,
  xxl: 155,
} as const;

export const PHI_MARGIN = PHI_PADDING;

export const PHI_RADII = {
  xxs: 3,
  xs: 5,
  sm: 8,
  base: 13,
  md: 21,
  lg: 34,
  xl: 55,
  xxl: 89,
} as const;

export const PHI_CONTROL_HEIGHTS = {
  sm: 21,
  md: 34,
  lg: 55,
} as const;

/**
 * Layers for Authoring popups that portal to `document.body`.
 *
 * They have to clear the Builder scaffold overlays, which are page-level layers far below the adapter's
 * popup range. The ceiling matters as much as the floor: Ant Design stacks a nested popup by adding 100
 * to whatever layer it was given -- and it hands that layer to the trigger as well as to the popup -- then
 * warns once a Tooltip passes `zIndexPopupBase + 1100`, which is `2100` at the default base. A popover
 * pinned at `7000` put its own trigger Tooltip at `7100` and tripped that on every Rich Text Widget
 * insert, so an Authoring layer has to stay inside the range rather than escape upwards.
 *
 * `nested` is for a popup opened from inside another Authoring popup, such as a Select inside a toolbar
 * popover.
 */
export const PHI_Z_INDEX = {
  authoringPopup: 1700,
  authoringPopupNested: 1800,
} as const;

export const PHI_LAYOUT = {
  headerHeight: 55,
  sidebarWidth: 233,
  contentMaxNarrow: 144,
  contentMax: 233,
  contentMaxWide: 233,
  heroHeight: 377,
} as const;
