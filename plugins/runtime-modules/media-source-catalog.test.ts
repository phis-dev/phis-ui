import { describe, expect, it } from "vitest";

import type { PhiMediaSourceDescriptor } from "../../types/media-source";
import type {
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
  PhiRuntimeModuleId,
} from "../../types/cms-plugins";
import { createPhiRuntimeModuleCatalog } from "./contracts";

/** What the catalog says of a Module's `mediaSources`, the way it says it of Calendar adapters. */

const PLATFORM_ID = "@test/pkg/modules/platform" as PhiRuntimeModuleId;
const SHOP_ID = "@acme/shop/modules/shop" as PhiRuntimeModuleId;
const OTHER_ID = "@acme/other/modules/other" as PhiRuntimeModuleId;

function definition(
  moduleId: PhiRuntimeModuleId,
  kind: "platform" | "module",
  mediaSources?: readonly PhiMediaSourceDescriptor[],
): PhiRuntimeModuleDefinition {
  const key = moduleId.split("/").at(-1)!;
  return {
    moduleId,
    kind,
    eligibleAreas: ["app"],
    serverBinding: { providerId: "@phis/server/core", requiredCapabilities: [] },
    controllerType: `@test/${key}`,
    controller: {
      pluginKey: "@test",
      key,
      title: key,
      allowedMountScopes: ["area"],
      runtimeSignals: { emits: [], listens: [] },
    },
    title: moduleId,
    description: `Test runtime module ${moduleId}.`,
    category: "other",
    iconFamily: "test",
    controllerMountPolicy: "area",
    ...(mediaSources ? { mediaSources } : {}),
  } satisfies PhiRuntimeModuleDefinition;
}

function entry(
  moduleId: PhiRuntimeModuleId,
  kind: "platform" | "module",
  mediaSources?: readonly PhiMediaSourceDescriptor[],
): PhiRuntimeModuleCatalogEntry {
  return {
    definition: definition(moduleId, kind, mediaSources),
    widgets: [],
    layouts: [],
    load: async () => {
      throw new Error("not executed");
    },
  };
}

function catalogOf(...entries: PhiRuntimeModuleCatalogEntry[]) {
  return createPhiRuntimeModuleCatalog(
    [entry(PLATFORM_ID, "platform"), ...entries],
    [],
  );
}

describe("media sources in the Module catalog", () => {
  it("takes a namespaced key its declaring Module owns", () => {
    const catalog = catalogOf(entry(SHOP_ID, "module", [
      { key: "@acme/shop/stock", ownerModuleId: SHOP_ID, title: "Stock photos" },
    ]));
    expect(catalog.get(SHOP_ID)?.definition.mediaSources?.map((source) => source.key))
      .toEqual(["@acme/shop/stock"]);
  });

  it("refuses a key that is not namespaced", () => {
    expect(() => catalogOf(entry(SHOP_ID, "module", [
      { key: "stock" as never, ownerModuleId: SHOP_ID, title: "Stock photos" },
    ]))).toThrow(/invalid media source key "stock"/);
  });

  it("refuses a source another Module owns", () => {
    expect(() => catalogOf(entry(SHOP_ID, "module", [
      { key: "@acme/shop/stock", ownerModuleId: OTHER_ID, title: "Stock photos" },
    ]))).toThrow(/has a different owner module id/);
  });

  it("refuses a key owned twice, by one Module or by two", () => {
    const source = (ownerModuleId: PhiRuntimeModuleId): PhiMediaSourceDescriptor =>
      ({ key: "@acme/shared/stock", ownerModuleId, title: "Stock photos" });
    expect(() => catalogOf(entry(SHOP_ID, "module", [source(SHOP_ID), source(SHOP_ID)])))
      .toThrow(/Media source "@acme\/shared\/stock" is owned by both/);
    expect(() => catalogOf(
      entry(SHOP_ID, "module", [source(SHOP_ID)]),
      entry(OTHER_ID, "module", [source(OTHER_ID)]),
    )).toThrow(/Media source "@acme\/shared\/stock" is owned by both/);
  });
});
