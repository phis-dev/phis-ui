import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhiEditorRuntimeModuleCatalog } from "../area-catalogs/editor";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "../descriptor-compiler";
import { resolvePhiRuntimeModuleSet } from "../resolver";
import { PHI_NEWS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import { PHI_NEWS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS } from "./client-data-providers";
import {
  PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_NEWS_RUNTIME_MODULE_ID,
  PHI_NEWS_TABLE_RESOURCE_KEY,
} from "./ids";
import type { PhiRuntimeModuleId } from "../../../types/cms-module-descriptors";

/**
 * The editor surface, as far as it can be pinned without a Site.
 *
 * What a rendered Page looks like needs an Area a Site has set up in the Builder; what a Module brings to
 * that Area does not, and this is that: the address, the Provider behind the Table, and the resource the
 * Table names. Those three drifting apart is the failure that renders an empty page with no diagnosis.
 */
describe("what News brings to the editor Area", () => {
  it("answers /news in the editor Area, from the editor Module's own route", () => {
    const entries = createPhiEditorRuntimeModuleCatalog();
    const table = compilePhiCmsActiveRouteTable({
      catalog: resolvePhiCmsDescriptorCatalog(entries),
      area: "editor",
      activeModuleIds: new Set<PhiRuntimeModuleId>([...entries.keys()]),
    });

    /*
     * Under its package, not at `/news`: only the Public Area lets a Site hand a Module the address it
     * asked for. Everywhere else a route lives where its package puts it and has nothing to contest.
     */
    const route = resolvePhiCmsRoutePreset(table, "/phis/ui/news");
    expect(route?.descriptor.presetKey).toBe("editor-news-page");
    /*
     * This Module's own Page, not the Area's. That is what makes it switchable: the Page and its sidebar
     * entry are computed from the catalog, so switching the Module off takes both away -- and it is the
     * only shape a Module outside this package could use, since it can add nothing to the Area's own
     * definition.
     */
    expect(route?.descriptor.ownerModuleId).toBe(PHI_NEWS_RUNTIME_MODULE_ID);

    const [navigation] = route?.descriptor.navigation ?? [];
    expect(navigation?.navKey).toBe("editor:sidebar");
    // By role, not by another Module's item key: naming one would make this entry depend on it being there.
    expect(navigation).toMatchObject({ anchor: "main" });
    expect(navigation?.item.routePresetKey).toBe("editor-news-page");

  });

  it("is carried by the editor Area and brings its Provider there", async () => {
    const catalog = createPhiEditorRuntimeModuleCatalog();
    expect(catalog.has(PHI_NEWS_RUNTIME_MODULE_ID)).toBe(true);

    const moduleSet = await resolvePhiRuntimeModuleSet({
      catalog,
      moduleIds: [PHI_NEWS_RUNTIME_MODULE_ID],
      area: "editor",
      serverCapabilities: null,
    });

    expect(moduleSet.dataProviderDescriptorsByKey.has(PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table)).toBe(true);
    expect(moduleSet.dataProviderDescriptorsByKey.has(PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.tags)).toBe(true);
  });

  it("declares the resource the Table names, with an offset page and the tag facet", () => {
    const descriptor = PHI_NEWS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
      .find((entry) => entry.key === PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table);
    const resource = descriptor?.resources?.find(
      (entry) => entry.resourceKey === PHI_NEWS_TABLE_RESOURCE_KEY,
    );

    expect(resource?.rowIdentityPath).toBe("contentId");
    // The Table contract's paging, which is what the endpoint answers `total` for.
    expect(resource?.query).toMatchObject({ pagination: "offset", search: true, facets: ["tags"] });
    expect(resource?.actions?.map((action) => action.key)).toEqual(["withdraw", "delete", "refresh"]);
  });

  it("picks a tag from the offer rather than taking a typed one", () => {
    const descriptor = PHI_NEWS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
      .find((entry) => entry.key === PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.table);
    const tags = descriptor?.resources?.[0]?.fields?.find((field) => field.key === "tags");

    expect(tags).toMatchObject({
      type: "enum[]",
      optionsProvider: { providerKey: PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS.tags },
    });
  });

  // A declared Provider whose Client nobody registered answers nothing in a browser, silently.
  it("registers a Client for every Provider it declares", () => {
    expect(PHI_NEWS_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS.map((entry) => entry.key).sort())
      .toEqual(Object.values(PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS).sort());
  });
});
