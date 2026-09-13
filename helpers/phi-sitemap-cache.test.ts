import { describe, expect, it, vi } from "vitest";

import { createPhiFingerprintCache } from "./phi-sitemap-cache";

/*
 * The sitemap is kept until something is published. These say what "until" means: the same inputs
 * never rebuild, different inputs always do, and neither concurrency nor a failure leaves a stale or
 * missing answer behind.
 */
describe("a value kept until its inputs change", () => {
  it("builds once for the same fingerprint", async () => {
    const cache = createPhiFingerprintCache<string>();
    const build = vi.fn(async () => "sitemap");

    expect(await cache.resolve("a", build)).toBe("sitemap");
    expect(await cache.resolve("a", build)).toBe("sitemap");
    expect(build).toHaveBeenCalledTimes(1);
  });

  it("rebuilds when a publish moved the fingerprint", async () => {
    const cache = createPhiFingerprintCache<string>();

    await cache.resolve("before", async () => "old");
    expect(await cache.resolve("after", async () => "new")).toBe("new");
    expect(await cache.resolve("after", async () => "unused")).toBe("new");
  });

  it("lets requests during a build wait for it instead of building again", async () => {
    const cache = createPhiFingerprintCache<string>();
    let finish!: (value: string) => void;
    const build = vi.fn(() => new Promise<string>((resolve) => { finish = resolve; }));

    const first = cache.resolve("a", build);
    const second = cache.resolve("a", build);
    finish("sitemap");

    expect(await Promise.all([first, second])).toEqual(["sitemap", "sitemap"]);
    expect(build).toHaveBeenCalledTimes(1);
  });

  it("keeps nothing from a failed build", async () => {
    const cache = createPhiFingerprintCache<string>();

    await expect(cache.resolve("a", async () => { throw new Error("server down"); })).rejects.toThrow("server down");
    expect(await cache.resolve("a", async () => "sitemap")).toBe("sitemap");
  });

  it("does not let a slow build for old inputs overwrite the answer for newer ones", async () => {
    const cache = createPhiFingerprintCache<string>();
    let finishOld!: (value: string) => void;

    const old = cache.resolve("before", () => new Promise<string>((resolve) => { finishOld = resolve; }));
    expect(await cache.resolve("after", async () => "new")).toBe("new");
    finishOld("old");
    await old;

    expect(await cache.resolve("after", async () => "unused")).toBe("new");
  });
});
