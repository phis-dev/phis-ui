import { describe, expect, it } from "vitest";

import {
  cutPhiRuntimeModuleServerAreaContribution,
  definePhiRuntimeModuleServerAreaContribution,
  mergePhiRuntimeModuleServerAreaContributions,
  type PhiRuntimeModuleServerAreaContribution,
} from "./area-contributions";
import type {
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
  PhiRuntimeModuleWidgetDefinition,
} from "../../types/cms-plugins";

/**
 * What an Area receives of a Module that reaches more than one.
 *
 * This is the seam the Marketplace fell through: it is admitted to `app` and `public`, and the whole
 * contribution used to arrive in both, so the public catalog was handed a Page addressed to `app` and
 * refused to compile. `eligibleAreas` says where a Module may appear; every descriptor says where it
 * belongs, and the two are not the same sentence.
 */

const MODULE_ID = "@acme/catalogue/modules/catalogue" as const;

const DEFINITION = {
  moduleId: MODULE_ID,
  kind: "module",
  eligibleAreas: ["app", "public"],
  serverBinding: { providerId: "@acme/catalogue", requiredCapabilities: [] },
  title: "Catalogue",
  description: "Rows to show, and a desk to keep them from.",
  category: "commerce",
  iconFamily: "dashboard",
} as const satisfies PhiRuntimeModuleDefinition;

/** Only the fields the cut reads; the loaders never run here. */
const WIDGET = { definition: { pluginKey: "@acme/catalogue", typeKey: "card" } } as unknown as
  PhiRuntimeModuleWidgetDefinition;

function buildContribution(
  entry: Partial<PhiRuntimeModuleCatalogEntry> = {},
): PhiRuntimeModuleServerAreaContribution {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: MODULE_ID,
    catalogEntry: {
      definition: DEFINITION,
      widgets: [WIDGET],
      layouts: [],
      load: () => Promise.resolve({ ...DEFINITION }),
      ...entry,
    } as PhiRuntimeModuleCatalogEntry,
  });
}

const APP_ROUTE = {
  ownerModuleId: MODULE_ID,
  presetKey: "app-catalogue-page",
  presetVersion: 1,
  area: "app",
  pageKey: "catalogue",
  title: "Catalogue",
  path: "/catalogue",
  loadTree: () => Promise.resolve({}),
} as unknown as NonNullable<PhiRuntimeModuleCatalogEntry["routes"]>[number];

const APP_NAV = {
  navKey: "app:sidebar",
  parentItemKey: null,
  item: { itemKey: "@acme/catalogue/nav/app", label: { defaultMessage: "Catalogue" } },
} as unknown as NonNullable<PhiRuntimeModuleCatalogEntry["navigation"]>[number];

const PUBLIC_NAV = {
  navKey: "public:header",
  parentItemKey: null,
  item: { itemKey: "@acme/catalogue/nav/public", label: { defaultMessage: "Catalogue" } },
} as unknown as NonNullable<PhiRuntimeModuleCatalogEntry["navigation"]>[number];

describe("what one Area receives", () => {
  it("keeps the Page in the Area it was addressed to and nowhere else", () => {
    const contribution = buildContribution({ routes: [APP_ROUTE] });
    expect(cutPhiRuntimeModuleServerAreaContribution(contribution, "app").catalogEntry.routes)
      .toEqual([APP_ROUTE]);
    // The reason the public area went down: this used to arrive holding the app Page.
    expect(cutPhiRuntimeModuleServerAreaContribution(contribution, "public").catalogEntry.routes)
      .toEqual([]);
  });

  it("cuts navigation by the Area its key names", () => {
    const contribution = buildContribution({ navigation: [APP_NAV, PUBLIC_NAV] });
    expect(cutPhiRuntimeModuleServerAreaContribution(contribution, "public").catalogEntry.navigation)
      .toEqual([PUBLIC_NAV]);
  });

  it("leaves what has no Area alone", () => {
    // A Widget has to reach every Area its Module does -- that is what makes a Collection placeable
    // on a public page by a Module whose own desk is behind the sign-in.
    const contribution = buildContribution({ routes: [APP_ROUTE] });
    for (const area of ["app", "public"] as const) {
      expect(cutPhiRuntimeModuleServerAreaContribution(contribution, area).catalogEntry.widgets)
        .toEqual([WIDGET]);
    }
  });

  it("names the descriptor that addresses an Area the Module was never admitted to", () => {
    expect(() => buildContribution({
      routes: [{ ...APP_ROUTE, area: "admin" }] as PhiRuntimeModuleCatalogEntry["routes"],
    })).toThrow(/route "app-catalogue-page" addresses Area "admin"/);
  });
});

describe("what the Builder puts back together", () => {
  it("unions the navigation of every Area, not only the first one seen", () => {
    const merged = mergePhiRuntimeModuleServerAreaContributions([
      cutPhiRuntimeModuleServerAreaContribution(
        buildContribution({ navigation: [APP_NAV, PUBLIC_NAV] }),
        "app",
      ),
      cutPhiRuntimeModuleServerAreaContribution(
        buildContribution({ navigation: [APP_NAV, PUBLIC_NAV] }),
        "public",
      ),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.catalogEntry.navigation).toEqual([APP_NAV, PUBLIC_NAV]);
  });
});
