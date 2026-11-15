import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The record a route's Page is about (MODULES.md, "The fields of a record, and the record a Page is
 * about"): the address fills the Provider's parameters, no record is `missing`, and the named fields
 * become the Page's title and description.
 */

vi.mock("server-only", () => ({}));
/*
 * `React.cache` keeps nothing outside a render, so the request memo would never answer here. This one keeps
 * its value until the next test, as it does for the rest of one request.
 */
const request = vi.hoisted(() => ({ n: 0 }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T,>(read: () => T) => {
    let seen = -1;
    let value: T;
    return () => {
      if (seen !== request.n) { value = read(); seen = request.n; }
      return value;
    };
  },
}));
vi.mock("./phi-runtime", () => ({
  phiRuntime: () => ({ apiBaseUrl: "http://core.test", internalToken: "token", siteKey: "site" }),
}));

import { buildPhiRecordDeclarationsByKey } from "../helpers/record-fields";
import { resolvePhiCmsPageRecord } from "./cms-page-record";
import { readPhiPageRecordField, resolvePhiRecordFields } from "./record-fields";
import type { PhiBlockRuntime } from "../types";
import type { PhiCmsRoutePresetBinding } from "../types/cms-module-descriptors";
import type { PhiRuntimeModuleCatalog, PhiRuntimeModuleId } from "../types/cms-plugins";
import type { PhiRecordAudience } from "../types/record-provider";

const runtime = { site: { key: "site" }, locale: { current: "en" }, area: "public" } as unknown as PhiBlockRuntime;
const moduleId = "@acme/shop/modules/shop" as PhiRuntimeModuleId;
const providerKey = "@acme/shop/records/product" as const;
const chair = { name: "Chair", about: "A chair.", price: 1200 };

function catalogWith(options: { record?: unknown; audience?: PhiRecordAudience; fields?: Record<string, unknown> } = {}) {
  return new Map([[moduleId, {
    definition: {
      moduleId,
      dataProviders: [{
        key: providerKey, ownerModuleId: moduleId, kind: "record", executionMode: "live", authoringMode: "none", title: "Product",
        record: {
          audience: options.audience ?? "public",
          fields: [
            { key: "title", label: "Title", kind: "text" },
            { key: "summary", label: "Summary", kind: "text" },
            { key: "price", label: "Price", kind: "text" },
          ],
        },
      }],
    },
    recordProviders: [{
      key: providerKey,
      load: async () => async (params: Readonly<Record<string, unknown>>) => (params.slug === "chair" ? options.record ?? chair : null),
      loadFields: async () => (record: unknown) => options.fields ?? { title: (record as typeof chair).name, summary: (record as typeof chair).about, price: 12 },
    }],
  }]]) as unknown as PhiRuntimeModuleCatalog;
}

function bindingFor(slug: string, area = "public"): PhiCmsRoutePresetBinding {
  return {
    descriptor: {
      ownerModuleId: moduleId, presetKey: "product-page", presetVersion: 1, area, path: "/shop/p/:slug", title: "Product",
      pageRecord: { providerKey, params: { slug: "slug" }, titleField: "title", descriptionField: "summary" },
      loadTree: () => { throw new Error("not asked"); },
    },
    params: { slug },
  } as unknown as PhiCmsRoutePresetBinding;
}

const active = new Set([moduleId]);

describe("resolvePhiCmsPageRecord", () => {
  beforeEach(() => { request.n += 1; });

  it("fills the Provider's parameters from the address and names the Page after the record", async () => {
    const result = await resolvePhiCmsPageRecord({ binding: bindingFor("chair"), runtime, runtimeModuleCatalog: catalogWith(), activeModuleIds: active });
    expect(result).toEqual({
      status: "ok",
      binding: { providerKey, params: { slug: "chair" }, titleField: "title", descriptionField: "summary" },
      title: "Chair",
      description: "A chair.",
    });
  });

  it("carries the route's field names in the binding, and leaves out those the route does not name", async () => {
    const bare = bindingFor("chair");
    delete (bare.descriptor.pageRecord as { titleField?: string }).titleField;
    delete (bare.descriptor.pageRecord as { descriptionField?: string }).descriptionField;
    const result = await resolvePhiCmsPageRecord({ binding: bare, runtime, runtimeModuleCatalog: catalogWith(), activeModuleIds: active });
    expect(result).toMatchObject({ status: "ok", title: null, description: null });
    expect((result as { binding: object }).binding).toStrictEqual({ providerKey, params: { slug: "chair" } });
  });

  it("says an address that names no record is missing", async () => {
    const result = await resolvePhiCmsPageRecord({ binding: bindingFor("table"), runtime, runtimeModuleCatalog: catalogWith(), activeModuleIds: active });
    expect(result).toEqual({ status: "missing" });
  });

  it("refuses a Public route about a record only its viewer may read", async () => {
    await expect(resolvePhiCmsPageRecord({ binding: bindingFor("chair"), runtime, runtimeModuleCatalog: catalogWith({ audience: "viewer" }), activeModuleIds: active }))
      .rejects.toThrow(/audience "viewer"/);
  });

  it("refuses a page record whose Provider no active Module serves", async () => {
    await expect(resolvePhiCmsPageRecord({ binding: bindingFor("chair"), runtime, runtimeModuleCatalog: catalogWith(), activeModuleIds: new Set() }))
      .rejects.toThrow(/no active record Provider/);
  });
});

describe("resolvePhiRecordFields", () => {
  beforeEach(() => { request.n += 1; });

  const registryOf = (catalog: PhiRuntimeModuleCatalog) => {
    const entry = catalog.get(moduleId)!;
    return {
      recordProviderLoadersByKey: new Map(entry.recordProviders!.map((provider) => [provider.key, provider.load] as const)),
      recordFieldsLoadersByKey: new Map(entry.recordProviders!.map((provider) => [provider.key, provider.loadFields!] as const)),
      recordDeclarationsByKey: buildPhiRecordDeclarationsByKey([entry]),
    };
  };

  it("hands the Provider the parameters only, and a later read by the Page's binding costs no second read", async () => {
    const load = vi.fn(async (params: Readonly<Record<string, unknown>>) => (params.slug === "chair" ? { name: "Chair" } : null));
    const catalog = catalogWith();
    (catalog.get(moduleId) as unknown as { recordProviders: { load: () => Promise<typeof load> }[] }).recordProviders[0]!.load = async () => load;
    await resolvePhiCmsPageRecord({ binding: bindingFor("chair"), runtime, runtimeModuleCatalog: catalog, activeModuleIds: active });
    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0]![0]).toStrictEqual({ slug: "chair" });
    // What a Widget does with `runtime.page.record`, names and all: the same key, so the same answer.
    const page = await resolvePhiCmsPageRecord({ binding: bindingFor("chair"), runtime, runtimeModuleCatalog: catalog, activeModuleIds: active });
    if (page?.status !== "ok") throw new Error("The record of the test address was not found.");
    await resolvePhiRecordFields({
      registry: registryOf(catalog),
      runtime,
      binding: page.binding,
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("hands over the declared fields and leaves out a value that is not of its kind", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await resolvePhiRecordFields({ registry: registryOf(catalogWith()), runtime, binding: { providerKey, params: { slug: "chair" } } });
    warn.mockRestore();
    expect(readPhiPageRecordField(result, "title", ["text"])).toEqual({ kind: "text", value: "Chair" });
    // Declared a text, answered a number.
    expect(readPhiPageRecordField(result, "price", ["text"])).toBeNull();
    // A field of another kind than the Widget draws is not handed over either.
    expect(readPhiPageRecordField(result, "title", ["markdown"])).toBeNull();
  });

  it("answers `none` where the Page is about no record", async () => {
    expect(await resolvePhiRecordFields({ registry: registryOf(catalogWith()), runtime, binding: null })).toEqual({ status: "none" });
  });
});
