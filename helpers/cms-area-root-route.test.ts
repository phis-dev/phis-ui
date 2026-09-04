import { describe, expect, it } from "vitest";

import { PHI_CORE_ROLE_PROVIDER_ID } from "@phis/contracts/access";

import {
  applyPhiAreaRootRouteDecision,
  resolvePhiAreaModulePageReferencePath,
} from "./cms-area-root-route";
import { readPhiAreaRootRoute } from "./cms-area-config";
import { PhiCmsPageType } from "../constants/phi-cms";
import { createPhiBuilderRuntimeModuleCatalog } from "../plugins/runtime-modules/catalog";
import { createPhiDefaultAreaRuntimeModuleIds } from "../plugins/runtime-modules/builder/runtime-module-defaults";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/dashboard/ids";
import { resolvePhiCmsDescriptorCatalog } from "../plugins/runtime-modules/descriptor-compiler";
import type { PhiBlockRuntime } from "../types";
import type { PhiResolvedCmsPageTree } from "../types/cms";
import type { PhiRuntimeModuleId } from "../types/cms-module-descriptors";
import { createPhiPageReference } from "../types/references";

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
  "@phis/ui/builder" as PhiRuntimeModuleId,
  ...createPhiDefaultAreaRuntimeModuleIds("builder"),
]);
const developer = {
  access: "authenticated",
  roleClaims: [{ providerId: PHI_CORE_ROLE_PROVIDER_ID, flags: 0b111_1111 }],
  groupClaims: [],
} as unknown as PhiBlockRuntime["viewer"];

const dashboardReference = createPhiPageReference({
  kind: "module",
  ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
  presetKey: "builder-dashboard-page",
});

function resolveDashboard(overrides: {
  area?: Parameters<typeof resolvePhiAreaModulePageReferencePath>[0]["area"];
  activeModuleIds?: ReadonlySet<PhiRuntimeModuleId>;
  viewer?: PhiBlockRuntime["viewer"];
} = {}) {
  return resolvePhiAreaModulePageReferencePath({
    reference: dashboardReference,
    area: overrides.area ?? "builder",
    catalog,
    activeModuleIds: overrides.activeModuleIds ?? builderModuleIds,
    viewer: overrides.viewer ?? developer,
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
    expect(resolveDashboard()).toBe("/dashboard");
  });

  it("resolves nothing once the Module is switched off", () => {
    const without = new Set(builderModuleIds);
    without.delete(PHI_DASHBOARD_RUNTIME_MODULE_ID);
    expect(resolveDashboard({ activeModuleIds: without })).toBeNull();
  });

  it("resolves nothing for a viewer the route itself would refuse", () => {
    const settingsReference = createPhiPageReference({
      kind: "module",
      ownerModuleId: "@phis/ui/modules/admin",
      presetKey: "admin-settings-general-page",
    });
    const resolve = (viewer: PhiBlockRuntime["viewer"]) => resolvePhiAreaModulePageReferencePath({
      reference: settingsReference,
      area: "admin",
      catalog,
      activeModuleIds: new Set<PhiRuntimeModuleId>(["@phis/ui/modules/admin" as PhiRuntimeModuleId]),
      viewer,
    });

    expect(resolve(developer)).toMatch(/^\/settings\//u);
    expect(resolve({
      access: "authenticated",
      roleClaims: [],
      groupClaims: [],
    } as unknown as PhiBlockRuntime["viewer"])).toBeNull();
  });

  it("resolves nothing across Areas, where the same path means another page", () => {
    expect(resolveDashboard({ area: "admin" })).toBeNull();
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
