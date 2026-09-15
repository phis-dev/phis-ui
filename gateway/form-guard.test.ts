import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchFormGuard } from "./form-guard";

describe("fetchFormGuard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("never caches the guard outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const fetchMock = vi.fn(async (_url: string | URL, _init?: RequestInit) => Response.json({ issuedAt: "1", formToken: "a".repeat(64) }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchFormGuard({
      apiBaseUrl: "http://phis.test",
      internalToken: "token",
      siteKey: "site",
      form: "contact",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as (RequestInit & { next?: unknown }) | undefined;
    expect(init?.cache).toBe("no-store");
    expect(init?.next).toBeUndefined();
  });
});
