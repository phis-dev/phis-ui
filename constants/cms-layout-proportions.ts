/*
 * The proportions a Layout's columns can be set to: plain values, without imports, so a parser, a
 * Layout client and a geometry helper read them without pulling in the Layout registry.
 */

/*
 * What a balanced side of a Three Column Layout takes of the row, in percent; the middle takes the rest.
 * 33 is three equal columns (33 : 34 : 33). 25 is the default and is stored as absent: it is the 1 : 2 : 1
 * the Layout always had, so a row that states nothing reads as before.
 */
export const PHI_CMS_THREE_COLUMN_SIDE_SHARES = [10, 20, 25, 30, 33] as const;
export type PhiCmsThreeColumnSideShare = (typeof PHI_CMS_THREE_COLUMN_SIDE_SHARES)[number];
export const PHI_CMS_THREE_COLUMN_DEFAULT_SIDE_SHARE: PhiCmsThreeColumnSideShare = 25;

/*
 * The ratio a Split Card's two cards stand in. `golden` is the default and is stored as absent: it is the
 * ratio the Split Card always had. `50-50` has no larger card, so `swapRatio` has nothing to swap there.
 */
export const PHI_CMS_SPLIT_CARD_RATIOS = ["golden", "50-50", "20-80"] as const;
export type PhiCmsSplitCardRatio = (typeof PHI_CMS_SPLIT_CARD_RATIOS)[number];
export const PHI_CMS_SPLIT_CARD_DEFAULT_RATIO: PhiCmsSplitCardRatio = "golden";
