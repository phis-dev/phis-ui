/**
 * The widths a block may switch its own layout at.
 *
 * These are *content* thresholds: they answer "at what width does this stop fitting", and they are
 * measured on the block's own box -- by a container query or a `ResizeObserver` -- not on the window.
 * A form standing in a 480px dialog on a desk monitor is a narrow form, whatever the screen says.
 *
 * They are the house sequence, because a threshold on this scale is a threshold somebody chose. What
 * stood here before was three different answers: Ant Design's device numbers read as content
 * thresholds by the Grid, a hand-written pair in the Form's stylesheet, and this file with two.
 *
 * **They are not device bands.** 377 sits between a 375px phone and a 390px one, and 610 sits inside
 * the tablet range, so a threshold meant to tell a phone from a tablet has no number here and must not
 * be given one. The Shell's 768 and 1200 are that kind: they are written as container queries because
 * the Shell measures the render viewport, but what they mean is the device, and they carry
 * `viewportFlags` -- which decide whether a block exists at all, not how it is drawn. They stay where
 * they are, and `styles/shell.css` says so in place.
 *
 * Which pair a block picks is the block's own business, the way a component picks a spacing step. A
 * form's two columns stop fitting far earlier than a 24-track Grid's do, so they switch at different
 * widths off the same ruler.
 */
export const PHI_CONTAINER_BREAKPOINTS = [144, 233, 377, 610, 987] as const;

export type PhiContainerBreakpoint = (typeof PHI_CONTAINER_BREAKPOINTS)[number];

/** Two columns of anything need this much before one column stops being the better answer. */
export const PHI_CONTAINER_BREAKPOINT_COL2: PhiContainerBreakpoint = 144;

/** Three columns, and the width at which a label fits beside a control rather than over it. */
export const PHI_CONTAINER_BREAKPOINT_COL3: PhiContainerBreakpoint = 377;

/**
 * As wide as the house lets content get (`PHI_LAYOUT.contentMax`), so a block this wide is standing in
 * a full-width Region rather than in a content column.
 */
export const PHI_CONTAINER_BREAKPOINT_CONTENT: PhiContainerBreakpoint = 610;

/** The wide content maximum (`PHI_LAYOUT.contentMaxWide`): a Region running the width of the page. */
export const PHI_CONTAINER_BREAKPOINT_REGION: PhiContainerBreakpoint = 987;
