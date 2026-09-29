import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const calls = vi.hoisted(() => ({
  moduleIdsForArea: [] as unknown[][],
  moduleSet: [] as unknown[],
}));

vi.mock("../../plugins/runtime-modules/settings", () => ({
  resolvePhiRuntimeModuleIdsForArea: (...args: unknown[]) => {
    calls.moduleIdsForArea.push(args);
    return ["core", "selected"];
  },
}));
vi.mock("../../helpers/cms-area-config", () => ({
  readPhiAreaPresetRuntimeModuleIds: (preset: { ids: string[] } | null) => preset?.ids ?? ["default"],
}));
vi.mock("../../plugins/runtime-modules/resolver", () => ({
  resolvePhiRuntimeModuleSet: async (input: unknown) => {
    calls.moduleSet.push(input);
    return { widgetDefinitionsByType: new Map([["card", { definition: { typeKey: "card" } }]]) };
  },
  resolvePhiRuntimeRenderRegistry: vi.fn(),
}));

import type { PhiCmsSiteBridge } from "../../types/cms-plugins";
import { resolvePhiCmsAreaRuntimeModuleScope } from "./phi-cms-runtime-registry";

describe("resolvePhiCmsAreaRuntimeModuleScope", () => {
  it("resolves the Module scope from the selection the Area preset states", async () => {
    const definition = { id: "selected" };
    const catalog = new Map([["selected", { definition }]]);
    const cmsBridge = { runtimeModuleCatalog: catalog } as unknown as PhiCmsSiteBridge;

    const scope = await resolvePhiCmsAreaRuntimeModuleScope({
      cmsBridge,
      area: "admin",
      areaPreset: { ids: ["selected"] } as never,
      serverCapabilities: null,
    });

    expect(calls.moduleIdsForArea).toEqual([["admin", ["selected"], [definition]]]);
    expect(calls.moduleSet).toEqual([{
      catalog,
      moduleIds: ["core", "selected"],
      area: "admin",
      serverCapabilities: null,
    }]);
    expect(scope.catalog).toBe(catalog);
    expect(scope.widgetDefinitionsByType.get("card")).toEqual({ typeKey: "card" });
  });
});
