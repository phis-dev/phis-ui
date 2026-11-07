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

/**
 * How tall a picture stands, as a proportion of its width. `auto` is the picture's own proportion -- a text
 * shows what was put in it; a step crops into that box around the picture's focal rectangle.
 */
export const PHI_MARKDOWN_IMAGE_ASPECT_RATIOS = ["auto", "3:2", "4:3", "16:9", "2:1", "1:1"] as const;
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
  const [width, height] = ratio.split(":").map(Number);
  return width! / height!;
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
 * How wide a picture is drawn, for the image optimiser: beside the text at most the floated width
 * (`styles/controls.css`, `min(45%, 440px)`), on a line of its own the reading column's.
 */
export function resolvePhiMarkdownFigureSizes(float: PhiMarkdownFigureFloat) {
  return float === "none" ? "(max-width: 768px) 100vw, 1120px" : "(max-width: 560px) 100vw, 440px";
}
