import { describe, expect, it, vi } from "vitest";

/*
 * A Widget bound to a field of the page record reads it through the registry its render was resolved
 * with -- the one `resolvePhiRuntimeRenderRegistry` builds for a page and for the Builder's Preview alike.
 * That registry's `dataProviderDescriptorsByKey` holds only what the browser mounts, never a `record`
 * Provider, so the declared fields have to come with the registry's record maps. The Preview of a record
 * template showed every Widget's stand-in where they did not: nothing else in its request had read the
 * record first.
 */

vi.mock("server-only", () => ({}));
vi.mock("../../server-helpers/phi-runtime", () => ({
  phiRuntime: () => ({ apiBaseUrl: "http://core.test", internalToken: "token", siteKey: "site" }),
}));

import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../constants/core-data-provider-keys";
import { resolvePhiWidgetRecordField } from "../../server-helpers/record-fields";
import type { PhiBlockRuntime } from "../../types";
import type { PhiResolvedCmsRenderableTree } from "../../types/cms";
import type { PhiRuntimeModuleCatalogEntry } from "../../types/cms-plugins";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "./catalog";
import { createPhiRuntimeModuleCatalog } from "./contracts";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./core/ids";
import { resolvePhiRuntimeModuleSet, resolvePhiRuntimeRenderRegistry } from "./resolver";

const providerKey = PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntry;

/** Core's content entry Provider, given declared fields and a field reader, as a Module's record Provider has. */
function withDeclaredFields(entry: PhiRuntimeModuleCatalogEntry): PhiRuntimeModuleCatalogEntry {
  return {
    ...entry,
    definition: {
      ...entry.definition,
      dataProviders: (entry.definition.dataProviders ?? []).map((provider) => provider.key === providerKey && provider.kind === "record"
        ? { ...provider, record: { audience: "public" as const, fields: [{ key: "title", label: "Title", kind: "text" as const }] } }
        : provider),
    },
    recordProviders: (entry.recordProviders ?? []).map((provider) => provider.key === providerKey
      ? {
          ...provider,
          load: async () => async (params: Readonly<Record<string, unknown>>) => (params.slug === "chair" ? { name: "Chair" } : null),
          loadFields: async () => (record: unknown) => ({ title: (record as { name: string }).name }),
        }
      : provider),
  };
}

const catalog = createPhiRuntimeModuleCatalog(
  [...PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values()].map((entry) =>
    entry.definition.moduleId === PHI_CORE_RUNTIME_MODULE_ID ? withDeclaredFields(entry) : entry),
  PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.areaDefinitions,
);

// A template's text Widget: it names a field of the page record and no Provider of its own.
const template = {
  contentWidgets: [{ widgetType: PhiCmsWidgetType.SimpleText, config: { text: "Product", recordField: "title" } }],
  layoutNodes: [],
} as unknown as PhiResolvedCmsRenderableTree;

const runtime = {
  site: { key: "site" },
  locale: { current: "en" },
  area: "public",
  page: { path: "/shop/product/chair", record: { providerKey, params: { slug: "chair" } } },
} as unknown as PhiBlockRuntime;

describe("a field of the page record, read through a render's registry", () => {
  it("draws the record's value, not the Widget's stand-in", async () => {
    const moduleSet = await resolvePhiRuntimeModuleSet({ catalog, moduleIds: [], area: "public", serverCapabilities: null });
    const registry = await resolvePhiRuntimeRenderRegistry({ catalog, moduleSet, trees: [template], serverCapabilities: null });

    // Still nothing for the browser to mount: the declaration travels with the record maps.
    expect(registry.dataProviderDescriptorsByKey.has(providerKey)).toBe(false);
    expect(await resolvePhiWidgetRecordField({ registry, runtime, key: "title", kinds: ["text"] }))
      .toEqual({ bound: true, field: { kind: "text", value: "Chair" } });
  });
});
