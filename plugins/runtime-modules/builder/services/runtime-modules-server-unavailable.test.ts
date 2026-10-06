import { describe, expect, it } from "vitest";

import type { PhiRuntimeModuleId } from "../../../../types";
import { buildRuntimeModuleRows } from "./runtime-modules-table";

/**
 * An installed Module whose server half the Site does not provide runs in no Area. The Modules page
 * shows it with the reason and offers no switch, rather than a switch that would do nothing.
 */
describe("a Module without its server part", () => {
  const shop = {
    moduleId: "@acme/shop" as PhiRuntimeModuleId,
    kind: "module",
    title: "Shop",
    description: "Sells things.",
    category: "commerce",
    eligibleAreas: ["public", "app"],
  };
  const docs = { ...shop, moduleId: "@acme/docs" as PhiRuntimeModuleId, title: "Docs" };
  const state = {
    runtimeModuleDefinitions: [shop, docs],
    runtimeModuleIdsByArea: { public: [shop.moduleId, docs.moduleId] },
    serverUnavailableModules: {
      [shop.moduleId]: { providerId: "@acme/shop-server", diagnosticCode: "provider_missing", missingCapabilities: ["shop.orders"] },
    },
  } as unknown as Parameters<typeof buildRuntimeModuleRows>[0];
  const rows = buildRuntimeModuleRows(state, null, { areaFilter: null, showFoundation: false }, {
    category: "Server part missing",
    hint: "Missing: %1",
  });

  it("is a locked row that runs nowhere and names what is missing", () => {
    const row = rows.find((candidate) => candidate.moduleId === shop.moduleId)!;
    expect(row).toMatchObject({ active: false, locked: true, category: "Server part missing", description: "Missing: shop.orders" });
    expect((row as Record<string, unknown>).area_public).toBeNull();
  });

  it("leaves every other Module as it was", () => {
    expect(rows.find((candidate) => candidate.moduleId === docs.moduleId)).toMatchObject({ active: true, locked: false });
  });
});
