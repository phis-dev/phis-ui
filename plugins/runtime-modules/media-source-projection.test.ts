import { describe, expect, it } from "vitest";

import { collectPhiSiteModuleClientContributions } from "../../module-projection-client";
import type { PhiMediaSourceClientDefinition } from "../../types/media-source";
import type { PhiRuntimeModuleId } from "../../types/cms-plugins";
import { createPhiRuntimeModuleMediaSourceClientManifest } from "../../components/runtime/runtime-module-media-source-client-manifest";
import { extendWithPhiSiteModuleClientManifests } from "./site-module-client-manifests";

/** The Client half of a Module's media sources: flattened by the projection, extended into the manifest. */

const SHOP_ID = "@acme/shop/modules/shop" as PhiRuntimeModuleId;

function source(key: `${string}/${string}`): PhiMediaSourceClientDefinition {
  return {
    key,
    ownerModuleId: SHOP_ID,
    load: async () => ({
      describe: async () => ({ label: "Stock" }),
      list: async () => ({ items: [], nextCursor: null }),
      take: async () => { throw new Error("not taken"); },
    }),
  };
}

describe("media sources in the Client projection", () => {
  it("flattens them out of every package, never into an Area", () => {
    const projection = collectPhiSiteModuleClientContributions({
      placements: [{ moduleId: SHOP_ID, eligibleAreas: ["public"] }] as never,
      clients: [
        { modules: [], mediaSources: [source("@acme/shop/stock")] },
        { modules: [], mediaSources: [source("@acme/other/archive")] },
        { modules: [] },
      ],
    });
    expect(projection.mediaSources.map((entry) => entry.key)).toEqual(["@acme/shop/stock", "@acme/other/archive"]);
    for (const area of Object.values(projection.areas)) {
      expect(Object.keys(area ?? {})).not.toContain("mediaSources");
    }
  });

  it("reaches the manifest of every Area, and a key twice is refused where it is composed", () => {
    const projection = collectPhiSiteModuleClientContributions({
      placements: [] as never,
      clients: [{ modules: [], mediaSources: [source("@acme/shop/stock")] }],
    });
    const base = {
      controller: new Map(),
      render: new Map(),
      dataProvider: new Map(),
      calendarAdapter: new Map(),
      mediaSource: createPhiRuntimeModuleMediaSourceClientManifest([]),
      uiProvider: new Map(),
    } as unknown as Parameters<typeof extendWithPhiSiteModuleClientManifests>[2];
    for (const area of ["public", "app", "editor"] as const) {
      expect(extendWithPhiSiteModuleClientManifests(projection, area, base).mediaSource.has("@acme/shop/stock"))
        .toBe(true);
    }
    const taken = {
      ...base,
      mediaSource: createPhiRuntimeModuleMediaSourceClientManifest([source("@acme/shop/stock")]),
    } as typeof base;
    expect(() => extendWithPhiSiteModuleClientManifests(projection, "public", taken))
      .toThrow(/Duplicate media source Client loader for "@acme\/shop\/stock"/);
  });
});
