import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchPhiSiteNews } from "./news";

const OPTIONS = {
  apiBaseUrl: "https://core.test",
  internalToken: "token",
  siteKey: "site",
  locale: "de",
};

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: "an-entry",
    slug: "an-entry",
    created: "2026-09-01T08:00:00.000Z",
    outdated: null,
    title: "An entry",
    subtitle: "Its subtitle",
    content: "Its text.",
    link: "/somewhere",
    tags: ["one", "two"],
    ...overrides,
  };
}

function newsResponse(news: unknown) {
  return Response.json({ version: "2026-09-01", site: "site", locale: "de", news });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPhiSiteNews", () => {
  it("asks Core in the page's language, with the Site key and the internal token", async () => {
    const fetchMock = vi.fn(async () => newsResponse([entry()]));
    vi.stubGlobal("fetch", fetchMock);

    const entries = await fetchPhiSiteNews(OPTIONS);

    expect(entries).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://core.test/api/v1/news");
    const headers = init.headers as Record<string, string>;
    expect(headers["accept-language"]).toBe("de");
    expect(headers["x-phis-site-key"]).toBe("site");
    expect(headers.Authorization).toBe("Bearer token");
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

    const entries = await fetchPhiSiteNews(OPTIONS);

    expect(entries.map((item) => item.slug)).toEqual(["intact"]);
  });

  it("keeps only the tags that are strings, and reads an absent link as none", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => newsResponse([
      entry({ tags: ["one", 2, null, "", "two"], link: null }),
    ])));

    const [first] = await fetchPhiSiteNews(OPTIONS);

    expect(first?.tags).toEqual(["one", "two"]);
    expect(first?.link).toBeNull();
  });

  it("throws when the answer carries no list, rather than reading it as empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ version: "1" })));

    await expect(fetchPhiSiteNews(OPTIONS)).rejects.toThrow(/without a list/);
  });

  it("throws when Core refuses, so the Widget can say so instead of drawing nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 503 })));

    await expect(fetchPhiSiteNews(OPTIONS)).rejects.toThrow(/503/);
  });

  it("refuses to ask without a Site key, which would read another Site's answer", async () => {
    const fetchMock = vi.fn(async () => newsResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPhiSiteNews({ ...OPTIONS, siteKey: "  " })).rejects.toThrow(/siteKey/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
