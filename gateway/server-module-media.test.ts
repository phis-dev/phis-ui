import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getPhiModuleMediaMapping,
  parsePhiModuleMediaMapping,
  resetPhiModuleMediaUnavailableLog,
} from "./server-module-media";
import { clearPhiSiteReadCache } from "./site-read-cache";

const SERVER = { apiBaseUrl: "https://core.test", internalToken: "token", siteKey: "site" };

function answer(body: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

beforeEach(() => {
  resetPhiModuleMediaUnavailableLog();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearPhiSiteReadCache();
});

describe("parsePhiModuleMediaMapping", () => {
  it("takes a valid answer, and an empty one", () => {
    expect(parsePhiModuleMediaMapping({ assets: { "@a/b": { "icon-1": 5 } }, folders: { "@a/b": { shots: 2 } } }))
      .toEqual({ assets: { "@a/b": { "icon-1": 5 } }, folders: { "@a/b": { shots: 2 } } });
    expect(parsePhiModuleMediaMapping({ assets: {}, folders: {} })).toEqual({ assets: {}, folders: {} });
  });

  it.each([
    null,
    {},
    { assets: {} },
    { assets: [], folders: {} },
    { assets: { "not-a-package": { a: 1 } }, folders: {} },
    { assets: { "@a/b": { "Bad Key": 1 } }, folders: {} },
    { assets: { "@a/b": { a: 0 } }, folders: {} },
    { assets: { "@a/b": { a: 1.5 } }, folders: {} },
    { assets: { "@a/b": { a: "1" } }, folders: {} },
    { assets: {}, folders: { "@a/b": [] } },
  ])("refuses a malformed answer %#", (value) => {
    expect(() => parsePhiModuleMediaMapping(value)).toThrow(/module media/);
  });
});

describe("getPhiModuleMediaMapping", () => {
  it("is asked for once while it is kept", async () => {
    const fetchMock = answer({ assets: { "@a/b": { icon: 1 } }, folders: {} });
    vi.stubGlobal("fetch", fetchMock);
    await getPhiModuleMediaMapping(SERVER);
    await getPhiModuleMediaMapping(SERVER);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("answers the empty mapping and logs once when Core has no route", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", answer({ error: "x" }, 404));
    expect(await getPhiModuleMediaMapping(SERVER)).toEqual({ assets: {}, folders: {} });
    clearPhiSiteReadCache();
    expect(await getPhiModuleMediaMapping(SERVER)).toEqual({ assets: {}, folders: {} });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("answers the empty mapping when Core is unreachable", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    expect(await getPhiModuleMediaMapping(SERVER)).toEqual({ assets: {}, folders: {} });
  });

  it("throws on a malformed 200 answer", async () => {
    vi.stubGlobal("fetch", answer({ assets: { "@a/b": { icon: -1 } }, folders: {} }));
    await expect(getPhiModuleMediaMapping(SERVER)).rejects.toThrow(/module media/);
  });
});
