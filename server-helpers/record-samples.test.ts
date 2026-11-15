import { describe, expect, it, vi } from "vitest";

/*
 * The record the Builder's Preview shows a template with: the first sample of the route's record
 * Provider, bound by the Provider's own parameters; nothing where there is none.
 */

vi.mock("server-only", () => ({}));
vi.mock("./phi-runtime", () => ({
  phiRuntime: () => ({ apiBaseUrl: "http://core.test", internalToken: "token", siteKey: "site" }),
}));

import { resolvePhiPageRecordSampleBinding } from "./record-samples";
import type { PhiBlockRuntime } from "../types";
import type { PhiCmsPageRecordDescriptor, PhiRuntimeRecordSamplesReader } from "../types/record-provider";

const runtime = { site: { key: "site" }, locale: { current: "de" }, area: "public" } as unknown as PhiBlockRuntime;
const providerKey = "@acme/shop/records/product" as const;
const pageRecord: PhiCmsPageRecordDescriptor = { providerKey, params: { slug: "slug" } };

const registryOf = (reader?: PhiRuntimeRecordSamplesReader) => ({
  recordSamplesLoadersByKey: new Map(reader ? [[providerKey, async () => reader] as const] : []),
});

describe("resolvePhiPageRecordSampleBinding", () => {
  it("binds the first sample by the Provider's own parameters, asked in the page's language", async () => {
    const reader = vi.fn<PhiRuntimeRecordSamplesReader>(async () => [
      { label: "Chair", params: { slug: "chair" } },
      { label: "Table", params: { slug: "table" } },
    ]);
    const binding = await resolvePhiPageRecordSampleBinding({ registry: registryOf(reader), runtime, pageRecord });
    expect(binding).toEqual({ providerKey, params: { slug: "chair" } });
    expect(reader.mock.calls[0]![0]).toMatchObject({ apiBaseUrl: "http://core.test", internalToken: "token", siteKey: "site", locale: "de" });
  });

  it("carries the route's title and description field names, and none the route does not name", async () => {
    const reader = async () => [{ label: "Chair", params: { slug: "chair" } }];
    expect(await resolvePhiPageRecordSampleBinding({
      registry: registryOf(reader),
      runtime,
      pageRecord: { ...pageRecord, titleField: "name", descriptionField: "summary" },
    })).toStrictEqual({ providerKey, params: { slug: "chair" }, titleField: "name", descriptionField: "summary" });
    expect(await resolvePhiPageRecordSampleBinding({ registry: registryOf(reader), runtime, pageRecord }))
      .toStrictEqual({ providerKey, params: { slug: "chair" } });
  });

  it("answers null for a Provider that offers no samples, or none now", async () => {
    expect(await resolvePhiPageRecordSampleBinding({ registry: registryOf(), runtime, pageRecord })).toBeNull();
    expect(await resolvePhiPageRecordSampleBinding({ registry: registryOf(async () => []), runtime, pageRecord })).toBeNull();
  });

  it("answers null, and says so, for a reader that fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const binding = await resolvePhiPageRecordSampleBinding({
      registry: registryOf(async () => { throw new Error("store down"); }),
      runtime,
      pageRecord,
    });
    warn.mockRestore();
    expect(binding).toBeNull();
  });
});
