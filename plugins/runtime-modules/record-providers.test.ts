import { describe, expect, it } from "vitest";

import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../constants/core-data-provider-keys";
import type { PhiRuntimeModuleCatalogEntry } from "../../types/cms-plugins";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "./catalog";
import { createPhiPublicRuntimeModuleCatalog } from "./area-catalogs/public";
import { createPhiRuntimeModuleCatalog } from "./contracts";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./core/ids";
import { collectPhiRuntimeDataProviderKeys, resolvePhiRuntimeModuleSet } from "./resolver";

/**
 * A `record` descriptor and its server half come as a pair (`types/record-provider.ts`), and the catalog
 * refuses either without the other -- one is offered in the Builder and answers nothing, the other is
 * never offered.
 */
function catalogWithCore(change: (entry: PhiRuntimeModuleCatalogEntry) => PhiRuntimeModuleCatalogEntry) {
  const entries = [...PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values()].map((entry) =>
    entry.definition.moduleId === PHI_CORE_RUNTIME_MODULE_ID ? change(entry) : entry);
  return () => createPhiRuntimeModuleCatalog(entries, PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.areaDefinitions);
}

describe("record providers", () => {
  it("accepts the first-party pairs as they stand", () => {
    expect(catalogWithCore((entry) => entry)).not.toThrow();
  });

  it("refuses a record descriptor without its server half", () => {
    expect(catalogWithCore((entry) => ({ ...entry, recordProviders: [] }))).toThrow(/has no server half/);
  });

  it("refuses a server half no record descriptor declares", () => {
    expect(catalogWithCore((entry) => ({
      ...entry,
      recordProviders: [
        ...entry.recordProviders ?? [],
        { key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntries, load: async () => async () => null },
      ],
    }))).toThrow(/has no record descriptor/);
  });

  it("refuses a server half served twice", () => {
    expect(catalogWithCore((entry) => ({
      ...entry,
      recordProviders: [...entry.recordProviders!, ...entry.recordProviders!],
    }))).toThrow(/is served twice/);
  });

  it("mounts nothing in the browser for a binding to a record", async () => {
    const moduleSet = await resolvePhiRuntimeModuleSet({
      catalog: createPhiPublicRuntimeModuleCatalog(),
      moduleIds: [],
      area: "public",
      serverCapabilities: null,
    });
    const keys = collectPhiRuntimeDataProviderKeys({
      moduleSet,
      trees: [{
        contentWidgets: [{
          widgetType: PhiCmsWidgetType.EntryHeader,
          config: { entry: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntry, params: {} } },
        }],
        layoutNodes: [],
      }] as never,
    });
    expect(keys.has(PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntry)).toBe(false);
  });
});
