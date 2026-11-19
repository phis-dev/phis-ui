/**
 * The golden ratio, φ = (1 + √5) / 2 ≈ 1.618: the step of the spacing scale below (each step the sum of
 * the two before it), the golden rectangle a picture may be cropped to, and how a picture shares a line
 * with text -- the text φ times as wide as the picture.
 */
export const PHI_GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

/**
 * The one spacing scale: the distance inside a frame and the distance between two things alike.
 *
 * Ant Design has two families for it, `padding*` and `margin*`, and its own components read both. Here
 * they are seeded from this one sequence and nothing sets them apart -- no Theme field, no stored Theme,
 * no block -- so a second scale only meant a second way to write the same distance, and the two were
 * mixed: a gap written on one scale was not recognized by the field that offered the other.
 */
export const PHI_PADDING = {
  xxs: 3,
  xs: 8,
  sm: 13,
  base: 21,
  md: 34,
  lg: 55,
  xl: 89,
  xxl: 144,
} as const;

/**
 * The type scale: one list for every size a Phi surface states.
 *
 * A ladder of phi from the body size 16 -- the browser's own, and what reading text on the web is set in.
 * `sm`, `lg`, `xxl` and `display` are the Fibonacci sizes around it (13, 21, 34, 55), `xl` is 16 x phi (26),
 * between 21 and 34 where their geometric mean falls, and `xs` keeps the 9 a counter or a superscript needs.
 * Every size is set rather than left to Ant Design's curve, which lands between the steps.
 *
 * `sm` to `xl` are handed to Ant Design as its tokens; `xs`, `xxl` and `display` have none and are read
 * from here, fixed until v1. The headings take their sizes from the same list: `h1` the page's title at
 * `xxl`, about twice the body, then `xl`, `lg`, and `h4` and `h5` at the body and `sm` sizes, set apart by
 * weight and colour. `display` is no heading level but a size, for a hero's or a landing's title, and is
 * not offered beside the others.
 */
export const PHI_FONT_SIZES = {
  xs: 9,
  sm: 13,
  base: 16,
  lg: 21,
  xl: 26,
  xxl: 34,
  display: 55,
  heading1: 34,
  heading2: 26,
  heading3: 21,
  heading4: 16,
  heading5: 13,
} as const;

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

/*
 * The Fibonacci row 21, 34, 55. A single-line field is as high as the Button of its size, so the small 21
 * is the height that carries the small text (13).
 */
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
   * it.
   *
   * They are maxima and not widths. A block still fills its slot; these only say where it stops.
   */
  contentMaxNarrow: 377,
  contentMax: 610,
  /*
   * How wide a Page is allowed to get: the column a catalogue, a landing or a Module's wide Page stands in.
   *
   * The Theme's to decide and not a constant: this is only the answer where a Theme says nothing, and a
   * Page reads it as `PHI_PAGE.max`, the Theme's own variable, never as this number -- a Theme that
   * widens its Pages then widens every one of them, an edited copy included.
   *
   * 987 + 233, off the sequence the way `readingMax` is. 987 itself is not a Page's width but the
   * threshold from which a Region counts as wide (`PHI_CONTAINER_BREAKPOINT_REGION`), and a Page has to
   * be able to get past it, which is why a Theme may not state less (`assertPhiThemeVocabulary`).
   */
  pageMax: 1220,
  /*
   * How far a Page's content stands in from the room it is given, by the screen it is drawn on: the
   * Shell's device bands on `phi-render-viewport` (styles/shell.css), a phone below 768, a tablet below
   * 1200, a desktop from there -- not the block profiles' 377 and 610, which measure room and would put
   * two phones of one class on opposite sides. Steps of the spacing scale, the same on all four sides:
   * `base` on every screen. A Site that wants more room states it in its Theme, as `pageMax` is the
   * Theme's: a Page reads it as `PHI_PAGE.padding`, and a Layout that states its own padding keeps it.
   */
  pagePadding: { phone: "base", tablet: "base", desktop: "base" },
  /*
   * The same inset in the signed-in Areas -- App and the staff Areas -- where a Page is a tool among the
   * Shell's navigation rather than a page to read: Public's step from a tablet on, a phone one below it.
   * The Theme's as well, read as `PHI_PAGE.signedInPadding`.
   */
  signedInPagePadding: { phone: "sm", tablet: "base", desktop: "base" },
  /*
   * How wide a column of prose is allowed to get: an article, an entry and what stands around it.
   *
   * Off the three steps above on purpose, because a text is measured in characters and not in Controls.
   * Twice `contentMaxNarrow`: with a frame's padding taken off it leaves a line of roughly seventy
   * characters at body size, which is where reading stops being comfortable. A maximum, like the others.
   */
  readingMax: 754,
  heroHeight: 377,
} as const;
