import { afterEach, describe, expect, it } from "vitest";

import PhisRenderCacheHandler from "./cache-handler.mjs";

const STORE_KEY = Symbol.for("phis-ui.render-cache");

function page(bytes: number) {
  return { kind: "APP_PAGE", html: "x".repeat(bytes), status: 200 };
}

describe("the render cache", () => {
  afterEach(() => {
    delete (globalThis as Record<symbol, unknown>)[STORE_KEY];
    delete process.env.PHIS_RENDER_CACHE_MB;
  });

  it("answers what was set, across handler instances of one process", async () => {
    await new PhisRenderCacheHandler().set("/static-render/1/light/en", page(10), { tags: [] });

    const hit = await new PhisRenderCacheHandler().get("/static-render/1/light/en");

    expect(hit?.value.html).toHaveLength(10);
    expect(await new PhisRenderCacheHandler().get("/static-render/2/light/en")).toBeNull();
  });

  it("lets the least recently read entry go first once the bound is passed", async () => {
    process.env.PHIS_RENDER_CACHE_MB = String(1 / 1024); // 1024 bytes
    const handler = new PhisRenderCacheHandler();
    await handler.set("a", page(400), { tags: [] });
    await handler.set("b", page(400), { tags: [] });
    await handler.get("a");
    await handler.set("c", page(400), { tags: [] });

    expect(await handler.get("b")).toBeNull();
    expect(await handler.get("a")).not.toBeNull();
    expect(await handler.get("c")).not.toBeNull();
  });

  it("keeps nothing larger than the whole bound", async () => {
    process.env.PHIS_RENDER_CACHE_MB = String(1 / 1024);
    const handler = new PhisRenderCacheHandler();
    await handler.set("small", page(10), { tags: [] });
    await handler.set("huge", page(5000), { tags: [] });

    expect(await handler.get("huge")).toBeNull();
    expect(await handler.get("small")).not.toBeNull();
  });

  it("drops the entries a revalidated tag names", async () => {
    const handler = new PhisRenderCacheHandler();
    await handler.set("tagged", page(10), { tags: ["t"] });
    await handler.set("other", page(10), { tags: ["u"] });
    await handler.revalidateTag("t");

    expect(await handler.get("tagged")).toBeNull();
    expect(await handler.get("other")).not.toBeNull();
  });
});
