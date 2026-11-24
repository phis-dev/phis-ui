import { describe, expect, it } from "vitest";

import {
  createEmptyPhiBuilderModulePresetPagesByArea,
  type PhiPresetPageNode,
} from "../../../../helpers/cms-page-catalog";
import type { PhiCmsPresetSource } from "../../../../types/cms-module-descriptors";
import { createPhiPageReference } from "../../../../types/references";
import { resolvePhiBuilderRevisionScope } from "../types";
import { resolvePhiRevisionsDraftContextTarget } from "./draft-context-target";

const ordersSource = {
  ownerModuleId: "@phis/shop",
  presetKey: "shop-orders-page",
  sourcePresetVersion: 1,
} as PhiCmsPresetSource;
const ordersPage: PhiPresetPageNode = {
  key: "m-shop-orders",
  title: "Orders",
  storagePath: "/shop/orders",
  catalogPath: "/orders",
  sourcePreset: ordersSource,
};
const catalog = {
  modulePresetPagesByArea: { ...createEmptyPhiBuilderModulePresetPagesByArea(), app: [ordersPage] },
  customPages: {},
  persistedPageCatalogByArea: {
    public: [{
      id: 41,
      reference: createPhiPageReference({ kind: "site", pageScopeId: 41 }),
      path: "/about",
      tombstoned: false,
    }],
  },
};
const pagesOf = (area: "app" | "public") => area === "app" ? [ordersPage] : [{ key: "about", title: "About", storagePath: "/about" }];

/*
 * A restore and a Page reset both name the scope the Revisions Table acted on. The Builder reads the
 * Area alone as its Shell, so a Page scope that named no Page discarded the Shell's edits and left the
 * Page showing what was replaced -- which every Module Page did, its scope having no path.
 */
describe("the Builder context a revision action replaced", () => {
  it("finds a Module Page by its preset identity, its scope carrying no path", () => {
    const scope = resolvePhiBuilderRevisionScope("page", "app", "m-shop-orders", pagesOf("app"), "");
    expect(scope.path).toBeNull();
    expect(resolvePhiRevisionsDraftContextTarget(scope, false, catalog))
      .toEqual({ area: "app", pageKey: "m-shop-orders" });
  });

  it("finds a Module Page whose stored path moved, by the same identity", () => {
    const moved = {
      ...catalog,
      persistedPageCatalogByArea: {
        app: [{
          id: 52,
          reference: createPhiPageReference({ kind: "site", pageScopeId: 52 }),
          path: "/shop/my-orders",
          ownerModuleId: ordersSource.ownerModuleId,
          presetKey: ordersSource.presetKey,
          tombstoned: false,
        }],
      },
    };
    const scope = { kind: "page", area: "app", path: null, sourcePreset: { ...ordersSource } };
    expect(resolvePhiRevisionsDraftContextTarget(scope, false, moved))
      .toEqual({ area: "app", pageKey: "m-shop-orders" });
  });

  it("finds the Site's own Page by its storage path", () => {
    const scope = resolvePhiBuilderRevisionScope("page", "public", "about", pagesOf("public"), "");
    expect(scope.path).toBe("/about");
    expect(resolvePhiRevisionsDraftContextTarget(scope, false, catalog))
      .toEqual({ area: "public", pageKey: "about" });
  });

  it("names the Shell for an Area scope, and the Module selection for a Modules revision", () => {
    const scope = resolvePhiBuilderRevisionScope("area", "app", "", [], "", "default", ordersSource);
    expect(resolvePhiRevisionsDraftContextTarget(scope, false, catalog)).toEqual({ area: "app" });
    expect(resolvePhiRevisionsDraftContextTarget(scope, true, catalog))
      .toEqual({ area: "app", areaModules: true });
  });

  it("names nothing for a Page scope that names no Page, rather than the Shell", () => {
    const unknown = {
      kind: "page",
      area: "app",
      path: null,
      sourcePreset: { ownerModuleId: "@phis/shop", presetKey: "gone", sourcePresetVersion: 1 },
    };
    expect(resolvePhiRevisionsDraftContextTarget(unknown, false, catalog)).toBeNull();
    expect(resolvePhiRevisionsDraftContextTarget({ kind: "page", area: "app", path: null }, false, catalog))
      .toBeNull();
  });

  it("names nothing for a Navigation or Theme scope", () => {
    expect(resolvePhiRevisionsDraftContextTarget({ kind: "navigation", area: "public", navKey: "header" }, false, catalog))
      .toBeNull();
    expect(resolvePhiRevisionsDraftContextTarget({ kind: "theme", area: "public", themeKey: "default" }, false, catalog))
      .toBeNull();
  });
});
