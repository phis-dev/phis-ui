import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchPhiSiteContentEntries, fetchPhiSiteContentEntryPage } from "./content-entries";

const OPTIONS = {
  kind: "news" as const,
  apiBaseUrl: "https://core.test",
  internalToken: "token",
  siteKey: "site",
  locale: "de",
  limit: 10,
};

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: "an-entry",
    slug: "an-entry",
    created: "2026-09-01T08:00:00.000Z",
    outdated: null,
    sourceLocale: null,
    translate: true,
    title: "An entry",
    subtitle: "Its subtitle",
    content: "Its text.",
    link: { kind: "external", href: "https://example.com/somewhere" },
    category: null,
    tags: [{ slug: "one", label: "one" }, { slug: "two", label: "two" }],
    author: null,
    ...overrides,
  };
}

function newsResponse(entries: unknown) {
  return Response.json({ version: "2026-09-01", site: "site", locale: "de", kind: "news", entries });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPhiSiteContentEntries", () => {
  it("asks Core in the page's language, with the Site key and the internal token", async () => {
    const fetchMock = vi.fn(async () => newsResponse([entry()]));
    vi.stubGlobal("fetch", fetchMock);

    const entries = await fetchPhiSiteContentEntries(OPTIONS);

    expect(entries).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    // The cut travels to Core, which translates only what the page will show.
    expect(url).toBe("https://core.test/api/v1/entries/news?limit=10");
    // The Gateway's own headers, as every reader of Core sends them (gateway/site-api-request.ts).
    const headers = new Headers(init.headers);
    expect(headers.get("x-locale")).toBe("de");
    expect(headers.get("x-phis-site-key")).toBe("site");
    expect(headers.get("x-phis-token")).toBe("token");
  });

  it("refuses to ask without a count, rather than asking for everything", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchPhiSiteContentEntries({ ...OPTIONS, limit: 0 })).rejects.toThrow(/positive integer limit/);
    await expect(fetchPhiSiteContentEntries({ ...OPTIONS, limit: 2.5 })).rejects.toThrow(/positive integer limit/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /*
   * One broken entry is one entry's problem. Core is the only writer here, so a missing title means
   * something went wrong upstream -- and answering the page with nothing at all would turn that into
   * "this Site has no news", which is a different and wronger statement.
   */
  it("drops an entry with no title or no date and keeps the rest", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => newsResponse([
      entry({ slug: "no-title", title: "   " }),
      entry({ slug: "no-date", created: "" }),
      entry({ slug: "intact" }),
      "not an entry at all",
    ])));

    const entries = await fetchPhiSiteContentEntries(OPTIONS);

    expect(entries.map((item) => item.slug)).toEqual(["intact"]);
  });

  it("carries the language the entry was written in, and its switch", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => newsResponse([
      entry({ slug: "german", sourceLocale: "de" }),
      entry({ slug: "no-translation", translate: false }),
      entry({ slug: "plain" }),
    ])));

    const entries = await fetchPhiSiteContentEntries(OPTIONS);

    expect(entries.map((item) => [item.slug, item.sourceLocale, item.translate])).toEqual([
      ["german", "de", true],
      ["no-translation", null, false],
      // Nothing stated means the Site's own language, and yes.
      ["plain", null, true],
    ]);
  });

  it("keeps only the tags that are terms, and reads an absent or malformed link as none", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => newsResponse([
      entry({ tags: [{ slug: "one", label: "one" }, 2, null, "", { slug: "two", label: "two" }], link: "/a-typed-path" }),
    ])));

    const [first] = await fetchPhiSiteContentEntries(OPTIONS);

    expect(first?.tags).toEqual([{ slug: "one", label: "one" }, { slug: "two", label: "two" }]);
    expect(first?.link).toBeNull();
  });

  it("throws when the answer carries no list, rather than reading it as empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ version: "1" })));

    await expect(fetchPhiSiteContentEntries(OPTIONS)).rejects.toThrow(/without a list/);
  });

  it("throws when Core refuses, so the Widget can say so instead of drawing nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 503 })));

    await expect(fetchPhiSiteContentEntries(OPTIONS)).rejects.toThrow(/503/);
  });

  it("refuses to ask without a Site key, which would read another Site's answer", async () => {
    const fetchMock = vi.fn(async () => newsResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPhiSiteContentEntries({ ...OPTIONS, siteKey: "  " })).rejects.toThrow(/siteKey/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads a byline and terms, and drops what is not one", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => newsResponse([entry({
      category: { slug: "press", label: "Presse" },
      tags: [{ slug: "one", label: "eins" }, "two", { slug: "", label: "nothing" }],
      author: { name: "Ada", avatar: { url: "/api/site/media/4/variants/1" } },
    }), entry({ slug: "nameless", author: { name: "  ", avatar: null } })])));

    const [first, second] = await fetchPhiSiteContentEntries(OPTIONS);
    expect(first).toMatchObject({
      category: { slug: "press", label: "Presse" },
      tags: [{ slug: "one", label: "eins" }],
      author: { name: "Ada", avatar: { url: "/api/site/media/4/variants/1" } },
    });
    // No name is no byline: nothing is made up from what is left.
    expect(second?.author).toBeNull();
  });
});

describe("fetchPhiSiteContentEntryPage", () => {
  const { limit: _limit, ...BASE } = { ...OPTIONS, kind: "blog" as const };
  void _limit;

  it("asks for one entry at its address with its relatives, and answers none on 404", async () => {
    const fetchMock = vi.fn(async () => Response.json({
      entry: entry({ slug: "launch" }),
      related: [entry({ slug: "earlier" })],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const page = await fetchPhiSiteContentEntryPage({ ...BASE, slug: "launch", relatedLimit: 3 });
    expect(page?.entry.slug).toBe("launch");
    expect(page?.related?.map((item) => item.slug)).toEqual(["earlier"]);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://core.test/api/v1/entries/blog/launch?include=related&relatedLimit=3");

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "none" }, { status: 404 })));
    expect(await fetchPhiSiteContentEntryPage({ ...BASE, slug: "gone" })).toBeNull();
  });

  it("asks nothing for an empty address", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchPhiSiteContentEntryPage({ ...BASE, slug: "  " })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
