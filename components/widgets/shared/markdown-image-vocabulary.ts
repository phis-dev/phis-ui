/*
 * How a Markdown text sets its pictures, apart from the Widget's Client half: the render on the server and
 * the Widget's definition read these, and a value imported from the Client file would make it a client
 * reference of every route.
 *
 * Two places say it, and the nearer one wins. The Widget states what every picture in its text does -- the
 * Inspector's "Image proportion" and "Image Float" -- and a picture that needs something else says so in its
 * own address, after the Asset: `![Server](phis:asset/12?ratio=16:9&float=none)`. The address stays a
 * `phis:asset/<id>` reference for everything that reads one (the server's reference index finds the id at
 * its start), and it is plain Markdown, so a translation carries it through untouched.
 */

import { PHI_GOLDEN_RATIO } from "../../../theme/phi-tokens";

/**
 * How tall a picture stands, as a proportion of its width. `auto` is the picture's own proportion -- a text
 * shows what was put in it; a step crops into that box around the picture's focal rectangle. `phi` is the
 * golden rectangle, φ : 1 (`PHI_GOLDEN_RATIO`), between 3:2 and 16:9.
 */
export const PHI_MARKDOWN_IMAGE_ASPECT_RATIOS = ["auto", "phi", "3:2", "4:3", "16:9", "2:1", "1:1"] as const;
export type PhiMarkdownImageAspectRatio = (typeof PHI_MARKDOWN_IMAGE_ASPECT_RATIOS)[number];

/** Where a picture stands: at an edge with the text flowing past it, or on a line of its own (`none`). */
export const PHI_MARKDOWN_FIGURE_FLOATS = ["start", "end", "none"] as const;
export type PhiMarkdownFigureFloat = (typeof PHI_MARKDOWN_FIGURE_FLOATS)[number];

export function readPhiMarkdownImageAspectRatio(value: unknown): PhiMarkdownImageAspectRatio | undefined {
  return PHI_MARKDOWN_IMAGE_ASPECT_RATIOS.find((ratio) => ratio === value);
}

export function readPhiMarkdownFigureFloat(value: unknown): PhiMarkdownFigureFloat | undefined {
  return PHI_MARKDOWN_FIGURE_FLOATS.find((float) => float === value);
}

/** A step as a number, width over height; `auto` has none -- the picture decides. */
export function resolvePhiMarkdownImageAspectRatioValue(ratio: PhiMarkdownImageAspectRatio | undefined): number | null {
  if (ratio == null || ratio === "auto") return null;
  if (ratio === "phi") return PHI_GOLDEN_RATIO;
  const [width, height] = ratio.split(":").map(Number);
  return width! / height!;
}

/** A step as CSS writes it (`16 / 9`); `auto` has none. */
export function resolvePhiMarkdownImageAspectRatioCss(ratio: PhiMarkdownImageAspectRatio | undefined): string | null {
  const value = resolvePhiMarkdownImageAspectRatioValue(ratio);
  if (value == null) return null;
  return ratio === "phi" ? `${PHI_GOLDEN_RATIO.toFixed(6)} / 1` : ratio!.replace(":", " / ");
}

/**
 * A picture's address read apart: the reference, and what the picture says for itself. Only `ratio` and
 * `float` are read; anything else after the `?` is left out of the reference and ignored, so an address a
 * later release learns more words for still names its Asset today.
 */
export function readPhiMarkdownImageAddress(url: string): {
  reference: string;
  aspectRatio?: PhiMarkdownImageAspectRatio;
  float?: PhiMarkdownFigureFloat;
} {
  const question = url.indexOf("?");
  if (question < 0) return { reference: url };
  const params = new URLSearchParams(url.slice(question + 1));
  const aspectRatio = readPhiMarkdownImageAspectRatio(params.get("ratio"));
  const float = readPhiMarkdownFigureFloat(params.get("float"));
  return {
    reference: url.slice(0, question),
    ...(aspectRatio ? { aspectRatio } : {}),
    ...(float ? { float } : {}),
  };
}

/**
 * How wide a picture is drawn, for the image optimiser: beside the text its golden share of the column
 * (`styles/controls.css`, about 0.38 of a reading column of at most 1120 px), on a line of its own the
 * reading column's.
 */
export function resolvePhiMarkdownFigureSizes(float: PhiMarkdownFigureFloat) {
  return float === "none" ? "(max-width: 768px) 100vw, 1120px" : "(max-width: 560px) 100vw, 440px";
}
