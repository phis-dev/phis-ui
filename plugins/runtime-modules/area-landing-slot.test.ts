import { describe, expect, it } from "vitest";

import { createPhiAppRuntimeModuleCatalog } from "./area-catalogs/app";
import { createPhiPublicRuntimeModuleCatalog } from "./area-catalogs/public";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "./descriptor-compiler";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./public/ids";
import type {
  PhiCmsPresetIdentity,
  PhiRuntimeModuleId,
} from "../../types/cms-module-descriptors";
import type {
  PhiRuntimeModuleCatalog,
  PhiRuntimeModuleCatalogEntry,
} from "../../types/cms-plugins";

/**
 * The Area root as a slot with applicants, rather than an address two Modules contest.
 *
 * A Module that declares a Page at `/` is applying for the front door, not claiming an address, so a
 * second one changes nothing until the Site says so: no collision, no rename, no refusal. What this
 * pins is the difference that makes -- who answers before a choice, after one, and when the Module
 * that was chosen is gone.
 */

const OFFEROR_ID = "@acme/welcome/modules/site" as unknown as PhiRuntimeModuleId;
const OFFERED_PRESET_KEY = "acme-welcome-page";

const catalogEntries = createPhiPublicRuntimeModuleCatalog();
const appCatalogEntries = createPhiAppRuntimeModuleCatalog();
const baseModuleIds = new Set<PhiRuntimeModuleId>([...catalogEntries.keys()]);

/** A Module whose only Page is a landing it offers, and nothing else. */
function buildOfferorEntry(area: "public" | "app") {
  return {
    definition: {
      moduleId: OFFEROR_ID,
      kind: "module",
      eligibleAreas: [area],
      title: "Welcome",
      description: "One page, offered as a front door.",
      category: "content",
      iconFamily: "dashboard",
    },
    widgets: [],
    layouts: [],
    routes: [{
      ownerModuleId: OFFEROR_ID,
      presetKey: OFFERED_PRESET_KEY,
      presetVersion: 1,
      area,
      title: "Welcome",
      path: "/",
      landingPage: true,
      loadTree: () => {
        throw new Error("The route table never draws a tree.");
      },
    }],
    load: () => Promise.resolve({}),
  } as unknown as PhiRuntimeModuleCatalogEntry;
}

function withOfferor() {
  const entries = Object.assign(new Map(catalogEntries), {
    areaDefinitions: catalogEntries.areaDefinitions,
    platformModuleId: catalogEntries.platformModuleId,
  });
  entries.set(OFFEROR_ID, buildOfferorEntry("public"));
  return entries;
}

function compile({
  entries = catalogEntries,
  activeModuleIds,
  landingPreset,
}: {
  entries?: PhiRuntimeModuleCatalog;
  activeModuleIds?: Set<PhiRuntimeModuleId>;
  landingPreset?: PhiCmsPresetIdentity | null;
} = {}) {
  return compilePhiCmsActiveRouteTable({
    catalog: resolvePhiCmsDescriptorCatalog(entries),
    area: "public",
    activeModuleIds: activeModuleIds ?? new Set<PhiRuntimeModuleId>([...entries.keys()]),
    landingPreset,
  });
}

describe("the Area root slot", () => {
  it("is the base Module's landing when nobody else applies", () => {
    const root = resolvePhiCmsRoutePreset(compile(), "/");
    expect(root?.descriptor.ownerModuleId).toBe(PHI_PUBLIC_RUNTIME_MODULE_ID);
    expect(root?.descriptor.landingPage).toBe(true);
  });

  it("stays with the base Module while a second application is unanswered", () => {
    // Not a collision: the applicant keeps working, it simply does not stand at the front door.
    const root = resolvePhiCmsRoutePreset(compile({ entries: withOfferor() }), "/");
    expect(root?.descriptor.ownerModuleId).toBe(PHI_PUBLIC_RUNTIME_MODULE_ID);
  });

  it("goes to the applicant the Site chose", () => {
    const table = compile({
      entries: withOfferor(),
      landingPreset: { ownerModuleId: OFFEROR_ID, presetKey: OFFERED_PRESET_KEY },
    });
    expect(resolvePhiCmsRoutePreset(table, "/")?.descriptor.ownerModuleId).toBe(OFFEROR_ID);
  });

  it("leaves the application that was not answered out of the table entirely", () => {
    const table = compile({
      entries: withOfferor(),
      landingPreset: { ownerModuleId: OFFEROR_ID, presetKey: OFFERED_PRESET_KEY },
    });
    const paths = [...table.exactByPath.keys()].filter((path) => path === "/");
    expect(paths).toEqual(["/"]);
    expect([...table.byPageId.values()].filter((descriptor) => descriptor.path === "/")).toHaveLength(1);
  });

  it("goes to a single applicant unasked, where the base Module only forwards", () => {
    /*
     * The App root is the machinery that forwards to the first navigation entry, and does not claim to
     * be a landing. One Module offering one means there is nothing to ask about -- and it still travels
     * through the draft, because the Module selection it rides on does.
     */
    const entries = Object.assign(new Map(appCatalogEntries), {
      areaDefinitions: appCatalogEntries.areaDefinitions,
      platformModuleId: appCatalogEntries.platformModuleId,
    });
    entries.set(OFFEROR_ID, buildOfferorEntry("app"));
    const table = compilePhiCmsActiveRouteTable({
      catalog: resolvePhiCmsDescriptorCatalog(entries),
      area: "app",
      activeModuleIds: new Set<PhiRuntimeModuleId>([...entries.keys()]),
    });
    expect(resolvePhiCmsRoutePreset(table, "/")?.descriptor.ownerModuleId).toBe(OFFEROR_ID);
  });

  it("falls back when the chosen applicant is switched off", () => {
    // The front door moves rather than breaking, which is what makes a Module safe to switch off.
    const table = compile({
      entries: withOfferor(),
      activeModuleIds: baseModuleIds,
      landingPreset: { ownerModuleId: OFFEROR_ID, presetKey: OFFERED_PRESET_KEY },
    });
    expect(resolvePhiCmsRoutePreset(table, "/")?.descriptor.ownerModuleId).toBe(PHI_PUBLIC_RUNTIME_MODULE_ID);
  });
});
