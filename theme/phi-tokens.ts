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
  /*
   * The one measure off the sequence, and deliberately so.
   *
   * 55 is `PHI_CONTROL_HEIGHTS.lg` exactly, which is why a header that tall reads as one: it is a large
   * control's worth of height with nothing to spare around what actually stands in it -- a brand, a few
   * links, a switch, all of them medium. 34 is the next step down and is a medium control exactly,
   * flush against both edges. 44 is that control with 5 above and below, the sequence's own numbers on
   * either side of it.
   */
  headerHeight: 44,
  sidebarWidth: 233,
  /*
   * How wide a field holding a number is allowed to get.
   *
   * A number is a handful of characters and does not become more readable with room after it. In the
   * house label column a Control takes two thirds of the form, which is right for a sentence and
   * absurd for four digits: the figure sits at the left edge of a field stretching past the end of
   * the label above it.
   *
   * One step down the sequence from the sidebar's 233, because 233 was still a field a number sat in
   * the corner of. 144 holds five or six digits with a unit in front and the stepper beside them,
   * which is what the numbers in this house actually are -- a tracking in em, a pixel offset, a
   * count. A figure longer than that is rare enough to be the caller's business: `style` still wins,
   * because the ceiling is written first.
   *
   * A maximum and not a width. A number field still fills a column narrower than this -- in an
   * Inspector, a toolbar or a table cell nothing changes at all.
   */
  numberControlMax: 144,
  /*
   * How wide a column of content is allowed to get, in three steps of the same sequence.
   *
   * `narrow` is a single column of Controls without a label beside them -- a sign-in, a confirmation.
   * `contentMax` is the one a labelled form wants: the 24-track grid puts labels left of their
   * Controls, and at 377 a label column of 8 tracks leaves the Control too little to show what is in
   * it. `wide` is for what is read across rather than filled in, such as a table.
   *
   * They are maxima and not widths. A block still fills its slot; these only say where it stops.
   */
  contentMaxNarrow: 377,
  contentMax: 610,
  contentMaxWide: 987,
  heroHeight: 377,
} as const;
