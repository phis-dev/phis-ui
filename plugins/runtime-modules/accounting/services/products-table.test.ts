import { afterEach, describe, expect, it, vi } from "vitest";

import { PhisProductFlag } from "@phis/contracts/products";

import { buildPhiAccountingProductCommandPath, toPhiAccountingProductRow } from "./products-table";

const ID = "@acme/licences:pro.yearly";

const product = (rest: Record<string, unknown> = {}) => ({
  id: ID,
  supplier: "@acme/licences",
  publisher: "studio-7",
  title: "Pro",
  state: "active",
  sale: "payout",
  referralUrl: null,
  flags: PhisProductFlag.AccountRequired | PhisProductFlag.Supplied | PhisProductFlag.Released,
  parts: [],
  pendingTerms: null,
  version: 4,
  ...rest,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the product directory's Provider", () => {
  it("addresses a command with the id as one encoded path segment", () => {
    expect(buildPhiAccountingProductCommandPath(ID, "lock"))
      .toBe("/api/site/products/%40acme%2Flicences%3Apro.yearly/lock");
    // What Next hands the route back is the id itself.
    expect(decodeURIComponent(buildPhiAccountingProductCommandPath(ID, "release").split("/")[4]!)).toBe(ID);
  });

  it("sets the terms in force beside the ones waiting for a released product with pending terms", () => {
    const row = toPhiAccountingProductRow(product({
      pendingTerms: {
        sale: "payout",
        referralUrl: null,
        flags: PhisProductFlag.Free | PhisProductFlag.AccountRequired,
        parts: ["@acme/licences:seat"],
      },
    }));
    expect(row).toMatchObject({
      free: false,
      accountRequired: true,
      counted: false,
      released: true,
      locked: false,
      awaitingRelease: true,
      partCount: 0,
      inForceSale: "payout",
      inForceFree: false,
      inForceParts: [],
      pendingFree: true,
      pendingParts: ["@acme/licences:seat"],
    });
  });

  it("has nothing in force for a product never released, whose terms are what waits", () => {
    const row = toPhiAccountingProductRow(product({ flags: PhisProductFlag.AccountRequired | PhisProductFlag.Supplied, parts: ["@acme/licences:seat"] }));
    expect(row).toMatchObject({
      released: false,
      awaitingRelease: true,
      partCount: 1,
      inForceSale: null,
      inForceFree: null,
      inForceParts: null,
      pendingSale: "payout",
      pendingAccountRequired: true,
      pendingParts: ["@acme/licences:seat"],
    });
  });

  it("hands the server's list pictures on as they came, for the picture column and the title's icon", () => {
    const row = toPhiAccountingProductRow(product({
      imageListPath: "/api/site/media/12/variants/10?r=3&v=2",
      iconListPath: null,
    }));
    expect(row).toMatchObject({ imageListPath: "/api/site/media/12/variants/10?r=3&v=2", iconListPath: null });
  });

  it("has nothing waiting for the Site's own product, and marks a lock", () => {
    const row = toPhiAccountingProductRow(product({ publisher: null, state: "locked" }));
    expect(row).toMatchObject({ awaitingRelease: false, locked: true, pendingSale: null, pendingFree: null });
  });

  it("asks Core with the search, the filters and the page, and posts the acts to the encoded address", async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      void init;
      const body = url.endsWith("/lock") ? { outcome: "locked" } : { rows: [product(), product({ id: `${ID}.team` })], total: 2 };
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetch);
    const { PHI_ACCOUNTING_PRODUCTS_TABLE_PROVIDER_REGISTRATION: provider } = await import("./products-table");
    const signal = new AbortController().signal;

    const result = await provider.query({
      resourceKey: "products",
      query: {
        page: 2,
        pageSize: 50,
        search: " pro ",
        filters: { supplier: "@acme/licences", state: ["active", "locked"], pendingTerms: true },
      },
      signal,
    } as never);
    expect(result.total).toBe(2);
    const listed = new URL(fetch.mock.calls[0]![0], "https://site.test");
    expect(listed.pathname).toBe("/api/site/products");
    expect(Object.fromEntries(listed.searchParams)).toEqual({
      page: "2", pageSize: "50", q: "pro", supplier: "@acme/licences", state: "active,locked", pendingTerms: "true",
    });

    // The switch off asks for nothing rather than for the products not waiting.
    await provider.query({ resourceKey: "products", query: { filters: { pendingTerms: false } }, signal } as never);
    expect(new URL(fetch.mock.calls[1]![0], "https://site.test").searchParams.has("pendingTerms")).toBe(false);

    // A record is the one product with exactly that id among the matches of its search.
    const record = await provider.readRecord!({ resourceKey: "products", rowIdentity: ID, signal } as never);
    expect((record as Record<string, unknown>).id).toBe(ID);
    expect(new URL(fetch.mock.calls[2]![0], "https://site.test").searchParams.get("q")).toBe(ID);

    const mutation = await provider.mutate!({
      kind: "action", resourceKey: "products", actionKey: "lock", rowIdentity: ID, query: {}, signal,
    } as never);
    expect(mutation).toEqual({ status: "accepted", invalidation: "view" });
    expect(fetch.mock.calls[3]![0]).toBe("/api/site/products/%40acme%2Flicences%3Apro.yearly/lock");
    expect(fetch.mock.calls[3]![1]?.method).toBe("POST");

    await expect(provider.mutate!({
      kind: "action", resourceKey: "products", actionKey: "delete", rowIdentity: ID, query: {}, signal,
    } as never)).rejects.toThrow(/never edited/);
  });

  it("releases the version of the record the terms dialog read, and nothing it never read", async () => {
    let version = 7;
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      void init;
      const body = url.endsWith("/release") ? { outcome: "applied" } : { rows: [product({ id: "@acme/licences:other", version: 1 }), product({ version })], total: 2 };
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetch);
    const { PHI_ACCOUNTING_PRODUCTS_TABLE_PROVIDER_REGISTRATION: provider } = await import("./products-table");
    const signal = new AbortController().signal;
    const release = (rowIdentity: string) => provider.mutate!({
      kind: "action", resourceKey: "products", actionKey: "release", rowIdentity, query: {}, signal,
    } as never);

    await expect(release("@acme/licences:never-read")).rejects.toThrow(/were not read/);
    expect(fetch).not.toHaveBeenCalled();

    await provider.readRecord!({ resourceKey: "products", rowIdentity: ID, signal } as never);
    // The Table's list reads another version; the release names the one the dialog shows.
    version = 9;
    await provider.query({ resourceKey: "products", query: {}, signal } as never);
    await release(ID);
    const [url, init] = fetch.mock.calls[2]!;
    expect(url).toBe("/api/site/products/%40acme%2Flicences%3Apro.yearly/release");
    expect(init).toMatchObject({ method: "POST", body: JSON.stringify({ expectedVersion: 7 }) });
    expect(new Headers(init!.headers).get("content-type")).toBe("application/json");

    // Lock and unlock send no body.
    await provider.mutate!({ kind: "action", resourceKey: "products", actionKey: "lock", rowIdentity: ID, query: {}, signal } as never);
    expect(fetch.mock.calls[3]![1]?.body).toBeUndefined();
  });

  it("says Core's refusal of a release whose product moved on", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/release")
      ? new Response(JSON.stringify({ error: `${ID} is at version 8, not 4: it changed since it was read; read it again before releasing.` }), {
        status: 409, headers: { "content-type": "application/json" },
      })
      : new Response(JSON.stringify({ rows: [product()], total: 1 }), { status: 200, headers: { "content-type": "application/json" } })));
    const { PHI_ACCOUNTING_PRODUCTS_TABLE_PROVIDER_REGISTRATION: provider } = await import("./products-table");
    const signal = new AbortController().signal;
    await provider.readRecord!({ resourceKey: "products", rowIdentity: ID, signal } as never);
    await expect(provider.mutate!({
      kind: "action", resourceKey: "products", actionKey: "release", rowIdentity: ID, query: {}, signal,
    } as never)).rejects.toThrow(/at version 8, not 4/);
  });
});
