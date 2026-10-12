import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchPhiPublicAuthManifest } from "./auth-public-manifest";
import { clearPhiSiteReadCache } from "./site-read-cache";

const SERVER = { apiBaseUrl: "https://core.test", internalToken: "token", siteKey: "site" };

function answerManifest() {
  return vi.fn(async () => new Response(
    JSON.stringify({ version: 1, registrationMode: "automatic", methods: [] }),
    { status: 200, headers: { "content-type": "application/json" } },
  ));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  clearPhiSiteReadCache();
});

/*
 * The manifest is the same for every visitor and a change to it moves the Site's read marker, so a Site
 * process keeps it in the read cache -- outside development, where a change has to show on reload.
 */
describe("the public auth manifest", () => {
  it("is asked for once per Site while it is kept", async () => {
    const fetchMock = answerManifest();
    vi.stubGlobal("fetch", fetchMock);

    await fetchPhiPublicAuthManifest(SERVER);
    await fetchPhiPublicAuthManifest(SERVER);
    await fetchPhiPublicAuthManifest({ ...SERVER, siteKey: "other" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("is asked for again once the read cache was emptied", async () => {
    const fetchMock = answerManifest();
    vi.stubGlobal("fetch", fetchMock);

    await fetchPhiPublicAuthManifest(SERVER);
    clearPhiSiteReadCache();
    await fetchPhiPublicAuthManifest(SERVER);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("is not kept in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const fetchMock = answerManifest();
    vi.stubGlobal("fetch", fetchMock);

    await fetchPhiPublicAuthManifest(SERVER);
    await fetchPhiPublicAuthManifest(SERVER);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
