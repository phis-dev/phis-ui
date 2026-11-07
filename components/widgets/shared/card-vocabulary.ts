/*
 * The Card Widget's words, apart from its Client half: the Widget's definition is read on the server, and
 * a value imported from the Client file would make that file a client reference of every route.
 */

import { PhiImageAssetVariantKey } from "../../../constants/media";
import { PHI_GOLDEN_RATIO } from "../../../theme/phi-tokens";

/**
 * What fills a card between its eyebrow and its description.
 *
 * `text` is a heading. `stat` is a labelled figure: the label is the heading, so a card that counts
 * something says what it counted in the same place and type a text card says what it is about, and the
 * figure is drawn by the house's one statistic Control. `list` is a heading over a few lines the caller
 * draws and hands in (`listContent`), which only a Dashboard does today. `series` is a figure over time:
 * the headline as a `stat` draws it, over a chart the caller draws and hands in the same way -- a Dashboard
 * again, so the chart Control never loads with a Card on a Public page. `plan` is an offer: a price
 * and what it is paid per, a monthly and a yearly one of each, over a list of what the plan includes and
 * what it does not (`PhiBulletListEntry.state`). Several plan cards side by side are a Layout's row, and
 * the recommended one is the card that is `highlight`ed.
 *
 * The body is chosen, never inferred from whether a value happens to have arrived. A card that decided
 * by presence would draw as text and reflow into a statistic the moment its figure landed.
 */
export type PhiCardWidgetBody = "text" | "stat" | "list" | "series" | "plan";

/**
 * Which of a plan card's two prices it shows. A plan states one, the other, or both; one that states
 * only the monthly price shows it under `yearly` as well, so a period switch on the page never leaves a
 * card without a price. The page switches every plan at once by sending `billingPeriod`.
 */
export const PHI_CARD_BILLING_PERIODS = ["monthly", "yearly"] as const;
export type PhiCardBillingPeriod = (typeof PHI_CARD_BILLING_PERIODS)[number];

/** A sent period as one of the two; anything else is not a period and changes nothing. */
export function readPhiCardBillingPeriod(value: unknown): PhiCardBillingPeriod | undefined {
  return PHI_CARD_BILLING_PERIODS.includes(value as PhiCardBillingPeriod) ? value as PhiCardBillingPeriod : undefined;
}

/**
 * The tag of the card's heading, and the step it is drawn at.
 *
 * A card's heading is a heading in the page's outline, and which rung it stands on depends on the page
 * around it. `h3` is the default: a card usually stands under a section's `h2`. The level also sets the
 * size, a step up or down within the variant's scale -- a heading that changed rung and not size was a
 * setting nobody could see. A Theme that gives headings their own font reaches `h1` to `h3`; an `h4`
 * card keeps the body font.
 */
export const PHI_CARD_HEADING_LEVELS = ["h2", "h3", "h4"] as const;
export type PhiCardHeadingLevel = (typeof PHI_CARD_HEADING_LEVELS)[number];

/** Logical, so `start` is the left in a left-to-right page and the right in a right-to-left one. */
export const PHI_CARD_TEXT_ALIGNS = ["start", "center", "end", "justify"] as const;
export type PhiCardTextAlign = (typeof PHI_CARD_TEXT_ALIGNS)[number];

/**
 * How a card's badge is drawn. `corner` is a band flush in the top end corner, `tag` a rounded mark a
 * little down the end edge -- both inside the card. `ribbon` hangs over the end edge with a fold behind
 * it, and needs room beside the card. `none` draws nothing and keeps the words, to hide a badge for a
 * while. Absent is `none`: a card has a badge once a style is chosen for it.
 */
export const PHI_CARD_BADGE_STYLES = ["none", "corner", "tag", "ribbon"] as const;
export type PhiCardBadgeStyle = (typeof PHI_CARD_BADGE_STYLES)[number];

/**
 * Where the icon stands: before the heading, small, or at the top, large -- at the start, the middle or
 * the end of the line, over the picture when the card has one, on a ground of its own so it reads on any
 * picture. Logical like the text alignment: `top` is the left in a left-to-right page.
 */
export const PHI_CARD_ICON_PLACEMENTS = ["inline", "top", "top-center", "top-end"] as const;
export type PhiCardIconPlacement = (typeof PHI_CARD_ICON_PLACEMENTS)[number];

/**
 * How a card that leads somewhere answers the pointer; a card without a link has none. A list, so a
 * further effect is an entry and a rule in `styles/layout.css`, not another flag. `lift` raises the card, `zoom` enlarges its picture, `icon`
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

/**
 * How tall a card's picture stands, as a proportion of its width.
 *
 * `auto` is the proportion of the file the card shows. A Media picture that names no variant is shown as
 * the Media library's Card variant (3:2, cropped around the picture's focal rectangle), so cards side by
 * side stand at one height without anybody choosing one, and the browser gets a file sized for a card
 * rather than the original. A picture that names a variant shows that variant and its proportion; one
 * given by address, its own. `original` is the escape: the Media picture's original file, uncropped.
 *
 * `phi` is the golden rectangle, φ : 1 (`PHI_GOLDEN_RATIO`), between 3:2 and 16:9.
 *
 * A step crops whatever file the card shows into that box around the focal rectangle. 3:2 is the Card
 * variant's own proportion, so it keeps taking that file; every other step shows the original, which the
 * image optimiser scales to the card's width.
 */
export const PHI_CARD_MEDIA_ASPECT_RATIOS = ["auto", "original", "phi", "3:2", "4:3", "16:9", "2:1", "1:1"] as const;
export type PhiCardMediaAspectRatio = (typeof PHI_CARD_MEDIA_ASPECT_RATIOS)[number];


/** A step as a number, width over height; `auto` and `original` have none -- the file decides. */
export function resolvePhiCardMediaAspectRatioValue(ratio: PhiCardMediaAspectRatio | undefined): number | null {
  if (ratio == null || ratio === "auto" || ratio === "original") return null;
  if (ratio === "phi") return PHI_GOLDEN_RATIO;
  const [width, height] = ratio.split(":").map(Number);
  return width! / height!;
}

/** A step as CSS writes it (`3 / 2`); `auto` and `original` have none. */
export function resolvePhiCardMediaAspectRatioCss(ratio: PhiCardMediaAspectRatio | undefined): string | null {
  if (ratio == null || ratio === "auto" || ratio === "original") return null;
  return ratio === "phi" ? `${PHI_GOLDEN_RATIO.toFixed(6)} / 1` : ratio.replace(":", " / ");
}

/**
 * Which variant of a Media picture the card shows: the one the card names, else the Card variant where the
 * box is the Card variant's own proportion (`auto`, `3:2`), else the original.
 */
export function resolvePhiCardImageVariantKey({
  sourceKind,
  variantKey,
  mediaAspectRatio,
}: {
  sourceKind: string | undefined;
  variantKey: number | null | undefined;
  mediaAspectRatio: PhiCardMediaAspectRatio | undefined;
}): number | null {
  if (sourceKind !== "asset") return null;
  if (variantKey != null) return variantKey;
  return mediaAspectRatio == null || mediaAspectRatio === "auto" || mediaAspectRatio === "3:2"
    ? PhiImageAssetVariantKey.Card
    : null;
}

/**
 * How wide a card's picture is drawn, for the image optimiser: the window's width on a phone, where cards
 * stand one under the other, and at most half of it beside another card. Without it the optimiser takes
 * the file's own width -- a 1920 px original for a 350 px card.
 */
export const PHI_CARD_IMAGE_SIZES = "(max-width: 768px) 100vw, 50vw";

/**
 * The words a card shows, each in its own place; what an editor can put a field in, and what a signal can
 * write. `badge` is the band at the card's end edge, any body may carry one. The prices are figures like
 * `value` and are never translated: a price that differs by country is sent by a Controller or comes
 * from a Provider's row, not from a translator. The periods (`/ month`) are words and are.
 */
export const PHI_CARD_TEXT_SLOTS = [
  "eyebrow",
  "title",
  "description",
  "meta",
  "value",
  "badge",
  "price",
  "pricePeriod",
  "priceYearly",
  "pricePeriodYearly",
] as const;
export type PhiCardTextSlot = (typeof PHI_CARD_TEXT_SLOTS)[number];
