import type { PhiSurfaceGroundFrame } from "../surface/phi-surface-ground";

/*
 * The Split Card's geometry, apart from its Client half: the Layout renders on the server and reads the
 * ratio for its columns, and a value imported from a Client file arrives there as a client reference.
 */

/** The golden ratio the two cards stand in: the right one is φ times as wide as the left. */
export const PHI_SPLIT_CARD_RATIO = 1.61803398875;

/** Both cards in units of the left one: 1 + φ, written out so the CSS carries no float residue. */
const PHI_SPLIT_CARD_SHARES = "2.61803398875";

/**
 * Where one card's part of the shared Background lies, measured against the card.
 *
 * The Background runs once across both cards, so each card shows the piece of it that lies behind it:
 * the paint is as wide as the Split Card's content box (`100cqw`, the Split Card being the query
 * container) and moved left by the card's own offset. The left card's offset is nothing; the right
 * card's is the left card's width and the gap, and the left card's width is fixed by the columns --
 * `minmax(0, 1fr) minmax(0, φfr)` share what the gap leaves by 1 to φ. The height needs nothing: both
 * cards are stretched to the row, which is the content box's height.
 */
export function resolvePhiSplitCardGroundFrame(side: "left" | "right", gap: string): PhiSurfaceGroundFrame {
  const leftWidth = `((100cqw - ${gap}) / ${PHI_SPLIT_CARD_SHARES})`;
  return {
    left: side === "left" ? "0px" : `calc(-1 * (${leftWidth} + ${gap}))`,
    width: "100cqw",
  };
}

