import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getResolvedSiteConfig, PHI_SITE_CONFIG_REFRESH_MS } from "./site-config";
import { clearPhiSiteReadCache, readPhiSiteReadCache } from "./site-read-cache";

let sequence = 0;

function configResponse(readMarker: string) {
  return Response.json({
    site: {
      key: "site",
      name: "Site",
      translationMarkers: { global: "g1", site: "s1" },
      readMarker,
    },
  });
}

/** Whether the read cache still holds `key`: a held entry answers without calling the loader. */
async function held(key: string) {
  const load = vi.fn(async () => "fresh");
  await readPhiSiteReadCache(key, load);
  return load.mock.calls.length === 0;
}

/*
 * A publish that passes through one Site process has to reach every other one. Each process refreshes its
 * config at most once per interval, however many renders it serves, and empties the rest of its read
 * cache when the config's read marker moved -- and only then.
 */
describe("getResolvedSiteConfig", () => {
  let siteKey: string;
  let options: { apiBaseUrl: string; internalToken: string; siteKey: string };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("NODE_ENV", "production");
    sequence += 1;
    siteKey = `site-${sequence}`;
    options = { apiBaseUrl: "http://phis.test", internalToken: "token", siteKey };
  });

  afterEach(() => {
    clearPhiSiteReadCache();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("asks Core at most once per refresh interval", async () => {
    const fetchMock = vi.fn(async () => configResponse("1"));
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([getResolvedSiteConfig(options), getResolvedSiteConfig(options)]);
    await getResolvedSiteConfig(options);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(PHI_SITE_CONFIG_REFRESH_MS + 1);
    await getResolvedSiteConfig(options);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("empties the rest of the read cache when the read marker moved, and keeps it while it did not", async () => {
    let readMarker = "1";
    vi.stubGlobal("fetch", vi.fn(async () => configResponse(readMarker)));
    const navigation = `site-nav:${siteKey}:probe`;

    await getResolvedSiteConfig(options);
    await readPhiSiteReadCache(navigation, async () => "published");

    vi.advanceTimersByTime(PHI_SITE_CONFIG_REFRESH_MS + 1);
    await getResolvedSiteConfig(options);
    expect(await held(navigation)).toBe(true);

    readMarker = "2";
    vi.advanceTimersByTime(PHI_SITE_CONFIG_REFRESH_MS + 1);
    const config = await getResolvedSiteConfig(options);
    expect(config.readMarker).toBe("2");
    expect(await held(navigation)).toBe(false);
  });
});
