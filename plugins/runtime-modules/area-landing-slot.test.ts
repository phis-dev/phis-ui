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
import {
  choosePhiAreaRootApplicant,
  type PhiAreaLandingSelection,
} from "../../helpers/cms-area-config";
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
  landingSelection,
}: {
  entries?: PhiRuntimeModuleCatalog;
  activeModuleIds?: Set<PhiRuntimeModuleId>;
  landingSelection?: PhiAreaLandingSelection | null;
} = {}) {
  return compilePhiCmsActiveRouteTable({
    catalog: resolvePhiCmsDescriptorCatalog(entries),
    area: "public",
    activeModuleIds: activeModuleIds ?? new Set<PhiRuntimeModuleId>([...entries.keys()]),
    landingSelection,
  });
}

function chose(identity: PhiCmsPresetIdentity): PhiAreaLandingSelection {
  return { kind: "preset", identity };
}

describe("the Area root slot", () => {
  it("is the base Module's Page when nobody applies", () => {
    const root = resolvePhiCmsRoutePreset(compile(), "/");
    expect(root?.descriptor.ownerModuleId).toBe(PHI_PUBLIC_RUNTIME_MODULE_ID);
    // It holds the slot as the fallback rung, not as an application: a built-in Page never applies,
    // or every Site would ship with the table already occupied and adoption would never fire.
    expect(root?.descriptor.landingPage).toBeUndefined();
  });

  it("goes to a single applicant unasked, so an installed Site package is live at once", () => {
    const root = resolvePhiCmsRoutePreset(compile({ entries: withOfferor() }), "/");
    expect(root?.descriptor.ownerModuleId).toBe(OFFEROR_ID);
  });

  it("stays with the base Module when the Site answered the slot with nobody", () => {
    /*
     * "Landing, no applicant" is a decision and outranks the adoption: the Builder is looking at an
     * empty applicant Select and authors the root themselves. Reading it as "never asked" is what used
     * to hand the front door to a Module while the Select still showed blank.
     */
    const root = resolvePhiCmsRoutePreset(
      compile({ entries: withOfferor(), landingSelection: { kind: "empty" } }),
      "/",
    );
    expect(root?.descriptor.ownerModuleId).toBe(PHI_PUBLIC_RUNTIME_MODULE_ID);
  });

  it("goes to the applicant the Site chose", () => {
    const table = compile({
      entries: withOfferor(),
      landingSelection: chose({ ownerModuleId: OFFEROR_ID, presetKey: OFFERED_PRESET_KEY }),
    });
    expect(resolvePhiCmsRoutePreset(table, "/")?.descriptor.ownerModuleId).toBe(OFFEROR_ID);
  });

  it("leaves the application that was not answered out of the table entirely", () => {
    const table = compile({
      entries: withOfferor(),
      landingSelection: chose({ ownerModuleId: OFFEROR_ID, presetKey: OFFERED_PRESET_KEY }),
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
      landingSelection: chose({ ownerModuleId: OFFEROR_ID, presetKey: OFFERED_PRESET_KEY }),
    });
    expect(resolvePhiCmsRoutePreset(table, "/")?.descriptor.ownerModuleId).toBe(PHI_PUBLIC_RUNTIME_MODULE_ID);
  });

  it("adopts the replacement when the chosen applicant was swapped for another package", () => {
    /*
     * An Operator removes the example package and installs their own. The config still names the old
     * one, which is not there to be found -- so the naming falls through to the adoption rather than
     * to the blank, and the new package's landing stands at the front door without anybody editing
     * the sentence the old one left behind.
     */
    const table = compile({
      entries: withOfferor(),
      landingSelection: chose({ ownerModuleId: OFFEROR_ID, presetKey: "removed-example-page" }),
    });
    expect(resolvePhiCmsRoutePreset(table, "/")?.descriptor.ownerModuleId).toBe(OFFEROR_ID);
  });
});

/**
 * The same chain, read the other way round.
 *
 * The route table decides what a visitor is served; the Builder's Page list decides which `/` an
 * author is offered and fills the canvas with. They share this function precisely so those two can
 * never answer differently -- so it is pinned here in the shape the Builder passes, not only in the
 * shape the compiler does.
 */
describe("the applicant chosen for the root slot", () => {
  const base = { ownerModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID, presetKey: "public-welcome-page" };
  const offeror = { ownerModuleId: OFFEROR_ID, presetKey: OFFERED_PRESET_KEY, landingPage: true };
  const second = {
    ownerModuleId: "@acme/other/modules/site" as unknown as PhiRuntimeModuleId,
    presetKey: "other-welcome-page",
    landingPage: true,
  };
  const choose = (
    applicants: readonly (typeof base | typeof offeror)[],
    landingSelection?: PhiAreaLandingSelection | null,
  ) => choosePhiAreaRootApplicant(applicants, (applicant) => applicant, {
    baseModuleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
    landingSelection,
  });

  it("is the base Module's Page when nobody offers one", () => {
    expect(choose([base])).toBe(base);
  });

  it("is the single offer, unasked", () => {
    expect(choose([base, offeror])).toBe(offeror);
  });

  it("is the base Module's Page again once a second Module applies", () => {
    // Two applications and no answer is a question, not a winner: it falls back rather than guessing.
    expect(choose([base, offeror, second])).toBe(base);
  });

  it("is the named applicant once the Site answers", () => {
    expect(choose([base, offeror, second], { kind: "preset", identity: second })).toBe(second);
  });

  it("is the base Module's Page when the Site answered with nobody", () => {
    expect(choose([base, offeror], { kind: "empty" })).toBe(base);
  });

  it("has nothing to choose when nobody applies at all", () => {
    expect(choose([])).toBeNull();
  });
});
