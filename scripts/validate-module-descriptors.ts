import { readPhiCmsNavigationTargetPath } from "../helpers/navigation-target";
import assert from "node:assert/strict";

import { PhiBaseRole } from "../constants/phi-base-roles";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";
import { PHI_PUBLIC_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/area-catalogs/public";
import { PHI_APP_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/area-catalogs/app";
import {
  compilePhiCmsActiveRouteTable,
  compilePhiCmsRoutePattern,
  resolvePhiCmsNavigationOverlay,
  resolvePhiCmsActiveNavigationSurfaces,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
  resolvePhiCmsRoutePresetByPageKey,
} from "../plugins/runtime-modules/descriptor-compiler";
import type {
  PhiCmsCompiledDescriptorCatalog,
  PhiCmsResolvedNavigationSurface,
  PhiCmsRoutePresetDescriptor,
  PhiRuntimeModuleId,
} from "../types/cms-module-descriptors";
import { PHI_CORE_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/core/ids";
import { PHI_ADMIN_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/admin/ids";
import { PHI_APP_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/app/ids";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/builder/ids";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/public/ids";
import { PHI_ASSET_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/asset/ids";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/auth/ids";
import { PHI_THEME_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/theme/ids";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/localization/ids";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/observability/ids";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/user-management/ids";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/dashboard/ids";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/revisions/ids";
import { resolvePhiRuntimeModuleIdsForArea } from "../plugins/runtime-modules/settings";
import { resolvePhiAuthUiRuntimeProjection } from "../plugins/runtime-modules/auth/ui-provider";
import { createPhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import { normalizePhiCmsRouteSegment } from "../helpers/cms-routing";
import {
  createPhiDraftCmsInstanceId,
  createPhiPresetCmsInstanceId,
} from "../types/cms-instance-id";

assert.equal(normalizePhiCmsRouteSegment("phis%2Bui%2Bauth"), "phis+ui+auth");

const catalog = resolvePhiCmsDescriptorCatalog(PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG);
const runtimeModuleDefinitions = [...PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values()]
  .map(({ definition }) => definition);
assert.throws(
  () => resolvePhiRuntimeModuleIdsForArea(
    "public",
    [PHI_PUBLIC_RUNTIME_MODULE_ID],
    runtimeModuleDefinitions,
  ),
  /Locked runtime module/,
);
let navigationSurfaceCount = 0;
let publicHeaderSurface: PhiCmsResolvedNavigationSurface | null = null;

for (const [area, definition] of catalog.areaDefinitions) {
  const activeModuleIds = new Set([
    definition.baseModuleId,
    PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.platformModuleId!,
    ...[...catalog.routesByArea.get(area) ?? []]
      .map(({ descriptor }) => descriptor.ownerModuleId),
  ]);
  const table = compilePhiCmsActiveRouteTable({ catalog, area, activeModuleIds });
  const navigationSurfaces = resolvePhiCmsActiveNavigationSurfaces({
    catalog,
    area,
    activeModuleIds,
  });
  navigationSurfaceCount += navigationSurfaces.length;
  if (area === "public") {
    publicHeaderSurface = navigationSurfaces.find(({ navKey }) => navKey === "public:header") ?? null;
  }
  for (const surface of navigationSurfaces) {
    assert.equal(surface.area, area);
    assert(surface.navKey.startsWith(`${area}:`));
    assert.equal(resolvePhiCmsNavigationOverlay(surface, null).surface, surface);
  }
  for (const pattern of catalog.routesByArea.get(area) ?? []) {
    const concretePath = pattern.descriptor.path.replace(/:[^/]+/, "contract-test-id");
    const binding = resolvePhiCmsRoutePreset(table, concretePath);
    assert(binding, `${area}:${concretePath} must resolve.`);
    assert.equal(binding.descriptor, pattern.descriptor);
    if (pattern.parameterName) {
      assert.equal(binding.params[pattern.parameterName], "contract-test-id");
    }
  }
}

assert(publicHeaderSurface, "Public header navigation surface must resolve.");
const publicHomeKey = "@phis/ui/modules/public/nav/home";
const publicTermsKey = "@phis/ui/modules/public/nav/terms";
const missingKey = "@test/pkg/modules/navigation/missing";
const navigationPresetId = (ownerModuleId: string, itemKey: string, navKey = "public:header") =>
  createPhiPresetCmsInstanceId({
    domain: "navigation",
    ownerModuleId,
    presetKey: navKey,
    nodeKey: itemKey,
  });
const publicHomeId = navigationPresetId(PHI_PUBLIC_RUNTIME_MODULE_ID, publicHomeKey);
const publicTermsId = navigationPresetId(PHI_PUBLIC_RUNTIME_MODULE_ID, publicTermsKey);
const missingId = navigationPresetId("@test/pkg/modules/navigation", missingKey);
const publicRegistrationId = navigationPresetId(
  PHI_AUTH_RUNTIME_MODULE_ID,
  "@phis/ui/modules/auth/nav/public/registration",
);
const overlayResolution = resolvePhiCmsNavigationOverlay(publicHeaderSurface, {
  navKey: "public:header",
  itemOverrides: [
    { id: publicHomeId, label: "Start" },
    { id: publicTermsId, placement: { parentId: null, index: 0 } },
    { id: missingId, label: "Dormant" },
  ],
  customItems: [],
  tombstones: [],
});
assert.equal(overlayResolution.surface.items[0]?.id, publicTermsId);
assert.equal(overlayResolution.surface.items[1]?.label.defaultMessage, "Start");
assert.deepEqual(overlayResolution.diagnostics, [{ code: "unresolved-item", id: missingId }]);

const customItemId = createPhiDraftCmsInstanceId({
  domain: "navigation",
  draftRevisionId: 1,
  sequence: 1,
});
const customOverlayResolution = resolvePhiCmsNavigationOverlay(publicHeaderSurface, {
  navKey: "public:header",
  itemOverrides: [],
  customItems: [{
    id: customItemId,
    kind: "link",
    label: "Custom",
    target: { kind: "page", reference: "v1.test", resolvedPath: "/custom" },
    placement: { parentId: null, index: 999 },
  }],
  tombstones: [],
});
assert.equal(
  readPhiCmsNavigationTargetPath(
    customOverlayResolution.surface.items.find(({ id }) => id === customItemId)?.target,
  ),
  "/custom",
);

const invalidPlacementResolution = resolvePhiCmsNavigationOverlay(publicHeaderSurface, {
  navKey: "public:header",
  itemOverrides: [{ id: publicHomeId, placement: { parentId: publicHomeId, index: 0 } }],
  customItems: [],
  tombstones: [],
});
assert.equal(invalidPlacementResolution.surface.items.some(({ id }) => id === publicHomeId), true);
assert.equal(invalidPlacementResolution.diagnostics[0]?.code, "invalid-placement");

const tombstoneResolution = resolvePhiCmsNavigationOverlay(publicHeaderSurface, {
  navKey: "public:header",
  itemOverrides: [],
  customItems: [],
  tombstones: [publicTermsId],
});
assert.equal(tombstoneResolution.surface.items.some(({ id }) => id === publicTermsId), false);

const publicCatalog = resolvePhiCmsDescriptorCatalog(PHI_PUBLIC_RUNTIME_MODULE_CATALOG);
const publicBaseModuleIds = new Set([
  PHI_CORE_RUNTIME_MODULE_ID,
  PHI_PUBLIC_RUNTIME_MODULE_ID,
]);
const publicBaseRoutes = compilePhiCmsActiveRouteTable({
  catalog: publicCatalog,
  area: "public",
  activeModuleIds: publicBaseModuleIds,
});
assert.equal(resolvePhiCmsRoutePreset(publicBaseRoutes, "/")?.descriptor.pageKey, "home");
assert.equal(resolvePhiCmsRoutePresetByPageKey(publicBaseRoutes, "home")?.descriptor.path, "/");
assert.equal(resolvePhiCmsRoutePreset(publicBaseRoutes, "/contact")?.descriptor.ownerModuleId, PHI_PUBLIC_RUNTIME_MODULE_ID);
assert.equal(resolvePhiCmsRoutePreset(publicBaseRoutes, "/register"), null);
const publicBaseHeader = resolvePhiCmsActiveNavigationSurfaces({
  catalog: publicCatalog,
  area: "public",
  activeModuleIds: publicBaseModuleIds,
}).find(({ navKey }) => navKey === "public:header");
assert(publicBaseHeader);
assert.equal(
  publicBaseHeader.items.some(({ id }) => id === publicRegistrationId),
  false,
);

const publicWithAuthModuleIds = new Set([...publicBaseModuleIds, PHI_AUTH_RUNTIME_MODULE_ID]);
const publicWithAuthRoutes = compilePhiCmsActiveRouteTable({
  catalog: publicCatalog,
  area: "public",
  activeModuleIds: publicWithAuthModuleIds,
});
assert.equal(resolvePhiCmsRoutePreset(publicWithAuthRoutes, "/register")?.descriptor.ownerModuleId, PHI_AUTH_RUNTIME_MODULE_ID);
assert.equal(resolvePhiCmsRoutePreset(publicWithAuthRoutes, "/logout")?.descriptor.ownerModuleId, PHI_AUTH_RUNTIME_MODULE_ID);
const publicAuthProjection = resolvePhiAuthUiRuntimeProjection(
  PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG,
  publicWithAuthModuleIds,
  "public",
);
assert.equal(publicAuthProjection?.moduleId, PHI_AUTH_RUNTIME_MODULE_ID);
assert.deepEqual(publicAuthProjection?.capabilities, [
  "primary-login",
  "factor-challenge",
  "factor-enrollment",
  "recovery",
]);
const publicWithAuthHeader = resolvePhiCmsActiveNavigationSurfaces({
  catalog: publicCatalog,
  area: "public",
  activeModuleIds: publicWithAuthModuleIds,
}).find(({ navKey }) => navKey === "public:header");
assert(publicWithAuthHeader);
assert.equal(
  publicWithAuthHeader.items.some(({ id }) => id === publicRegistrationId),
  true,
);

const adminBaseModuleIds = new Set([
  PHI_CORE_RUNTIME_MODULE_ID,
  PHI_ADMIN_RUNTIME_MODULE_ID,
]);
const adminBaseRoutes = compilePhiCmsActiveRouteTable({
  catalog,
  area: "admin",
  activeModuleIds: adminBaseModuleIds,
});
assert.equal(resolvePhiCmsRoutePreset(adminBaseRoutes, "/")?.descriptor.ownerModuleId, PHI_ADMIN_RUNTIME_MODULE_ID);
assert.equal(resolvePhiCmsRoutePreset(adminBaseRoutes, "/dashboard"), null);
assert.equal(resolvePhiCmsRoutePreset(adminBaseRoutes, "/users"), null);
assert.equal(resolvePhiCmsRoutePreset(adminBaseRoutes, "/locales"), null);
assert.equal(resolvePhiCmsRoutePreset(adminBaseRoutes, "/logs"), null);
assert.equal(resolvePhiCmsRoutePreset(adminBaseRoutes, "/settings")?.descriptor.ownerModuleId, PHI_ADMIN_RUNTIME_MODULE_ID);
const adminFeatureModuleIds = new Set([
  ...adminBaseModuleIds,
  PHI_AUTH_RUNTIME_MODULE_ID,
  PHI_DASHBOARD_RUNTIME_MODULE_ID,
  PHI_LOCALIZATION_RUNTIME_MODULE_ID,
  PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
  PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
]);
const adminFeatureRoutes = compilePhiCmsActiveRouteTable({
  catalog,
  area: "admin",
  activeModuleIds: adminFeatureModuleIds,
});
assert.equal(
  resolvePhiCmsRoutePreset(adminFeatureRoutes, "/dashboard")?.descriptor.ownerModuleId,
  PHI_DASHBOARD_RUNTIME_MODULE_ID,
);
assert.equal(resolvePhiCmsRoutePreset(adminFeatureRoutes, "/locales")?.descriptor.ownerModuleId, PHI_LOCALIZATION_RUNTIME_MODULE_ID);
assert.equal(resolvePhiCmsRoutePreset(adminFeatureRoutes, "/logs")?.descriptor.ownerModuleId, PHI_OBSERVABILITY_RUNTIME_MODULE_ID);
assert.equal(resolvePhiCmsRoutePreset(adminFeatureRoutes, "/users")?.descriptor.ownerModuleId, PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID);
// User management is readable by a Developer and writable only by an Admin, the same split
// `phi-server` enforces per method. Entry is therefore the Developer's; the read-only projection
// that removes the capability lives in the page's controller, not in this route policy. A Builder
// holds no Admin area access at all and must not reach the route.
const adminRoutesForRole = (roleFlags: number) => compilePhiCmsActiveRouteTable({
  catalog,
  area: "admin",
  activeModuleIds: adminFeatureModuleIds,
  viewer: {
    access: "authenticated",
    roleClaims: [{ providerId: "@phis/phi-server/core", flags: roleFlags }],
    groupClaims: [],
  },
});
assert.equal(
  resolvePhiCmsRoutePreset(adminRoutesForRole(PhiBaseRole.Developer), "/users")?.descriptor.ownerModuleId,
  PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
);
assert.equal(
  resolvePhiCmsRoutePreset(adminRoutesForRole(PhiBaseRole.Admin), "/users")?.descriptor.ownerModuleId,
  PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
);
assert.equal(resolvePhiCmsRoutePreset(adminRoutesForRole(PhiBaseRole.Builder), "/users"), null);
assert.equal(
  resolvePhiCmsRoutePreset(adminFeatureRoutes, "/settings/phis+ui+auth")?.descriptor.ownerModuleId,
  PHI_AUTH_RUNTIME_MODULE_ID,
);
assert.equal(resolvePhiCmsRoutePreset(adminFeatureRoutes, "/locale"), null);
assert.equal(
  resolvePhiCmsRoutePreset(adminFeatureRoutes, "/settings/phis+ui+admin")?.descriptor.ownerModuleId,
  PHI_ADMIN_RUNTIME_MODULE_ID,
);
const adminNavigationSurfaces = resolvePhiCmsActiveNavigationSurfaces({
  catalog,
  area: "admin",
  activeModuleIds: adminFeatureModuleIds,
});
const adminNavigationItems = adminNavigationSurfaces
  .find((surface) => surface.navKey === "admin:sidebar")?.items;
assert.deepEqual(
  adminNavigationItems?.map((item) => readPhiCmsNavigationTargetPath(item.target) ?? null),
  ["/dashboard", "/locales", "/logs", "/users", null],
);
// The Users entry inherits the route policy, so it follows entry rather than write capability: a
// Developer sees it and reads the page, a Builder never reaches the Admin sidebar.
const adminNavigationPathsForRole = (roleFlags: number) => resolvePhiCmsActiveNavigationSurfaces({
  catalog,
  area: "admin",
  activeModuleIds: adminFeatureModuleIds,
  viewer: {
    access: "authenticated",
    roleClaims: [{ providerId: "@phis/phi-server/core", flags: roleFlags }],
    groupClaims: [],
  },
}).find((surface) => surface.navKey === "admin:sidebar")?.items
  .map((item) => readPhiCmsNavigationTargetPath(item.target) ?? null);
assert.equal(adminNavigationPathsForRole(PhiBaseRole.Developer)?.includes("/users"), true);
assert.equal(adminNavigationPathsForRole(PhiBaseRole.Admin)?.includes("/users"), true);
assert.equal(adminNavigationPathsForRole(PhiBaseRole.Builder)?.includes("/users"), false);

const adminSettingsContainer = adminNavigationItems?.at(-1);
assert.equal(adminSettingsContainer?.kind, "container");
assert.deepEqual(
  adminSettingsContainer?.children.map((item) => readPhiCmsNavigationTargetPath(item.target) ?? null),
  ["/settings/phis+ui+admin", "/settings/phis+ui+auth"],
);
assert.equal(
  adminNavigationSurfaces.find((surface) => surface.navKey === "admin:settings"),
  undefined,
);

const authEntry = PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.get(PHI_AUTH_RUNTIME_MODULE_ID);
assert(authEntry);
assert.deepEqual(
  PHI_PUBLIC_RUNTIME_MODULE_CATALOG.get(PHI_AUTH_RUNTIME_MODULE_ID)?.areaOverlays?.map(({ area }) => area),
  ["public"],
);
assert.deepEqual(
  PHI_APP_RUNTIME_MODULE_CATALOG.get(PHI_AUTH_RUNTIME_MODULE_ID)?.areaOverlays?.map(({ area }) => area),
  ["app"],
);
assert.deepEqual(
  resolvePhiAuthUiRuntimeProjection(
    PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG,
    adminFeatureModuleIds,
    "admin",
  )?.capabilities,
  ["site-settings"],
);
assert.deepEqual(
  resolvePhiAuthUiRuntimeProjection(
    PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG,
    new Set([
      PHI_CORE_RUNTIME_MODULE_ID,
      PHI_AUTH_RUNTIME_MODULE_ID,
      PHI_APP_RUNTIME_MODULE_ID,
    ]),
    "app",
  )?.capabilities,
  ["primary-login", "account-security"],
);
const competingAuthModuleId = "@test/pkg/modules/alternate-auth" as const;
const competingAuthCatalog = createPhiRuntimeModuleCatalog([
  ...PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values(),
  {
    definition: {
      ...authEntry.definition,
      moduleId: competingAuthModuleId,
      formProviders: undefined,
      dataProviders: undefined,
      controllerType: "@test/pkg/modules/alternate-auth/controller/default",
      controller: {
        ...authEntry.definition.controller!,
        pluginKey: "@test/pkg/modules/alternate-auth/controller",
        key: "default",
      },
      authUiProvider: {
        providerKey: "@test/pkg/modules/alternate-auth/controller/default",
        controllerType: "@test/pkg/modules/alternate-auth/controller/default",
        capabilitiesByArea: { public: ["primary-login"] },
      },
    },
    widgets: [],
    layouts: [],
    load: authEntry.load,
  },
], PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.areaDefinitions);
assert.throws(
  () => resolvePhiAuthUiRuntimeProjection(
    competingAuthCatalog,
    new Set([PHI_AUTH_RUNTIME_MODULE_ID, competingAuthModuleId]),
    "public",
  ),
  /more than one Auth UI provider/,
);

const builderBaseModuleIds = new Set([
  PHI_CORE_RUNTIME_MODULE_ID,
  PHI_BUILDER_RUNTIME_MODULE_ID,
]);
const builderBaseRoutes = compilePhiCmsActiveRouteTable({
  catalog,
  area: "builder",
  activeModuleIds: builderBaseModuleIds,
});
assert.equal(resolvePhiCmsRoutePreset(builderBaseRoutes, "/dashboard"), null);
assert.equal(resolvePhiCmsRoutePreset(builderBaseRoutes, "/revisions"), null);
const builderFeatureModuleIds = new Set([
  ...builderBaseModuleIds,
  PHI_DASHBOARD_RUNTIME_MODULE_ID,
  PHI_THEME_RUNTIME_MODULE_ID,
  PHI_REVISIONS_RUNTIME_MODULE_ID,
  PHI_ASSET_RUNTIME_MODULE_ID,
]);
const builderFeatureRoutes = compilePhiCmsActiveRouteTable({
  catalog,
  area: "builder",
  activeModuleIds: builderFeatureModuleIds,
});
assert.equal(
  resolvePhiCmsRoutePreset(builderFeatureRoutes, "/dashboard")?.descriptor.ownerModuleId,
  PHI_DASHBOARD_RUNTIME_MODULE_ID,
);
assert.equal(
  resolvePhiCmsRoutePreset(builderFeatureRoutes, "/revisions")?.descriptor.ownerModuleId,
  PHI_REVISIONS_RUNTIME_MODULE_ID,
);
const builderNavigationItems = resolvePhiCmsActiveNavigationSurfaces({
  catalog,
  area: "builder",
  activeModuleIds: builderFeatureModuleIds,
})[0]?.items;
assert.deepEqual(
  builderNavigationItems?.map((item) => readPhiCmsNavigationTargetPath(item.target) ?? null),
  ["/dashboard", "/shells", "/pages", "/navigation", "/theme", "/revisions", null, "/media"],
);
const builderSettingsContainer = builderNavigationItems?.at(-2);
assert.equal(builderSettingsContainer?.kind, "container");
assert.deepEqual(
  builderSettingsContainer?.children.map((item) => readPhiCmsNavigationTargetPath(item.target) ?? null),
  ["/settings/phis+ui+builder"],
);
assert.equal(
  resolvePhiCmsRoutePreset(builderFeatureRoutes, "/settings")?.descriptor.presetKey,
  "builder-settings-page",
);
assert.equal(
  resolvePhiCmsRoutePreset(builderFeatureRoutes, "/settings/phis+ui+builder")
    ?.descriptor.ownerModuleId,
  PHI_BUILDER_RUNTIME_MODULE_ID,
);

const TEST_MODULE_ID = "@test/pkg/modules/routes" as const satisfies PhiRuntimeModuleId;
const createTestRoute = (
  presetKey: string,
  path: string,
): PhiCmsRoutePresetDescriptor => ({
  ownerModuleId: TEST_MODULE_ID,
  presetKey,
  presetVersion: 1,
  area: "public",
  pageKey: presetKey,
  path,
  title: presetKey,
  loadTree: async () => {
    throw new Error("Contract-only test descriptor must not load a tree.");
  },
});

assert.throws(
  () => compilePhiCmsRoutePattern(createTestRoute("invalid", "/news/:year/:id")),
  /at most one dynamic segment/,
);
assert.throws(
  () => compilePhiCmsRoutePattern(createTestRoute("catch-all", "/news/*path")),
  /invalid route segment/,
);

const exactRoute = createTestRoute("archive", "/news/archive");
const dynamicRoute = createTestRoute("article", "/news/:id");
const buildTestCatalog = (
  routes: readonly PhiCmsRoutePresetDescriptor[],
): PhiCmsCompiledDescriptorCatalog => ({
  areaDefinitions: new Map([["public", {
    area: "public",
    baseModuleId: TEST_MODULE_ID,
    shellPresetKey: "shell",
    accessPolicy: { access: "anyone" as const },
  }]]),
  areaShellByArea: new Map(),
  areaShellByIdentity: new Map(),
  areaOverlaysByArea: new Map(),
  routeByIdentity: new Map(),
  routesByArea: new Map([["public", routes.map(compilePhiCmsRoutePattern)]]),
  moduleNavigationByArea: new Map(),
  themeByKey: new Map(),
});
const activeTestModules = new Set([TEST_MODULE_ID]);
const precedenceTable = compilePhiCmsActiveRouteTable({
  catalog: buildTestCatalog([dynamicRoute, exactRoute]),
  area: "public",
  activeModuleIds: activeTestModules,
});
assert.equal(resolvePhiCmsRoutePreset(precedenceTable, "/news/archive")?.descriptor, exactRoute);
assert.deepEqual(resolvePhiCmsRoutePreset(precedenceTable, "/news/42")?.params, { id: "42" });
assert.throws(
  () => compilePhiCmsActiveRouteTable({
    catalog: buildTestCatalog([dynamicRoute, createTestRoute("article-slug", "/news/:slug")]),
    area: "public",
    activeModuleIds: activeTestModules,
  }),
  /dynamic route collision/,
);

console.log(
  `Module descriptors valid: ${catalog.areaDefinitions.size} Areas, ` +
  `${catalog.areaShellByArea.size} shell presets, ` +
  `${[...catalog.routesByArea.values()].flat().length} route presets, ` +
  `${catalog.themeByKey.size} theme presets, ` +
  `${navigationSurfaceCount} navigation surfaces.`,
);
