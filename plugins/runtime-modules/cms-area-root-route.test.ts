import { describe, expect, it } from "vitest";

import {
  applyPhiAreaRootRouteDecision,
  resolvePhiAreaModulePageReferencePath,
} from "../../helpers/cms-area-root-route";
import { readPhiAreaPresetRuntimeModuleIds, readPhiAreaRootRoute } from "../../helpers/cms-area-config";
import { PhiCmsPageType } from "../../constants/phi-cms";
import { createPhiBuilderRuntimeModuleCatalog } from "./catalog";
import { createPhiDefaultAreaRuntimeModuleIds } from "./area-module-defaults";
import { compilePhiCmsActiveRouteTable, resolvePhiCmsDescriptorCatalog } from "./descriptor-compiler";
import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./dashboard/ids";
import type { PhiResolvedCmsPageTree } from "../../types/cms";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";
import { createPhiPageReference } from "../../types/references";

/*
 * The configurable half of an Area's front door.
 *
 * The stored answer is a Page reference rather than a path, so resolving it has to be able to say
 * "nothing" -- for a Module that is switched off, for a viewer who may not reach the route, and for a
 * reference pointing into another Area. Every one of those falls back to the preset, which is the
 * behaviour that keeps a Module safe to switch off.
 */

const catalog = resolvePhiCmsDescriptorCatalog(createPhiBuilderRuntimeModuleCatalog());
const builderModuleIds = new Set<PhiRuntimeModuleId>([
  catalog.areaDefinitions.get("builder")!.baseModuleId,
  ...createPhiDefaultAreaRuntimeModuleIds("builder"),
]);

const dashboardReference = createPhiPageReference({
  kind: "module",
  ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
  presetKey: "builder-dashboard-page",
});

function tableOf(area: PhiCmsAreaKey, activeModuleIds: ReadonlySet<PhiRuntimeModuleId>) {
  return compilePhiCmsActiveRouteTable({ catalog, area, activeModuleIds });
}

function resolveDashboard(overrides: {
  area?: PhiCmsAreaKey;
  activeModuleIds?: ReadonlySet<PhiRuntimeModuleId>;
} = {}) {
  return resolvePhiAreaModulePageReferencePath({
    reference: dashboardReference,
    routeTable: tableOf(overrides.area ?? "builder", overrides.activeModuleIds ?? builderModuleIds),
  });
}

function payloadWith(page: Partial<PhiResolvedCmsPageTree["page"]>) {
  return {
    page: {
      page: { pageType: PhiCmsPageType.Standard, layoutConfig: {}, ...page },
      pageMeta: { title: { msgId: 0, source: "", value: "" }, description: null },
      overlays: [],
      regions: [],
      layoutNodes: [],
      contentWidgets: [],
    } as unknown as PhiResolvedCmsPageTree,
  };
}

describe("a configured root route", () => {
  it("reads a redirect a Builder stored", () => {
    expect(readPhiAreaRootRoute({
      shell: { rootRoute: { mode: "redirect", target: dashboardReference } },
    })).toEqual({ mode: "redirect", target: dashboardReference });
  });

  it("reads a landing page, which names no target", () => {
    expect(readPhiAreaRootRoute({ shell: { rootRoute: { mode: "landing" } } }))
      .toEqual({ mode: "landing" });
  });

  it("reads nothing from the Module selection's namespace", () => {
    // The two halves are separate on purpose; a root route stored in the wrong one is not one.
    expect(readPhiAreaRootRoute({ modules: { rootRoute: { mode: "landing" } } })).toBeNull();
  });

  it("reads nothing from a target that is a path", () => {
    expect(readPhiAreaRootRoute({
      shell: { rootRoute: { mode: "redirect", target: "/dashboard" } },
    })).toBeNull();
  });
});

describe("resolving a Module-carried target", () => {
  it("names the path the Module's route answers", () => {
    expect(resolveDashboard()).toBe("/phis/ui/dashboard");
  });

  it("resolves nothing once the Module is switched off", () => {
    const without = new Set(builderModuleIds);
    without.delete(PHI_DASHBOARD_RUNTIME_MODULE_ID);
    expect(resolveDashboard({ activeModuleIds: without })).toBeNull();
  });

  /*
   * The inverse of what this test used to assert.
   *
   * It checked that a route with a narrower policy than its Area resolved to nothing for a viewer that
   * policy would refuse -- which made an Area's front door move with the reader. ACCESS.md now states
   * the opposite: a route is in or out by Module selection, and a Module that may not show this person
   * what the Page holds answers that inside the Page.
   */
  it("resolves the same path whatever the reader holds", () => {
    const settingsReference = createPhiPageReference({
      kind: "module",
      ownerModuleId: "@phis/ui/modules/admin",
      presetKey: "admin-settings-general-page",
    });
    const resolved = resolvePhiAreaModulePageReferencePath({
      reference: settingsReference,
      routeTable: tableOf("admin", new Set<PhiRuntimeModuleId>(["@phis/ui/modules/admin" as PhiRuntimeModuleId])),
    });

    expect(resolved).toMatch(/^\/phis\/ui\/settings\//u);
  });

  it("resolves nothing across Areas, where the same path means another page", () => {
    expect(resolveDashboard({
      area: "admin",
      activeModuleIds: new Set<PhiRuntimeModuleId>(["@phis/ui/modules/admin" as PhiRuntimeModuleId]),
    })).toBeNull();
  });
});

describe("applying the decision", () => {
  it("turns the resolved page into a forward, keeping what the Area knew about it", () => {
    const applied = applyPhiAreaRootRouteDecision(
      payloadWith({ layoutConfig: { canonical: "/" } }),
      { kind: "forward", path: "/dashboard" },
      "builder",
    );

    expect(applied.page.page.pageType).toBe(PhiCmsPageType.Redirect);
    expect(applied.page.page.layoutConfig).toEqual({
      canonical: "/",
      redirect: { target: { area: "builder", path: "/dashboard" }, status: 307 },
    });
  });

  it("strips a forward when the Builder chose a landing page", () => {
    const applied = applyPhiAreaRootRouteDecision(
      payloadWith({
        pageType: PhiCmsPageType.Redirect,
        layoutConfig: { redirect: { target: { area: "builder", path: "/modules" }, status: 307 } },
      }),
      { kind: "page" },
      "builder",
    );

    expect(applied.page.page.pageType).toBe(PhiCmsPageType.Standard);
    expect(applied.page.page.layoutConfig).toEqual({});
  });

  it("leaves a landing page that already is one alone", () => {
    const payload = payloadWith({ pageType: PhiCmsPageType.Landing });
    expect(applyPhiAreaRootRouteDecision(payload, { kind: "page" }, "public")).toBe(payload);
  });
});

describe("the Modules an Area preset activates", () => {
  const treeWith = (config: Record<string, unknown> | null) => ({
    runtimeModuleIds: undefined,
    preset: { config },
  } as unknown as Parameters<typeof readPhiAreaPresetRuntimeModuleIds>[0]);

  it("takes the Area's own default when the preset states nothing", () => {
    // The case the Shell namespace made reachable: a structure save stores `config.shell` and no
    // Modules namespace, and reading that as "none" would switch every optional Module off.
    expect(readPhiAreaPresetRuntimeModuleIds(treeWith({ shell: { rootRoute: { mode: "landing" } } }), "admin"))
      .toEqual(createPhiDefaultAreaRuntimeModuleIds("admin"));
    expect(readPhiAreaPresetRuntimeModuleIds(treeWith(null), "builder"))
      .toEqual(createPhiDefaultAreaRuntimeModuleIds("builder"));
  });

  it("takes an empty selection literally, which is a Builder switching everything off", () => {
    expect(readPhiAreaPresetRuntimeModuleIds(treeWith({ modules: { runtimeModules: [] } }), "admin"))
      .toEqual([]);
  });

  it("takes what the preset states", () => {
    expect(readPhiAreaPresetRuntimeModuleIds(
      treeWith({ modules: { runtimeModules: [PHI_DASHBOARD_RUNTIME_MODULE_ID] } }),
      "admin",
    )).toEqual([PHI_DASHBOARD_RUNTIME_MODULE_ID]);
  });
});
