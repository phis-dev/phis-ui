import {
  readPhiCssLengthPart,
  serializePhiCssLength,
  type PhiCssLength,
} from "../../../types/length";

export const PHI_HTML_IMAGE_MAX_DIMENSION = 10000;

export type PhiHtmlImageAttributes = {
  alt: string;
  title: string | null;
  width: PhiCssLength | null;
  height: PhiCssLength | null;
};

/**
 * A size in whole pixels is the `width`/`height` HTML attribute, which is what those attributes take;
 * every other unit is inline style, which the Widget sanitizer admits on `img` for exactly this.
 */
export function readPhiHtmlImageLength(value: unknown): PhiCssLength | null {
  const part = readPhiCssLengthPart(typeof value === "string" ? value.trim() : value);
  if (!part || !Number.isFinite(part.value) || part.value <= 0 || part.value > PHI_HTML_IMAGE_MAX_DIMENSION) {
    return null;
  }
  return serializePhiCssLength(part.unit === "px" ? Math.round(part.value) : part.value, part.unit);
}

export function readPhiHtmlImageTitle(value: unknown): string | null {
  const title = typeof value === "string" ? value.trim() : "";
  return title.length > 0 ? title : null;
}

/**
 * Splits one authored size into the two forms a persisted image may carry: the attribute for whole
 * pixels, the style declaration for every other unit.
 */
export function resolvePhiHtmlImageSizeForm(value: PhiCssLength | null) {
  const part = readPhiCssLengthPart(value);
  if (!part) {
    return { attribute: null, declaration: null } as const;
  }
  return part.unit === "px"
    ? { attribute: String(part.value), declaration: null } as const
    : { attribute: null, declaration: `${part.value}${part.unit}` } as const;
}
