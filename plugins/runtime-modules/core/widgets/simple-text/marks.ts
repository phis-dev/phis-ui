import type { PhiSimpleTextMark } from "../../../../../types/core-widget-placements";

/*
 * Whether a Simple Text carries a mark. Apart from `config.ts` because the live client reads it on every
 * render, and the config module is the parser -- with the block defaults merge and its normalizers
 * behind it, which the client has no use for.
 */
export function hasPhiSimpleTextMark(
  config: { marks?: readonly PhiSimpleTextMark[] } | null | undefined,
  mark: PhiSimpleTextMark,
) {
  return config?.marks?.includes(mark) === true;
}
