import { describe, expect, it } from "vitest";

import { PHI_ADMIN_RUNTIME_MODULE_AREA_CONTRIBUTIONS } from "../area-contributions/admin";
import { PHI_ADMIN_RUNTIME_AREA_DEFINITIONS } from "../area-definitions";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION } from "../observability/server";
import { PHI_ADMIN_RUNTIME_MODULE_CATALOG, createPhiAdminRuntimeModuleCatalog } from "./admin";
import { createPhiAreaRuntimeModuleCatalog } from "./area-catalog";

const ADMIN_MODULE_IDS = PHI_ADMIN_RUNTIME_MODULE_AREA_CONTRIBUTIONS.map((entry) => entry.moduleId);
const OBSERVABILITY_MODULE_ID = PHI_OBSERVABILITY_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION.moduleId;
const WITHOUT_OBSERVABILITY = PHI_ADMIN_RUNTIME_MODULE_AREA_CONTRIBUTIONS.filter(
  (entry) => entry.moduleId !== OBSERVABILITY_MODULE_ID,
);

describe("createPhiAreaRuntimeModuleCatalog", () => {
  it("builds the Admin catalog from the Admin contributions and Area definitions", () => {
    expect([...PHI_ADMIN_RUNTIME_MODULE_CATALOG.keys()]).toEqual(ADMIN_MODULE_IDS);
    expect(PHI_ADMIN_RUNTIME_MODULE_CATALOG.areaDefinitions).toEqual(PHI_ADMIN_RUNTIME_AREA_DEFINITIONS);
    for (const contribution of PHI_ADMIN_RUNTIME_MODULE_AREA_CONTRIBUTIONS) {
      expect(PHI_ADMIN_RUNTIME_MODULE_CATALOG.get(contribution.moduleId)?.definition).toBe(
        contribution.catalogEntry.definition,
      );
    }
  });

  it("appends the Site's own Modules for its Area and no other", () => {
    const siteModules = { admin: [PHI_OBSERVABILITY_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION] };
    const withSite = createPhiAreaRuntimeModuleCatalog(
      "admin",
      WITHOUT_OBSERVABILITY,
      PHI_ADMIN_RUNTIME_AREA_DEFINITIONS,
      siteModules,
    );
    expect([...withSite.keys()].at(-1)).toBe(OBSERVABILITY_MODULE_ID);

    const otherArea = createPhiAreaRuntimeModuleCatalog(
      "admin",
      WITHOUT_OBSERVABILITY,
      PHI_ADMIN_RUNTIME_AREA_DEFINITIONS,
      { app: siteModules.admin },
    );
    expect(otherArea.has(OBSERVABILITY_MODULE_ID)).toBe(false);
  });

  it("keeps the Area files' Site-less default", () => {
    expect([...createPhiAdminRuntimeModuleCatalog().keys()]).toEqual(ADMIN_MODULE_IDS);
  });
});
