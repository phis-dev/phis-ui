import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const upstream = vi.hoisted(() => ({ status: 200 }));

// Core is not reachable in a unit test; every proxied request answers with `upstream.status`.
vi.mock("../net/phi-next-proxy", () => {
  const handle = async () => new Response(null, { status: upstream.status });
  return {
    PhiNextProxy: () => ({
      GET: handle,
      HEAD: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
      OPTIONS: handle,
    }),
  };
});

import { buildPhiSiteProxyHandlers } from "./site-proxy";
import { clearPhiSiteReadCache, readPhiSiteReadCache } from "./site-read-cache";

const handlers = buildPhiSiteProxyHandlers({
  upstreamBaseUrl: "http://phis.test",
  timeoutMs: 1000,
  buildHeaders: () => new Headers(),
});
const request = {} as NextRequest;
const context = { params: Promise.resolve({ path: ["cms", "theme", "draft"] }) };

async function loadsAround(run: () => Promise<unknown>) {
  const load = vi.fn(async () => "value");
  await readPhiSiteReadCache("key", load);
  await run();
  await readPhiSiteReadCache("key", load);
  return load.mock.calls.length;
}

describe("buildPhiSiteProxyHandlers", () => {
  afterEach(() => {
    clearPhiSiteReadCache();
    upstream.status = 200;
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)("clears the read cache after an accepted %s", async (method) => {
    expect(await loadsAround(() => handlers[method](request, context))).toBe(2);
  });

  it("keeps the read cache for a read", async () => {
    expect(await loadsAround(() => handlers.GET(request, context))).toBe(1);
  });

  it("keeps the read cache when Core refused the write", async () => {
    upstream.status = 409;
    expect(await loadsAround(() => handlers.PUT(request, context))).toBe(1);
  });
});
