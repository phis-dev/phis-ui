import { describe, expect, it } from "vitest";

import type { PhiMarkdownBlock } from "./markdown-body-client";
import { buildPhiMarkdownFaqStructuredData, resolvePhiMarkdownFoldLevel, splitPhiMarkdownSegments } from "./markdown-sections";

const heading = (level: 1 | 2 | 3, text: string): PhiMarkdownBlock => ({ kind: "heading", id: text.toLowerCase().replace(/\W+/gu, "-"), level, inlines: [{ kind: "text", text }] });
const paragraph = (text: string): PhiMarkdownBlock => ({ kind: "paragraph", inlines: [{ kind: "text", text }] });

const faq: PhiMarkdownBlock[] = [
  heading(1, "FAQ"),
  paragraph("Intro."),
  heading(2, "Where are the servers?"),
  paragraph("In Germany."),
  heading(3, "Which ones?"),
  paragraph("Root servers."),
  heading(2, "Root access?"),
  { kind: "list", ordered: false, items: [[paragraph("No.")], [paragraph("Use the CMS.")]] },
  heading(1, "After"),
  paragraph("Open again."),
];

describe("Markdown sections that fold", () => {
  it("folds the text's ## headings, moved with its heading offset", () => {
    expect(resolvePhiMarkdownFoldLevel(undefined)).toBe(2);
    expect(resolvePhiMarkdownFoldLevel(1)).toBe(3);
    expect(resolvePhiMarkdownFoldLevel(9)).toBe(5);
  });

  it("keeps the text before, a deeper heading inside, and a higher heading after open", () => {
    const segments = splitPhiMarkdownSegments(faq, 2);
    expect(segments.map((segment) => segment.kind)).toEqual(["text", "sections", "text"]);
    const sections = segments[1]!.kind === "sections" ? segments[1]!.sections : [];
    expect(sections.map((section) => [section.heading.id, section.blocks.length])).toEqual([
      ["where-are-the-servers-", 3],
      ["root-access-", 1],
    ]);
  });

  it("states the sections as FAQPage questions and answers", () => {
    expect(buildPhiMarkdownFaqStructuredData(faq, 2)).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Where are the servers?", acceptedAnswer: { "@type": "Answer", text: "In Germany.\nWhich ones?\nRoot servers." } },
        { "@type": "Question", name: "Root access?", acceptedAnswer: { "@type": "Answer", text: "No.\nUse the CMS." } },
      ],
    });
    expect(buildPhiMarkdownFaqStructuredData([paragraph("No questions.")], 2)).toBeNull();
  });
});
