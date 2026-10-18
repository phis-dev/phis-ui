import { describe, expect, it, vi } from "vitest";

/*
 * What a Widget bound to a record is handed (`types/record-provider.ts`): the record, none by those
 * parameters, or none to be had -- three answers it draws three ways, so none of them may pass for another.
 */

vi.mock("server-only", () => ({}));
vi.mock("./phi-runtime", () => ({
  phiRuntime: () => ({ apiBaseUrl: "http://core.test", internalToken: "token", siteKey: "site" }),
}));

import { resolvePhiRecordSource } from "./record-source";
import type { PhiBlockRuntime } from "../types";

const runtime = { site: { key: "site" }, locale: { current: "en" }, area: "public" } as unknown as PhiBlockRuntime;
const binding = { providerKey: "@acme/shop/records/product" as const, params: { slug: "chair" } };

function registryWith(resolve?: (params: Readonly<Record<string, unknown>>) => Promise<unknown>) {
  return {
    recordProviderLoadersByKey: new Map(resolve ? [[binding.providerKey, async () => resolve]] : []),
  };
}

describe("resolvePhiRecordSource", () => {
  it("hands the record the Provider answered for the binding's parameters", async () => {
    const resolve = vi.fn(async (params: Readonly<Record<string, unknown>>) => ({ name: params.slug }));
    const result = await resolvePhiRecordSource({ registry: registryWith(resolve), runtime, binding });
    expect(result).toEqual({ status: "ok", record: { name: "chair" } });
    expect(resolve).toHaveBeenCalledWith({ slug: "chair" }, expect.objectContaining({ siteKey: "site", locale: "en", runtime }));
  });

  it("says there is none where the Provider answers null", async () => {
    const result = await resolvePhiRecordSource({ registry: registryWith(async () => null), runtime, binding });
    expect(result).toEqual({ status: "missing" });
  });

  it("says there is none where nothing is bound", async () => {
    const result = await resolvePhiRecordSource({ registry: registryWith(), runtime, binding: null });
    expect(result).toEqual({ status: "missing" });
  });

  it("says the record is unavailable where no active Module serves the Provider", async () => {
    const result = await resolvePhiRecordSource({ registry: registryWith(), runtime, binding });
    expect(result).toMatchObject({ status: "unavailable" });
  });

  it("says the record is unavailable, not missing, where the Provider throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await resolvePhiRecordSource({
      registry: registryWith(async () => { throw new Error("store down"); }),
      runtime,
      binding,
    });
    expect(result).toEqual({ status: "unavailable", reason: "store down" });
    error.mockRestore();
  });
});
