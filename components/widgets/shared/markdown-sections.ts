import type { PhiMarkdownBlock, PhiMarkdownInline } from "./markdown-body-client";

/*
 * A Markdown text read as sections that fold (`foldSections` on the Markdown Widget): every heading of the
 * text's second level -- `##` as written, moved down with the text's `headingOffset` -- opens a section
 * that runs to the next heading of that level or above. What stands before the first one, and what follows
 * a heading above the level, stays open text. The FAQ case: a question is a `##`, its answer what follows.
 *
 * Pure, and apart from the Client half, because both halves read it: the Client draws the sections, the
 * server writes the same questions and answers as schema.org `FAQPage` data.
 */

/** Whether the text's sections fold, and how: each on its own, or one open at a time. */
export const PHI_MARKDOWN_FOLD_SECTIONS = ["none", "independent", "accordion"] as const;
export type PhiMarkdownFoldSections = (typeof PHI_MARKDOWN_FOLD_SECTIONS)[number];

export function readPhiMarkdownFoldSections(value: unknown): PhiMarkdownFoldSections | undefined {
  return PHI_MARKDOWN_FOLD_SECTIONS.find((mode) => mode === value);
}

type PhiMarkdownHeadingBlock = Extract<PhiMarkdownBlock, { kind: "heading" }>;

export type PhiMarkdownSection = { heading: PhiMarkdownHeadingBlock; blocks: PhiMarkdownBlock[] };

export type PhiMarkdownSegment =
  | { kind: "text"; blocks: PhiMarkdownBlock[] }
  | { kind: "sections"; sections: PhiMarkdownSection[] };

/** The level that folds: `##` as written, after the text's own offset; a heading never goes below 5. */
export function resolvePhiMarkdownFoldLevel(headingOffset: number | undefined) {
  return Math.min(5, 2 + Math.max(0, headingOffset ?? 0));
}

/** The text in order: open runs of blocks, and runs of sections that fold. */
export function splitPhiMarkdownSegments(blocks: readonly PhiMarkdownBlock[], level: number): PhiMarkdownSegment[] {
  const segments: PhiMarkdownSegment[] = [];
  let current: PhiMarkdownSection | null = null;
  const textRun = () => {
    const last = segments.at(-1);
    if (last?.kind === "text") return last.blocks;
    const run: PhiMarkdownBlock[] = [];
    segments.push({ kind: "text", blocks: run });
    return run;
  };
  for (const block of blocks) {
    if (block.kind === "heading" && block.level === level) {
      current = { heading: block, blocks: [] };
      const last = segments.at(-1);
      if (last?.kind === "sections") last.sections.push(current);
      else segments.push({ kind: "sections", sections: [current] });
      continue;
    }
    if (block.kind === "heading" && block.level < level) current = null;
    if (current) current.blocks.push(block);
    else textRun().push(block);
  }
  return segments;
}

/** The words of a run of inlines, as a reader would read them aloud; a protected address is left out. */
function readPhiMarkdownInlineText(inlines: readonly PhiMarkdownInline[]): string {
  return inlines.map((inline) => {
    switch (inline.kind) {
      case "text":
      case "inline_code":
        return inline.text;
      case "strong":
      case "emphasis":
      case "delete":
      case "link":
        return readPhiMarkdownInlineText(inline.children);
      case "image":
        return inline.alt;
      case "break":
        return "\n";
      default:
        return "";
    }
  }).join("");
}

function readPhiMarkdownBlockText(block: PhiMarkdownBlock): string {
  switch (block.kind) {
    case "heading":
    case "paragraph":
      return readPhiMarkdownInlineText(block.inlines);
    case "blockquote":
      return block.children.map(readPhiMarkdownBlockText).join("\n");
    case "list":
      return block.items.map((item) => item.map(readPhiMarkdownBlockText).join(" ")).join("\n");
    case "table":
      return [block.header, ...block.rows].map((cells) => cells.map(readPhiMarkdownInlineText).join(" | ")).join("\n");
    case "image":
      return block.image.alt;
    default:
      return "";
  }
}

/**
 * The folding sections as schema.org `FAQPage` data: each heading a question, what follows it the answer.
 * Absent when the text has no section with an answer -- an empty FAQ is not a claim worth making.
 */
export function buildPhiMarkdownFaqStructuredData(blocks: readonly PhiMarkdownBlock[], level: number) {
  const questions = splitPhiMarkdownSegments(blocks, level)
    .flatMap((segment) => segment.kind === "sections" ? segment.sections : [])
    .map((section) => ({
      name: readPhiMarkdownInlineText(section.heading.inlines).trim(),
      text: section.blocks.map(readPhiMarkdownBlockText).filter((line) => line.trim()).join("\n").trim(),
    }))
    .filter((entry) => entry.name && entry.text);
  if (questions.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((entry) => ({
      "@type": "Question",
      name: entry.name,
      acceptedAnswer: { "@type": "Answer", text: entry.text },
    })),
  };
}
