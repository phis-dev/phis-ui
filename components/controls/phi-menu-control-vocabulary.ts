/*
 * The Menu Control's words, apart from the Control: a Widget's definition reads them on the server, and a
 * value imported from the Control would make Ant Design's Menu a dependency of every route.
 */

/**
 * How a horizontal menu marks the entry the reader is on: `underline` is a bar under it, `pill` a rounded
 * ground in the control height, `auto` the bar in light mode and the pill in dark mode. Ant Design itself
 * draws a bar in light mode and fills the whole height of the bar with the primary colour in dark mode.
 */
export const PHI_MENU_SELECTION_STYLES = ["auto", "underline", "pill"] as const;
export type PhiMenuSelectionStyle = (typeof PHI_MENU_SELECTION_STYLES)[number];
