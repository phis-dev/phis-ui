import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * Where the links and pictures of a document fetched from GitHub lead: a link to the page GitHub shows,
 * a picture to the file's bytes, which is all an `<img>` can show.
 */

vi.mock("server-only", () => ({}));
const translate = vi.hoisted(() => vi.fn(async (...args: unknown[]) => args.find(Array.isArray) as string[]));
vi.mock("../../../server-helpers/translate", () => ({ trBulk: translate, trBulkForLocale: translate }));
vi.mock("../helpers/internal-reference-resolver.server", () => ({
  resolvePhiWidgetInternalReferences: async () => ({ pagePaths: new Map(), assetUrls: new Map(), assets: new Map() }),
}));

import { resolveMarkdownRenderData } from "./markdown-render";

const runtime = {
  site: { key: "site", publicUrl: "https://example.org" },
  locale: { current: "en" },
  area: "public",
  viewer: null,
} as unknown as Parameters<typeof resolveMarkdownRenderData>[1];

async function render(sourceUrl: string, markdown: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(markdown, { status: 200 })));
  const data = await resolveMarkdownRenderData({ sourceMode: "url", sourceUrl, translate: false }, runtime);
  if ("error" in data) throw new Error(data.error);
  return JSON.stringify(data.blocks);
}

afterEach(() => vi.unstubAllGlobals());

describe("addresses in a document fetched from GitHub", () => {
  const markdown = "See [the CLI](./CLI.md#site), [the packages](../debian/) and ![logo](./logo.svg).";

  it("sends a relative link to the page GitHub shows", async () => {
    const blocks = await render("https://github.com/owner/repo/blob/main/docs/INSTALL.md", markdown);
    expect(blocks).toContain('"href":"https://github.com/owner/repo/blob/main/docs/CLI.md#site"');
    expect(blocks).toContain('"href":"https://github.com/owner/repo/blob/main/debian/"');
  });

  it("reads a picture from the file's bytes", async () => {
    const blocks = await render("https://github.com/owner/repo/blob/main/docs/INSTALL.md", markdown);
    expect(blocks).toContain('"src":"https://raw.githubusercontent.com/owner/repo/main/docs/logo.svg"');
  });

  it("treats a raw address as the same document", async () => {
    const blocks = await render("https://raw.githubusercontent.com/owner/repo/main/docs/INSTALL.md", markdown);
    expect(blocks).toContain('"href":"https://github.com/owner/repo/blob/main/docs/CLI.md#site"');
  });

  it("resolves against any other host as it is", async () => {
    const blocks = await render("https://docs.example.net/guide/start.md", markdown);
    expect(blocks).toContain('"href":"https://docs.example.net/guide/CLI.md#site"');
  });
});
