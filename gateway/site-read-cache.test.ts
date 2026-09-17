import { afterEach, describe, expect, it, vi } from "vitest";

import { clearPhiSiteReadCache, PHI_SITE_READ_CACHE_TTL_MS, readPhiSiteReadCache } from "./site-read-cache";

describe("readPhiSiteReadCache", () => {
  afterEach(() => {
    clearPhiSiteReadCache();
    vi.useRealTimers();
  });

  it("loads once within the TTL and again after it", async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => "value");

    await readPhiSiteReadCache("key", load);
    await readPhiSiteReadCache("key", load);
    expect(load).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(PHI_SITE_READ_CACHE_TTL_MS + 1);
    await readPhiSiteReadCache("key", load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("loads again once cleared", async () => {
    const load = vi.fn(async () => "value");

    await readPhiSiteReadCache("key", load);
    clearPhiSiteReadCache();
    await readPhiSiteReadCache("key", load);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps an entry for the TTL it was read with", async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => "value");

    await readPhiSiteReadCache("key", load, 2_000);
    vi.advanceTimersByTime(1_999);
    await readPhiSiteReadCache("key", load, 2_000);
    expect(load).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await readPhiSiteReadCache("key", load, 2_000);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("spares the one entry a clear is asked to keep", async () => {
    const kept = vi.fn(async () => "kept");
    const other = vi.fn(async () => "other");

    await readPhiSiteReadCache("kept", kept);
    await readPhiSiteReadCache("other", other);
    clearPhiSiteReadCache({ keep: "kept" });
    await readPhiSiteReadCache("kept", kept);
    await readPhiSiteReadCache("other", other);

    expect(kept).toHaveBeenCalledTimes(1);
    expect(other).toHaveBeenCalledTimes(2);
  });

  it("does not keep a failed load", async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce("value");

    await expect(readPhiSiteReadCache("key", load)).rejects.toThrow("down");
    await expect(readPhiSiteReadCache("key", load)).resolves.toBe("value");
  });

  it("does not let a load started before a clear fill the cache", async () => {
    let resolveStale: (value: string) => void = () => {};
    const stale = readPhiSiteReadCache("key", () => new Promise<string>((resolve) => {
      resolveStale = resolve;
    }));
    clearPhiSiteReadCache();
    resolveStale("stale");
    await stale;

    await expect(readPhiSiteReadCache("key", async () => "fresh")).resolves.toBe("fresh");
  });
});
