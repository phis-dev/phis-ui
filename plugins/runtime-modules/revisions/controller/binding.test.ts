import { describe, expect, it } from "vitest";

import {
  createEmptyPhiBuilderModulePresetPagesByArea,
  type PhiPresetPageNode,
} from "../../../../helpers/cms-page-catalog";
import type { PhiCmsPresetSource } from "../../../../types/cms-module-descriptors";
import {
  isPhiRevisionsCatalogReady,
  readPhiRevisionsTableBinding,
  resolvePhiRevisionsControllerBinding,
} from "./binding";

const dashboard: PhiPresetPageNode = {
  key: "m-dashboard",
  title: "Dashboard",
  storagePath: "/phis/ui/dashboard",
  catalogPath: "/dashboard",
  sourcePreset: { ownerModuleId: "@phis/ui/modules/app", presetKey: "app-dashboard", sourcePresetVersion: 1 } as PhiCmsPresetSource,
};
const welcome: PhiPresetPageNode = { key: "m-welcome", title: "Welcome", storagePath: "/" };

function catalog(patch: Partial<Parameters<typeof resolvePhiRevisionsControllerBinding>[0]> = {}) {
  return {
    area: "app" as const,
    pageKey: "m-dashboard",
    catalogHydrated: true,
    pageCatalogHydratedByArea: { app: true, public: true },
    modulePresetPagesByArea: {
      ...createEmptyPhiBuilderModulePresetPagesByArea(),
      app: [dashboard],
      public: [welcome],
    },
    customPages: {},
    persistedPageCatalogByArea: {},
    ...patch,
  };
}

const at = (query: string) => new URLSearchParams(query);

/*
 * The Revisions Controller hands the history Table its scope, and every scope it hands is a read. It
 * handed one on the catalog's first answer, which stands for the default Area before the Builder has
 * read the address: a Module Page of the App was handed as a Public Page, then as the App's.
 */
describe("the scope the Revisions Controller hands", () => {
  it("is none before the preload, before the open Area is the address's, and before its Pages are read", () => {
    const query = at("phiBuilderArea=app&revisionKind=page&revisionScope=%2Fphis%2Fui%2Fdashboard");
    expect(resolvePhiRevisionsControllerBinding(catalog({ catalogHydrated: false }), query)).toBeNull();
    expect(resolvePhiRevisionsControllerBinding(catalog({ area: "public", pageKey: "m-welcome" }), query)).toBeNull();
    expect(resolvePhiRevisionsControllerBinding(catalog({ pageCatalogHydratedByArea: { public: true } }), query))
      .toBeNull();
    expect(isPhiRevisionsCatalogReady(catalog(), query)).toBe(true);
  });

  it("names a Module Page by the storage path the address carries, in the address's Area", () => {
    expect(resolvePhiRevisionsControllerBinding(
      catalog(),
      at("phiBuilderArea=app&revisionKind=page&revisionScope=%2Fphis%2Fui%2Fdashboard"),
    )).toEqual({ area: "app", kind: "page", scopeKey: "/phis/ui/dashboard" });
  });

  it("is the open Area where the address names no kind, and the open Page's path for a page scope without one", () => {
    expect(resolvePhiRevisionsControllerBinding(catalog(), at("phiBuilderArea=app")))
      .toEqual({ area: "app", kind: "area", scopeKey: "app" });
    expect(resolvePhiRevisionsControllerBinding(catalog(), at("phiBuilderArea=app&revisionKind=page")))
      .toEqual({ area: "app", kind: "page", scopeKey: "/phis/ui/dashboard" });
  });

  it("is the same scope, value for value, however often the catalog answers again", () => {
    const query = at("phiBuilderArea=app&revisionKind=page&revisionScope=%2Fphis%2Fui%2Fdashboard");
    const first = resolvePhiRevisionsControllerBinding(catalog(), query);
    const again = resolvePhiRevisionsControllerBinding(catalog({ persistedPageCatalogByArea: { app: [] } }), query);
    expect(JSON.stringify(again)).toBe(JSON.stringify(first));
  });
});

describe("the binding a Revisions Table request carries", () => {
  it("is whole only with an Area, a kind and a scope of that kind", () => {
    expect(readPhiRevisionsTableBinding({ labels: {} })).toBeNull();
    expect(readPhiRevisionsTableBinding({ kind: "area", scopeKey: "app" })).toBeNull();
    expect(readPhiRevisionsTableBinding({ area: "app", kind: "area", scopeKey: "app" }))
      .toEqual({ area: "app", kind: "area", scopeKey: "app" });
    expect(readPhiRevisionsTableBinding({ area: "app", kind: "page", scopeKey: "/phis/ui/dashboard" }))
      .toEqual({ area: "app", kind: "page", scopeKey: "/phis/ui/dashboard" });
  });

  it("is none while a kind chosen stands beside the scope of the kind before it", () => {
    expect(readPhiRevisionsTableBinding({ area: "app", kind: "page", scopeKey: "app" })).toBeNull();
    expect(readPhiRevisionsTableBinding({ area: "app", kind: "navigation", scopeKey: "/" })).toBeNull();
    expect(readPhiRevisionsTableBinding({ area: "app", kind: "theme", scopeKey: "app" })).toBeNull();
    expect(readPhiRevisionsTableBinding({ area: "app", kind: "area", scopeKey: "/phis/ui/dashboard" })).toBeNull();
  });
});
