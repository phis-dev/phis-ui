import type { PhiSurface } from "../../../types/surface";

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

export const PHI_CARD_TEXT_ALIGNS = ["start", "center", "end"] as const;
export type PhiCardTextAlign = (typeof PHI_CARD_TEXT_ALIGNS)[number];

/**
 * Where the icon stands: before the heading, small, or at the top, large -- over the picture, when the
 * card has one, on a ground of its own so it reads on any picture.
 */
export const PHI_CARD_ICON_PLACEMENTS = ["inline", "top"] as const;
export type PhiCardIconPlacement = (typeof PHI_CARD_ICON_PLACEMENTS)[number];

/**
 * How a card that is a link answers the pointer. A list, so a further effect is an entry and a rule in
 * `styles/layout.css`, not another flag. Only a card that leads somewhere has one, and only under a
 * pointer that hovers and a reader who has not asked for less motion.
 */
export const PHI_CARD_HOVER_EFFECTS = ["none", "lift", "zoom"] as const;
export type PhiCardHoverEffect = (typeof PHI_CARD_HOVER_EFFECTS)[number];

/**
 * What a card looks like when nobody said: the Site's container ground, its line, the quiet shadow.
 * The Card Widget declares it as its block default; a card drawn from data -- a Collection's, a
 * Dashboard's -- takes it as well, so every card on a page is the same object.
 */
export const PHI_CARD_DEFAULT_SURFACE = {
  background: { base: { kind: "color", color: "var(--ant-color-bg-container)" } },
  borderSource: "theme",
  shadow: "soft",
} as const satisfies PhiSurface;

