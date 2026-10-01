import type { PhiRenderableBlockAnchor } from "../types";
import { isPhiRecord } from "./is-record";

/*
 * A block's anchor, read on its own because the client reads it for every block it draws: kept beside
 * the defaults merge and the serializers, it brought all of them into every page's scripts.
 */
export function normalizeRenderableBlockAnchor(
  value: unknown,
): PhiRenderableBlockAnchor | undefined {
  if (!isPhiRecord(value)) {
    return undefined;
  }

  const horizontal = value.horizontal;
  const vertical = value.vertical;

  if (
    horizontal !== "left" &&
    horizontal !== "center" &&
    horizontal !== "right" &&
    vertical !== "top" &&
    vertical !== "middle" &&
    vertical !== "bottom"
  ) {
    return undefined;
  }

  return {
    ...(horizontal === "left" || horizontal === "center" || horizontal === "right"
      ? { horizontal }
      : {}),
    ...(vertical === "top" || vertical === "middle" || vertical === "bottom"
      ? { vertical }
      : {}),
  };
}
