/*
 * The Card Widget's words, apart from its Client half: the Widget's definition is read on the server, and
 * a value imported from the Client file would make that file a client reference of every route.
 */

/**
 * What fills a card between its eyebrow and its description.
 *
 * `text` is a heading. `stat` is a labelled figure: the label is the heading, so a card that counts
 * something says what it counted in the same place and type a text card says what it is about, and the
 * figure is drawn by the house's one statistic Control.
 *
 * The body is chosen, never inferred from whether a value happens to have arrived. A card that decided
 * by presence would draw as text and reflow into a statistic the moment its figure landed.
 */
export type PhiCardWidgetBody = "text" | "stat";

/**
 * The tag of the card's heading, apart from how large it is drawn.
 *
 * A card's heading is a heading in the page's outline, and which rung it stands on depends on the page
 * around it, not on how large the card is. `h3` is the default: a card usually stands under a section's
 * `h2`. A Theme that gives headings their own font reaches `h1` to `h3`; an `h4` card keeps the body font.
 */
export const PHI_CARD_HEADING_LEVELS = ["h2", "h3", "h4"] as const;
export type PhiCardHeadingLevel = (typeof PHI_CARD_HEADING_LEVELS)[number];

/** Logical, so `start` is the left in a left-to-right page and the right in a right-to-left one. */
export const PHI_CARD_TEXT_ALIGNS = ["start", "center", "end", "justify"] as const;
export type PhiCardTextAlign = (typeof PHI_CARD_TEXT_ALIGNS)[number];

/**
 * Where the icon stands: before the heading, small, or at the top, large -- at the start, the middle or
 * the end of the line, over the picture when the card has one, on a ground of its own so it reads on any
 * picture. Logical like the text alignment: `top` is the left in a left-to-right page.
 */
export const PHI_CARD_ICON_PLACEMENTS = ["inline", "top", "top-center", "top-end"] as const;
export type PhiCardIconPlacement = (typeof PHI_CARD_ICON_PLACEMENTS)[number];

/**
 * How a card answers the pointer. A list, so a further effect is an entry and a rule in
 * `styles/layout.css`, not another flag. `lift` raises the card, `zoom` enlarges its picture, `icon`
 * turns its icon's colours round. Only under a pointer that hovers, or keyboard focus within the card;
 * the movement only for a reader who has not asked for less motion.
 */
export const PHI_CARD_HOVER_EFFECTS = ["none", "lift", "zoom", "icon"] as const;
export type PhiCardHoverEffect = (typeof PHI_CARD_HOVER_EFFECTS)[number];

/**
 * The card's variants: how it is set rather than what it says -- insets, type sizes, the size of its
 * marks and its button, and where a variant is an arrangement as well, where its parts stand: `center`
 * puts the icon over the picture and the words and the button on the middle line. A list, so a further
 * variant is an entry here and a row in the client's table,
 * not another branch in every size the card draws. `default` is what a card without one is.
 */
export const PHI_CARD_VARIANTS = ["default", "compact", "center"] as const;
export type PhiCardVariant = (typeof PHI_CARD_VARIANTS)[number];

/** The words a card shows, each in its own place; what an editor can put a field in. */
export const PHI_CARD_TEXT_SLOTS = ["eyebrow", "title", "description", "meta", "value"] as const;
export type PhiCardTextSlot = (typeof PHI_CARD_TEXT_SLOTS)[number];
