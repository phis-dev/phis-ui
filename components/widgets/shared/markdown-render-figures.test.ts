import { describe, expect, it, vi } from "vitest";

/*
 * A Media picture standing on its own in the text becomes a figure, drawn by the picture Control; the
 * Widget states what every one does, and a picture's own address overrides it.
 */

vi.mock("server-only", () => ({}));
const translate = vi.hoisted(() => vi.fn(async (...args: unknown[]) => args.find(Array.isArray) as string[]));
vi.mock("../../../server-helpers/translate", () => ({ trBulk: translate, trBulkForLocale: translate }));
const asset = {
  id: 12,
  deliveryUrl: "/api/site/media/12/content?r=1",
  deliveryRevision: 1,
  variantVersion: 0,
  contentType: "image/jpeg",
  kind: 1,
  originalName: "rack.jpg",
  width: 1920,
  height: 1280,
  blurDataUrl: "data:image/png;base64,AA==",
  title: null,
  altText: "Server rack",
  thumbnailUrl: null,
  previewUrl: null,
  focalRect: null,
  font: null,
};
vi.mock("../helpers/internal-reference-resolver.server", () => ({
  resolvePhiWidgetInternalReferences: async () => ({
    pagePaths: new Map(),
    assetUrls: new Map([[12, asset.deliveryUrl]]),
    assets: new Map([[12, asset]]),
  }),
}));

import { resolveMarkdownRenderData, type PhiMarkdownSourceConfig } from "./markdown-render";

const runtime = {
  site: { key: "site", publicUrl: "https://example.org" },
  locale: { current: "en" },
  area: "public",
  viewer: null,
} as unknown as Parameters<typeof resolveMarkdownRenderData>[1];

async function blocksOf(markdown: string, config: Partial<PhiMarkdownSourceConfig> = {}) {
  const data = await resolveMarkdownRenderData({ sourceMode: "inline", markdown, translate: false, ...config }, runtime);
  if ("error" in data) throw new Error(data.error);
  return data.blocks;
}

describe("Media pictures in Markdown", () => {
  it("makes a picture standing on its own a figure with the Asset's own proportion", async () => {
    const [block] = await blocksOf("![](phis:asset/12)\n\nText.");
    expect(block?.kind).toBe("image");
    if (block?.kind !== "image") return;
    expect(block.image).toMatchObject({ alt: "Server rack", aspectRatio: null, float: "none", optimizable: true });
    expect(block.image.presentation.width).toBe(1920);
  });

  it("takes the Widget's proportion and float for every picture", async () => {
    const [block] = await blocksOf("![Rack](phis:asset/12)", { imageAspectRatio: "3:2", imageFloat: "end" });
    expect(block).toMatchObject({ kind: "image", image: { alt: "Rack", aspectRatio: "3 / 2", float: "end" } });
  });

  it("lets a picture's own address override the Widget, one picture at a time", async () => {
    const blocks = await blocksOf(
      "![a](phis:asset/12?ratio=16:9&float=none)\n\n![b](phis:asset/12)",
      { imageAspectRatio: "3:2", imageFloat: "end" },
    );
    expect(blocks.map((block) => block.kind === "image" ? [block.image.alt, block.image.aspectRatio, block.image.float] : null))
      .toEqual([["a", "16 / 9", "none"], ["b", "3 / 2", "end"]]);
  });

  it("crops to the golden rectangle under phi", async () => {
    const [block] = await blocksOf("![](phis:asset/12?ratio=phi)");
    expect(block).toMatchObject({ kind: "image", image: { aspectRatio: "1.618034 / 1" } });
  });

  it("leaves a picture inside a sentence inline", async () => {
    const [block] = await blocksOf("Before ![rack](phis:asset/12) after.");
    expect(block?.kind).toBe("paragraph");
  });
});
