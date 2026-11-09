import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const upstream = vi.hoisted(() => ({ status: 200 }));
// What the CMS write check answers; `null` lets the write through.
const writeCheck = vi.hoisted(() => ({ refusal: null as Response | null }));

// Core is not reachable in a unit test; every proxied request answers with `upstream.status`.
vi.mock("../net/phi-next-proxy", () => {
  const handle = async () => new Response("upstream", { status: upstream.status });
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

/*
 * The three locally answered paths, stood in for by their names.
 *
 * What is under test is the dispatch -- which addresses stay in the Site, which verbs they offer, and
 * what the read cache does about them. Resolving a Form or a navigation target is each contract's own
 * test, and importing the real ones here would pull the rendering half of this package into a unit test.
 */
vi.mock("./site-form-route", () => ({
  buildPhiSiteFormRouteHandlers: () => ({
    GET: async () => new Response("forms", { status: 200 }),
    POST: async () => new Response("forms", { status: 200 }),
  }),
}));
vi.mock("./module-diagnostics-route", () => ({
  buildPhiSiteModuleDiagnosticsRouteHandler: () =>
    async () => new Response("module-diagnostics", { status: 200 }),
}));
vi.mock("./navigation-target-route", () => ({
  buildPhiNavigationTargetRouteHandler: () =>
    async () => new Response("navigation-target", { status: 200 }),
}));
vi.mock("./dashboard-cards-route", () => ({
  buildPhiDashboardCardsRouteHandler: () =>
    async () => new Response("dashboard-cards", { status: 200 }),
}));

/*
 * The CMS write check reads the Widgets' parsers from the Area's catalog; its own rules are the strict
 * reader's and the Table validator's to pin. Here only the door matters: a refusal stops the write before
 * Core, and a write let through goes on as it did.
 */
vi.mock("./site-cms-write-validation", () => ({
  validatePhiCmsStructureWrite: async () => writeCheck.refusal,
}));

import { buildPhiSiteProxyHandlers } from "./site-proxy";
import { clearPhiSiteReadCache, readPhiSiteReadCache } from "./site-read-cache";

const handlers = buildPhiSiteProxyHandlers({
  upstreamBaseUrl: "http://phis.test",
  timeoutMs: 1000,
  buildHeaders: () => new Headers(),
  loadAreaBridge: async () => null,
});
const request = {} as NextRequest;
const context = { params: Promise.resolve({ path: ["cms", "theme", "draft"] }) };
const at = (...path: string[]) => ({ params: Promise.resolve({ path }) });

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
    writeCheck.refusal = null;
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)("clears the read cache after an accepted %s", async (method) => {
    expect(await loadsAround(() => handlers[method](request, context))).toBe(2);
  });

  it("keeps the read cache for a read", async () => {
    expect(await loadsAround(() => handlers.GET(request, context))).toBe(1);
  });

  it.each([["user-state"], ["threads", "42", "messages"], ["account", "avatar"]])(
    "keeps the read cache for a personal write under %s",
    async (...path) => {
      expect(await loadsAround(() => handlers.POST(request, at(...path)))).toBe(1);
    },
  );

  it("refuses a CMS write the Widgets cannot read before it reaches Core", async () => {
    writeCheck.refusal = new Response("invalid-config", { status: 422 });
    const response = await handlers.POST(request, context);
    expect(response.status).toBe(422);
    expect(await response.text()).toBe("invalid-config");
  });

  it("does not check a write outside the CMS", async () => {
    writeCheck.refusal = new Response("invalid-config", { status: 422 });
    const response = await handlers.POST(request, at("media", "upload"));
    expect(await response.text()).toBe("upstream");
  });

  it("keeps the read cache when Core refused the write", async () => {
    upstream.status = 409;
    expect(await loadsAround(() => handlers.PUT(request, context))).toBe(1);
  });

  it.each([
    ["forms", "POST"],
    ["forms", "GET"],
    ["module-diagnostics", "GET"],
    ["navigation-target", "GET"],
    ["dashboard-cards", "GET"],
  ] as const)("answers /%s from the Site on %s", async (segment, method) => {
    const response = await handlers[method](request, at(segment));
    expect(await response.text()).toBe(segment);
  });

  /*
   * A Form submit reaches Core through its own resolution, not through this door, so what this Site
   * cached to render with is untouched. The write that clears the cache is a write Core accepted here.
   */
  it("leaves the read cache alone for a locally answered write", async () => {
    expect(await loadsAround(() => handlers.POST(request, at("forms")))).toBe(1);
  });

  it("offers HEAD wherever it offers GET, as a route file of its own would have", async () => {
    expect((await handlers.HEAD(request, at("module-diagnostics"))).status).toBe(200);
  });

  it("refuses a verb a locally answered path has no answer for, and says which it has", async () => {
    const response = await handlers.PUT(request, at("forms"));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, POST");
  });

  /*
   * One segment, matched exactly. An Asset under `/api/site/media/...` and anything below one of these
   * names belongs to Core, and a prefix match would have quietly taken both.
   */
  it.each([
    ["media", "7", "content"],
    ["forms", "anything"],
  ])("forwards %s to Core", async (...path) => {
    expect(await (await handlers.GET(request, at(...path))).text()).toBe("upstream");
  });
});
