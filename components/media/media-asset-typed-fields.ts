import { readPhiFontMetricsFields } from "./media-font-metrics";
import { requirePhiField, type PhiConfigReader } from "../widgets/config/strict-config-reader";
import type { PhiFontMetrics } from "../../types/media";
import type { MediaFocalRect } from "./focal-rect";

/**
 * The entries of an Asset's stored `meta` a client acts on, as the server sends them: typed fields, never
 * `meta` itself. One reader for every response that carries them -- the management tile and detail as much
 * as the public reference projection -- so the three cannot disagree about what a focal rectangle is.
 */
export function readPhiMediaFocalRectField(reader: PhiConfigReader): MediaFocalRect | null {
  return reader.object("focalRect", (rect) => {
    const fraction = (key: string) => {
      const value = requirePhiField(rect, key, "a number from 0 to 1", rect.number);
      return value >= 0 && value <= 1 ? value : rect.fail(key, "a number from 0 to 1");
    };
    return { x: fraction("x"), y: fraction("y"), width: fraction("width"), height: fraction("height") };
  }) ?? null;
}

export function readPhiMediaFontField(reader: PhiConfigReader): PhiFontMetrics | null {
  return reader.object("font", readPhiFontMetricsFields) ?? null;
}
