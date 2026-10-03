import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveSiteInternalReferences } from "./internal-references";

const SERVER = { apiBaseUrl: "https://core.test", internalToken: "token", siteKey: "site" };

function asset(id: number) {
  return { id, deliveryUrl: `/media/${id}`, deliveryRevision: 1, contentType: "image/png", originalName: `${id}.png` };
}

function answerAssets() {
  return vi.fn(async (_url: string, init: { body: string }) => {
    const { assets } = JSON.parse(init.body) as { assets: number[] };
    return new Response(JSON.stringify({ resolved: [], assets: assets.map(asset) }), { status: 200 });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Every Image, Card and Video poster of a render asked the server on its own. Callers that ask in the
 * same turn now share one request, and each still receives only what it asked for.
 */
describe("resolving internal references", () => {
  it("sends the Widgets of one turn as one request and hands each its own answer", async () => {
    const fetchMock = answerAssets();
    vi.stubGlobal("fetch", fetchMock);

    const [first, second, third] = await Promise.all([
      resolveSiteInternalReferences({ ...SERVER, assetIds: [1] }),
      resolveSiteInternalReferences({ ...SERVER, assetIds: [2, 3] }),
      resolveSiteInternalReferences({ ...SERVER, assetIds: [3] }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).assets).toEqual([1, 2, 3]);
    expect([...first.assets.keys()]).toEqual([1]);
    expect([...second.assets.keys()]).toEqual([2, 3]);
    expect([...third.assets.keys()]).toEqual([3]);
  });

  it("keeps another Site or Area in a request of its own", async () => {
    const fetchMock = answerAssets();
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([
      resolveSiteInternalReferences({ ...SERVER, assetIds: [1] }),
      resolveSiteInternalReferences({ ...SERVER, siteKey: "other", assetIds: [1] }),
      resolveSiteInternalReferences({ ...SERVER, area: "public", assetIds: [1] }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("starts a new request where the server's limit would be passed", async () => {
    const fetchMock = answerAssets();
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([
      resolveSiteInternalReferences({ ...SERVER, assetIds: Array.from({ length: 200 }, (_, index) => index + 1) }),
      resolveSiteInternalReferences({ ...SERVER, assetIds: Array.from({ length: 100 }, (_, index) => index + 1001) }),
    ]);

    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).assets.length)).toEqual([200, 100]);
  });

  it("asks nothing when nothing is named", async () => {
    const fetchMock = answerAssets();
    vi.stubGlobal("fetch", fetchMock);
    expect((await resolveSiteInternalReferences({ ...SERVER })).assets.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
