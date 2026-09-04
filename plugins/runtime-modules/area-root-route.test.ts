import { describe, expect, it } from "vitest";

import { PHI_CORE_ROLE_PROVIDER_ID } from "@phis/contracts/access";

import { createPhiAccountingRuntimeModuleCatalog } from "./area-catalogs/accounting";
import { createPhiAdminRuntimeModuleCatalog } from "./area-catalogs/admin";
import { createPhiAppRuntimeModuleCatalog } from "./area-catalogs/app";
import { createPhiEditorRuntimeModuleCatalog } from "./area-catalogs/editor";
import { createPhiBuilderRuntimeModuleCatalog } from "./catalog";
import { createPhiDefaultAreaRuntimeModuleIds } from "./builder/runtime-module-defaults";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./dashboard/ids";
import {
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePresetByIdentity,
} from "./descriptor-compiler";
import { buildPhiAreaRootRedirectTree } from "../../components/regions/presets/phi-area-root-redirect-tree";
import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import { PhiCmsPageType } from "../../constants/phi-cms";
import type { PhiBlockRuntime } from "../../types";
import type { PhiCmsPageNode } from "../../types/cms";
import type { PhiRuntimeModuleId } from "../../types/cms-module-descriptors";

/**
 * Where an Area's front door leads.
 *
 * The root of every Area but Public is a redirect, and it names its destination by reading the Area's
 * own navigation rather than by hard-coding a path. That is the part worth pinning: the Dashboard is a
 * Module, and switching a Module off has to move the front door instead of breaking it.
 */

const ALL_BASE_ROLE_FLAGS = 0b111_1111;

const runtime = {
  viewer: {
    access: "authenticated",
    roleClaims: [{ providerId: PHI_CORE_ROLE_PROVIDER_ID, flags: ALL_BASE_ROLE_FLAGS }],
    groupClaims: [],
  },
} as unknown as PhiBlockRuntime;

const page: PhiCmsPageNode = {
  id: -1,
  siteId: 1,
  areaMask: 0,
  path: "/",
  pageType: PhiCmsPageType.Standard,
  status: 1,
  flags: 0,
  visibilityMask: 0,
  accessPolicy: { access: "anyone" },
  titleMsgId: null,
  descriptionMsgId: null,
  heroRootLayoutNodeId: null,
  headerBottomRootLayoutNodeId: null,
  siderRightRootLayoutNodeId: null,
  footerTopRootLayoutNodeId: null,
  drawerRightRootLayoutNodeId: null,
  contentRootLayoutNodeId: null,
  layoutConfig: {},
};

const CATALOG_BY_AREA = {
  app: createPhiAppRuntimeModuleCatalog,
  accounting: createPhiAccountingRuntimeModuleCatalog,
  admin: createPhiAdminRuntimeModuleCatalog,
  editor: createPhiEditorRuntimeModuleCatalog,
  builder: createPhiBuilderRuntimeModuleCatalog,
} as const;

async function resolveRootRedirect(
  area: keyof typeof CATALOG_BY_AREA,
  { withoutDashboard = false }: { withoutDashboard?: boolean } = {},
) {
  const catalog = CATALOG_BY_AREA[area]();
  const compiled = resolvePhiCmsDescriptorCatalog(catalog);
  const definition = compiled.areaDefinitions.get(area as PhiCmsAreaKey);
  if (!definition) {
    throw new Error(`Area "${area}" is not declared.`);
  }
  const route = resolvePhiCmsRoutePresetByIdentity(
    compiled,
    definition.baseModuleId,
    `${area}-root-page`,
  );
  if (!route) {
    throw new Error(`Area "${area}" has no root route preset.`);
  }
  const activeModuleIds = new Set<PhiRuntimeModuleId>([
    definition.baseModuleId,
    ...createPhiDefaultAreaRuntimeModuleIds(area),
  ]);
  if (withoutDashboard) {
    activeModuleIds.delete(PHI_DASHBOARD_RUNTIME_MODULE_ID);
  }

  const tree = await route.loadTree({
    page,
    runtime,
    catalog: compiled,
    activeModuleIds,
    params: {},
  });
  return tree.page;
}

describe("an Area root", () => {
  it.each(["app", "accounting", "admin", "editor", "builder"] as const)(
    "forwards %s to its Dashboard",
    async (area) => {
      const resolved = await resolveRootRedirect(area);
      expect(resolved.pageType).toBe(PhiCmsPageType.Redirect);
      expect(resolved.layoutConfig.redirect).toEqual({
        target: { area, path: "/dashboard" },
        status: 307,
      });
    },
  );

  it("moves to the next entry when the Dashboard Module is switched off", async () => {
    const resolved = await resolveRootRedirect("builder", { withoutDashboard: true });
    expect(resolved.pageType).toBe(PhiCmsPageType.Redirect);
    expect(resolved.layoutConfig.redirect).toMatchObject({
      target: { area: "builder", path: "/modules" },
    });
  });

  it("falls back to the Area's own page, not to the Module's", async () => {
    const resolved = await resolveRootRedirect("accounting", { withoutDashboard: true });
    expect(resolved.layoutConfig.redirect).toMatchObject({
      target: { area: "accounting", path: "/overview" },
    });
  });

  it("renders nothing rather than forwarding to itself when no entry is left", () => {
    // No surface answers to that key, so nothing names a destination. Forwarding to a guessed path
    // would turn an Area with no reachable page into a redirect loop on its own front door.
    const compiled = resolvePhiCmsDescriptorCatalog(createPhiAccountingRuntimeModuleCatalog());
    const resolved = buildPhiAreaRootRedirectTree({
      page,
      runtime,
      catalog: compiled,
      activeModuleIds: new Set<PhiRuntimeModuleId>([
        compiled.areaDefinitions.get("accounting")!.baseModuleId,
      ]),
      area: "accounting",
      navKey: "accounting:nowhere",
      title: "Accounting",
    }).page;

    expect(resolved.pageType).toBe(PhiCmsPageType.Standard);
    expect(resolved.layoutConfig.redirect).toBeUndefined();
  });
});
