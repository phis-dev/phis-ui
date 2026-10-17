import { describe, expect, it } from "vitest";

import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import type { PhiRuntimeModuleCatalogEntry } from "../../types/cms-plugins";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "./catalog";
import { createPhiRuntimeModuleCatalog } from "./contracts";
import { PHI_THREADS_RUNTIME_MODULE_ID } from "./threads/ids";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "./user-management/ids";

/**
 * Where a Module's cards may appear is stated on its contribution, and the catalog holds it to the
 * Areas the Module is eligible for -- a card named for an Area the Module never reaches would be a
 * contribution nobody can switch on.
 */
function catalogWithCardAreas(moduleId: string, areas: readonly PhiCmsAreaKey[]) {
  const entries = [...PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values()].map((entry): PhiRuntimeModuleCatalogEntry =>
    entry.definition.moduleId === moduleId
      ? { ...entry, dashboardCards: { ...entry.dashboardCards!, areas } }
      : entry);
  return () => createPhiRuntimeModuleCatalog(entries, PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.areaDefinitions);
}

describe("dashboardCards.areas", () => {
  it("accepts the first-party contributions as they stand", () => {
    expect(catalogWithCardAreas(PHI_THREADS_RUNTIME_MODULE_ID, ["app"])).not.toThrow();
  });

  it("refuses an empty list", () => {
    expect(catalogWithCardAreas(PHI_THREADS_RUNTIME_MODULE_ID, [])).toThrow(/dashboardCards\.areas/);
  });

  it("refuses an Area named twice", () => {
    expect(catalogWithCardAreas(PHI_THREADS_RUNTIME_MODULE_ID, ["app", "app"])).toThrow(/dashboardCards\.areas/);
  });

  it("refuses an Area that is not one", () => {
    expect(catalogWithCardAreas(PHI_THREADS_RUNTIME_MODULE_ID, ["nowhere" as PhiCmsAreaKey])).toThrow(/dashboardCards\.areas/);
  });

  it("refuses an Area the Module is not eligible for", () => {
    // User Management is an Admin Module; an App Dashboard is a place it can never be switched on.
    expect(catalogWithCardAreas(PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID, ["app"])).toThrow(/dashboardCards\.areas/);
  });
});
