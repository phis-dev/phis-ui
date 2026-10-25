import { describe, expect, it, vi } from "vitest";

/*
 * Which pictures written into the text survive: an address on the web, and a data URL of an image type
 * -- the way a Module brings a drawing with its copy. Anything else is dropped, and a link never takes a
 * data URL, whatever it claims to be.
 */

vi.mock("server-only", () => ({}));
const translate = vi.hoisted(() => vi.fn(async (...args: unknown[]) => {
  const messages = args.find(Array.isArray) as string[];
  return messages;
}));
vi.mock("../../../server-helpers/translate", () => ({ trBulk: translate, trBulkForLocale: translate }));
vi.mock("../helpers/internal-reference-resolver.server", () => ({
  resolvePhiWidgetInternalReferences: async () => ({ pagePaths: new Map(), assetUrls: new Map() }),
}));

import { resolveMarkdownRenderData } from "./markdown-render";

const runtime = {
  site: { key: "site", publicUrl: "https://example.org" },
  locale: { current: "en" },
  area: "public",
  viewer: null,
} as unknown as Parameters<typeof resolveMarkdownRenderData>[1];

async function imagesOf(markdown: string) {
  const data = await resolveMarkdownRenderData({ sourceMode: "inline", markdown, translate: false }, runtime);
  if ("error" in data) throw new Error(data.error);
  return JSON.stringify(data.blocks).match(/"kind":"image","src":"[^"]*"/gu) ?? [];
}

describe("pictures in inline Markdown", () => {
  it("keeps an image data URL", async () => {
    expect(await imagesOf("![drawing](data:image/svg+xml,%3Csvg%3E%3C%2Fsvg%3E)")).toHaveLength(1);
  });

  it("drops a data URL that is not an image", async () => {
    expect(await imagesOf("![page](data:text/html,%3Cscript%3E%3C%2Fscript%3E)")).toHaveLength(0);
  });

  it("keeps a picture on the web", async () => {
    expect(await imagesOf("![photo](https://example.org/photo.png)")).toHaveLength(1);
  });

  it("never lets a link carry a data URL", async () => {
    const data = await resolveMarkdownRenderData({
      sourceMode: "inline",
      markdown: "[open](data:image/svg+xml,%3Csvg%3E%3C%2Fsvg%3E)",
      translate: false,
    }, runtime);
    expect(JSON.stringify(data)).not.toContain("data:image");
  });
});
