import type { PhiSurfaceGroundFrame } from "../surface/phi-surface-ground";
import {
  PHI_CMS_SPLIT_CARD_DEFAULT_RATIO,
  type PhiCmsSplitCardRatio,
} from "../../constants/cms-layout-proportions";

/*
 * The Split Card's geometry, apart from its Client half: the Layout renders on the server and reads the
 * ratio for its columns, and a value imported from a Client file arrives there as a client reference.
 */

/**
 * Each ratio in units of the smaller card: how many the larger is, and both together -- written out, so
 * the CSS carries no float residue. φ: the larger card is φ times as wide as the smaller. 50/50 has no
 * larger card, so swapping it changes nothing.
 */
const PHI_SPLIT_CARD_RATIO_SHARES: Record<PhiCmsSplitCardRatio, { larger: string; total: string }> = {
  golden: { larger: "1.61803398875", total: "2.61803398875" },
  "50-50": { larger: "1", total: "2" },
  "20-80": { larger: "4", total: "5" },
};

/** The left and the right card's share, in units of the smaller one. */
function resolvePhiSplitCardShares(ratio: PhiCmsSplitCardRatio, swapped: boolean) {
  const { larger, total } = PHI_SPLIT_CARD_RATIO_SHARES[ratio];
  return { left: swapped ? larger : "1", right: swapped ? "1" : larger, total };
}

/**
 * Where one card's part of the shared Background lies, measured against the card.
 *
 * The Background runs once across both cards, so each card shows the piece of it that lies behind it:
 * the paint is as wide as the Split Card's content box (`100cqw`, the Split Card being the query
 * container) and moved left by the card's own offset. The left card's offset is nothing; the right
 * card's is the left card's width and the gap, and the left card's width is fixed by the columns
 * (`resolvePhiSplitCardColumns`): what the gap leaves, shared in the ratio -- 1 to φ, or φ to 1 when
 * swapped. The
 * height needs nothing: both cards are stretched to the row, which is the content box's height.
 */
export function resolvePhiSplitCardGroundFrame(
  side: "left" | "right",
  gap: string,
  swapped = false,
  ratio: PhiCmsSplitCardRatio = PHI_CMS_SPLIT_CARD_DEFAULT_RATIO,
): PhiSurfaceGroundFrame {
  const shares = resolvePhiSplitCardShares(ratio, swapped);
  const leftShare = shares.left === "1" ? "" : ` * ${shares.left}`;
  const leftWidth = `((100cqw - ${gap})${leftShare} / ${shares.total})`;
  /*
   * Stacked (`styles/layout.css`), each card shows the whole Background on its own: the cards no longer
   * share a row, and the height the lower card's piece would start at is not something CSS knows.
   */
  return {
    left: `var(--phi-split-card-ground-left, ${side === "left" ? "0px" : `calc(-1 * (${leftWidth} + ${gap}))`})`,
    width: "var(--phi-split-card-ground-width, 100cqw)",
  };
}


/**
 * The two columns: the smaller card left and the larger right, or the other way round when swapped. In
 * `fr`, so the gap comes out of the row first and the rest is shared in the ratio.
 */
export function resolvePhiSplitCardColumns(
  swapped = false,
  ratio: PhiCmsSplitCardRatio = PHI_CMS_SPLIT_CARD_DEFAULT_RATIO,
) {
  const shares = resolvePhiSplitCardShares(ratio, swapped);
  return `minmax(0, ${shares.left}fr) minmax(0, ${shares.right}fr)`;
}
