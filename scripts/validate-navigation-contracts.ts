import { readPhiCmsNavigationTargetPath } from "../helpers/navigation-target";
import assert from "node:assert/strict";

import { createPhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsActiveNavigationSurfaces,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsNavigationOverlay,
  resolvePhiCmsRoutePreset,
} from "../plugins/runtime-modules/descriptor-compiler";
import { buildPhiRuntimeModuleRouteSegment } from "../helpers/runtime-module-route-path";
import { localizeAreaPath, stripLocaleAndAreaFromPathname } from "../helpers/locale";
import type {
  PhiCmsAreaDefinition,
  PhiCmsNavigationInjectionDescriptor,
  PhiCmsRoutePresetDescriptor,
  PhiRuntimeModuleId,
} from "../types/cms-module-descriptors";
import type {
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
} from "../types/cms-plugins";
import { buildPhiBuilderNavigationOverlay } from "../plugins/runtime-modules/builder/navigation-persistence";
import { materializePhiBuilderNavigationSurface } from "../helpers/cms-navigation-catalog";
import {
  createPhiDraftCmsInstanceId,
  createPhiPresetCmsInstanceId,
} from "../types/cms-instance-id";

const PLATFORM_MODULE_ID = "@test/pkg/modules/platform" as const;
const BASE_MODULE_ID = "@test/pkg/modules/base" as const;
const MODULE_A_ID = "@test/pkg/modules/module-a" as const;
const MODULE_B_ID = "@test/pkg/modules/module-b" as const;
const MOUNTED_MODULE_ID = "@test/package/modules/module-c" as const;
const SETTINGS_ITEM_KEY = "@test/pkg/modules/base/nav/settings";
const SETTINGS_GENERAL_ITEM_KEY = "@test/pkg/modules/base/nav/settings/general";
const PRIVATE_ITEM_KEY = "@test/pkg/modules/base/nav/private";
const MODULE_A_ITEM_KEY = "@test/pkg/modules/module-a/nav/page";
const MODULE_B_ITEM_KEY = "@test/pkg/modules/module-b/nav/page";
const MOUNTED_MODULE_ITEM_KEY = "@test/package/modules/module-c/nav/settings";
const navigationPresetId = (ownerModuleId: string, itemKey: string) => createPhiPresetCmsInstanceId({
  domain: "navigation",
  ownerModuleId,
  presetKey: "public:header",
  nodeKey: itemKey,
});
const SETTINGS_ID = navigationPresetId(BASE_MODULE_ID, SETTINGS_ITEM_KEY);
const SETTINGS_GENERAL_ID = navigationPresetId(BASE_MODULE_ID, SETTINGS_GENERAL_ITEM_KEY);
const PRIVATE_ID = navigationPresetId(BASE_MODULE_ID, PRIVATE_ITEM_KEY);
const MODULE_A_IDENTITY = navigationPresetId(MODULE_A_ID, MODULE_A_ITEM_KEY);
const MODULE_B_IDENTITY = navigationPresetId(MODULE_B_ID, MODULE_B_ITEM_KEY);
const MOUNTED_MODULE_IDENTITY = navigationPresetId(MOUNTED_MODULE_ID, MOUNTED_MODULE_ITEM_KEY);
const REMOVED_ITEM_ID = navigationPresetId("@test/pkg/modules/removed", "@test/pkg/modules/removed/nav/item");
const REMOVED_TOMBSTONE_ID = navigationPresetId("@test/pkg/modules/removed", "@test/pkg/modules/removed/nav/tombstone");

assert.equal(localizeAreaPath("de", "builder", "/media"), "/builder/media");
assert.equal(stripLocaleAndAreaFromPathname("/builder/media"), "/media");
assert.equal(stripLocaleAndAreaFromPathname("/de/media"), "/media");
assert.equal(stripLocaleAndAreaFromPathname("/de/builder/media"), "/builder/media");

const areaDefinition: PhiCmsAreaDefinition = {
  area: "public",
  baseModuleId: BASE_MODULE_ID,
  shellPresetKey: "base-shell",
  accessPolicy: { access: "anyone" },
  routeMounts: [{
    mountKey: "settings",
    basePath: "/settings",
    navKey: "public:header",
    parentItemKey: SETTINGS_ITEM_KEY,
  }],
  navigationSurfaces: [{
    navKey: "public:header",
    label: { defaultMessage: "Header" },
    items: [
      { itemKey: PRIVATE_ITEM_KEY, label: { defaultMessage: "Private" } },
      {
        itemKey: SETTINGS_ITEM_KEY,
        label: { defaultMessage: "Settings" },
        icon: "antd:setting",
        children: [{
          itemKey: SETTINGS_GENERAL_ITEM_KEY,
          label: { defaultMessage: "General" },
          routePresetKey: "base-settings",
        }],
      },
    ],
    exportedItemKeys: [SETTINGS_ITEM_KEY],
  }],
};

function createDefinition(
  moduleId: PhiRuntimeModuleId,
  kind: "platform" | "module",
  controllerKey: string,
): PhiRuntimeModuleDefinition {
  return {
    moduleId,
    kind,
    eligibleAreas: ["public"],
    serverBinding: {
      providerId: "@phis/phi-server/core",
      requiredCapabilities: [],
    },
    controllerType: `@test/${controllerKey}`,
    controller: {
      pluginKey: "@test",
      key: controllerKey,
      title: controllerKey,
      allowedMountScopes: ["area"],
      runtimeSignals: { emits: [], listens: [] },
    },
    title: moduleId,
    description: `Test runtime module ${moduleId}.`,
    category: "test",
    iconFamily: "test",
    controllerMountPolicy: "area",
  };
}

function createRoute({
  moduleId,
  presetKey,
  path,
  itemKey,
  injection,
  routePresetKey = presetKey,
  mountKey,
}: {
  moduleId: PhiRuntimeModuleId;
  presetKey: string;
  path: string;
  itemKey: string;
  injection: Omit<PhiCmsNavigationInjectionDescriptor, "navKey" | "item"> & { navKey?: `public:${string}` };
  routePresetKey?: string;
  mountKey?: string;
}): PhiCmsRoutePresetDescriptor {
  return {
    ownerModuleId: moduleId,
    presetKey,
    presetVersion: 1,
    area: "public",
    pageKey: presetKey,
    title: presetKey,
    path,
    ...(mountKey ? { mount: { mountKey } } : {}),
    navigation: [{
      navKey: injection.navKey ?? "public:header",
      parentItemKey: injection.parentItemKey,
      ...(injection.before ? { before: injection.before } : {}),
      ...(injection.after ? { after: injection.after } : {}),
      item: {
        itemKey,
        label: { defaultMessage: presetKey },
        routePresetKey,
      },
    }],
    loadTree: async () => {
      throw new Error("Navigation contract route trees are not loaded.");
    },
  };
}

const validRouteA = createRoute({
  moduleId: MODULE_A_ID,
  presetKey: "module-a-page",
  path: "/a",
  itemKey: MODULE_A_ITEM_KEY,
  injection: { parentItemKey: null, before: SETTINGS_ITEM_KEY },
});
const validRouteB = createRoute({
  moduleId: MODULE_B_ID,
  presetKey: "module-b-page",
  path: "/b",
  itemKey: MODULE_B_ITEM_KEY,
  injection: { parentItemKey: null, before: SETTINGS_ITEM_KEY },
});
const mountedRoute = createRoute({
  moduleId: MOUNTED_MODULE_ID,
  presetKey: "module-c-settings",
  path: "/",
  mountKey: "settings",
  itemKey: MOUNTED_MODULE_ITEM_KEY,
  injection: { parentItemKey: SETTINGS_ITEM_KEY },
});

function createEntry(
  definition: PhiRuntimeModuleDefinition,
  routes: readonly PhiCmsRoutePresetDescriptor[] = [],
): PhiRuntimeModuleCatalogEntry {
  return {
    definition,
    widgets: [],
    layouts: [],
    routes,
    load: async () => {
      throw new Error("Navigation contract modules are not executed.");
    },
  };
}

function createCatalog(
  routesA: readonly PhiCmsRoutePresetDescriptor[] = [validRouteA],
  routesB: readonly PhiCmsRoutePresetDescriptor[] = [validRouteB],
) {
  const platform = createEntry(createDefinition(PLATFORM_MODULE_ID, "platform", "platform"));
  const base = createEntry(createDefinition(BASE_MODULE_ID, "module", "base"), [{
    ownerModuleId: BASE_MODULE_ID,
    presetKey: "base-settings",
    presetVersion: 1,
    area: "public",
    pageKey: "settings",
    title: "Settings",
    path: "/settings",
    loadTree: async () => {
      throw new Error("Navigation contract route trees are not loaded.");
    },
  }]);
  base.areaShells = [{
    ownerModuleId: BASE_MODULE_ID,
    presetKey: "base-shell",
    shellPresetVersion: 1,
    area: "public",
    loadTree: async () => {
      throw new Error("Navigation contract shell trees are not loaded.");
    },
  }];
  return createPhiRuntimeModuleCatalog([
    platform,
    base,
    createEntry(createDefinition(MODULE_A_ID, "module", "module-a"), routesA),
    createEntry(createDefinition(MODULE_B_ID, "module", "module-b"), routesB),
    createEntry(createDefinition(MOUNTED_MODULE_ID, "module", "module-c"), [mountedRoute]),
  ], [areaDefinition]);
}

const catalog = resolvePhiCmsDescriptorCatalog(createCatalog());
const [surface] = resolvePhiCmsActiveNavigationSurfaces({
  catalog,
  area: "public",
  activeModuleIds: new Set([
    PLATFORM_MODULE_ID,
    BASE_MODULE_ID,
    MODULE_A_ID,
    MODULE_B_ID,
    MOUNTED_MODULE_ID,
  ]),
});
assert(surface);
assert.deepEqual(
  surface.items.map((item) => item.id),
  [PRIVATE_ID, MODULE_A_IDENTITY, MODULE_B_IDENTITY, SETTINGS_ID],
);
assert.deepEqual(
  surface.items.at(-1)?.children.map((item) => item.id),
  [SETTINGS_GENERAL_ID, MOUNTED_MODULE_IDENTITY],
);
assert.equal(buildPhiRuntimeModuleRouteSegment(MOUNTED_MODULE_ID), "test+package+module-c");
assert.equal(
  buildPhiRuntimeModuleRouteSegment("acme-status/modules/auth" as PhiRuntimeModuleId),
  "acme-status+auth",
);
assert.throws(
  () => buildPhiRuntimeModuleRouteSegment("@test/package+/modules/module-c" as PhiRuntimeModuleId),
  /cannot be encoded/,
);
// The pre-marker form. It is the one a third-party module written against the old guide would carry,
// so it has to keep failing here rather than becoming a route segment that silently drops a part.
assert.throws(
  () => buildPhiRuntimeModuleRouteSegment("@test/package/module-c" as PhiRuntimeModuleId),
  /must use <npm-package>\/modules\/<module-key>/,
);
const mountedRouteTable = compilePhiCmsActiveRouteTable({
  catalog,
  area: "public",
  activeModuleIds: new Set([
    PLATFORM_MODULE_ID,
    BASE_MODULE_ID,
    MOUNTED_MODULE_ID,
  ]),
});
assert.equal(
  resolvePhiCmsRoutePreset(mountedRouteTable, "/settings/test+package+module-c")
    ?.descriptor.ownerModuleId,
  MOUNTED_MODULE_ID,
);

const overlay = resolvePhiCmsNavigationOverlay(surface, {
  navKey: "public:header",
  label: "Primary",
  itemOverrides: [
    { id: MODULE_A_IDENTITY, label: "A renamed", icon: "antd:star" },
    { id: MODULE_B_IDENTITY, placement: { parentId: null, index: 0 } },
  ],
  customItems: [],
  tombstones: [PRIVATE_ID],
});
assert.equal(overlay.surface.label.defaultMessage, "Primary");
assert.deepEqual(
  overlay.surface.items.map((item) => item.id),
  [MODULE_B_IDENTITY, MODULE_A_IDENTITY, SETTINGS_ID],
);
assert.equal(overlay.surface.items[1]?.label.defaultMessage, "A renamed");
assert.equal(overlay.surface.items[1]?.icon, "antd:star");
assert.equal(readPhiCmsNavigationTargetPath(overlay.surface.items[1]?.target), "/a");
assert.deepEqual(overlay.diagnostics, []);

const customContainerId = createPhiDraftCmsInstanceId({
  domain: "navigation",
  draftRevisionId: 1,
  sequence: 1,
});
const customLinkId = createPhiDraftCmsInstanceId({
  domain: "navigation",
  draftRevisionId: 1,
  sequence: 2,
});
const custom = resolvePhiCmsNavigationOverlay(surface, {
  navKey: "public:header",
  itemOverrides: [],
  customItems: [
    {
      id: customContainerId,
      kind: "container",
      label: "Custom",
      placement: { parentId: null, index: 4 },
    },
    {
      id: customLinkId,
      kind: "link",
      label: "External",
      target: { kind: "external", href: "https://example.com" },
      newTab: true,
      placement: { parentId: customContainerId, index: 0 },
    },
  ],
  tombstones: [],
});
const customContainer = custom.surface.items.find((item) => item.id === customContainerId);
assert(customContainer);
assert.equal(customContainer.ownerModuleId, null);
assert.equal(customContainer.kind, "container");
assert.equal(customContainer.children[0]?.id, customLinkId);
assert.equal(customContainer.children[0]?.target?.kind, "custom");
assert.equal(
  readPhiCmsNavigationTargetPath(customContainer.children[0]?.target),
  "https://example.com",
);

const internalReferenceLinkId = createPhiDraftCmsInstanceId({
  domain: "navigation",
  draftRevisionId: 1,
  sequence: 3,
});
const internalReference = resolvePhiCmsNavigationOverlay(surface, {
  navKey: "public:header",
  itemOverrides: [],
  customItems: [{
    id: internalReferenceLinkId,
    kind: "link",
    label: "Stable Page",
    target: { kind: "page", reference: "v1.opaque", resolvedPath: "/renamed" },
    placement: { parentId: null, index: 5 },
  }],
  tombstones: [],
});
assert.equal(
  readPhiCmsNavigationTargetPath(
    internalReference.surface.items.find((item) => item.id === internalReferenceLinkId)?.target,
  ),
  "/renamed",
);

const materialized = materializePhiBuilderNavigationSurface(surface, null);
const reversedItems = [...materialized.items].reverse();
const positioningOverlay = buildPhiBuilderNavigationOverlay({
  ...materialized,
  items: reversedItems,
});
const positioned = resolvePhiCmsNavigationOverlay(surface, positioningOverlay);
assert.deepEqual(
  positioned.surface.items.map((item) => item.id),
  reversedItems.map((item) => item.id),
);

const hiddenTree = materializePhiBuilderNavigationSurface(surface, {
  navKey: "public:header",
  itemOverrides: [],
  customItems: [],
  tombstones: [PRIVATE_ID],
});
const hiddenItem = hiddenTree.items.find((item) => item.id === PRIVATE_ID);
assert.equal(hiddenItem?.hidden, true);
assert.deepEqual(buildPhiBuilderNavigationOverlay(hiddenTree).tombstones, [PRIVATE_ID]);

const restored = resolvePhiCmsNavigationOverlay(surface, null);
assert.equal(restored.surface.items.some((item) => item.id === PRIVATE_ID), true);

const movedFromHiddenSettings = resolvePhiCmsNavigationOverlay(surface, {
  navKey: "public:header",
  itemOverrides: [{
    id: MOUNTED_MODULE_IDENTITY,
    placement: { parentId: null, index: 0 },
  }],
  customItems: [],
  tombstones: [SETTINGS_ID],
});
assert.equal(movedFromHiddenSettings.surface.items[0]?.id, MOUNTED_MODULE_IDENTITY);
assert.equal(
  movedFromHiddenSettings.surface.items.some((item) => item.id === SETTINGS_ID),
  false,
);

const stale = resolvePhiCmsNavigationOverlay(surface, {
  navKey: "public:header",
  itemOverrides: [{ id: REMOVED_ITEM_ID, label: "Removed" }],
  customItems: [],
  tombstones: [REMOVED_TOMBSTONE_ID],
});
assert.deepEqual(stale.diagnostics, [
  { code: "unresolved-item", id: REMOVED_ITEM_ID },
  { code: "unresolved-item", id: REMOVED_TOMBSTONE_ID },
]);

assert.throws(
  () => resolvePhiCmsNavigationOverlay(surface, {
    navKey: "public:footer",
    itemOverrides: [],
    customItems: [],
    tombstones: [],
  }),
  /cannot be applied/,
);

const undeclaredMountRoute = createRoute({
  moduleId: MODULE_A_ID,
  presetKey: "undeclared-mount",
  path: "/",
  mountKey: "missing",
  itemKey: "@test/pkg/modules/module-a/nav/undeclared-mount",
  injection: { parentItemKey: SETTINGS_ITEM_KEY },
});
assert.throws(
  () => resolvePhiCmsDescriptorCatalog(createCatalog([undeclaredMountRoute])),
  /does not declare route mount "missing"/,
);

const undeclaredSurfaceRoute = createRoute({
  moduleId: MODULE_A_ID,
  presetKey: "undeclared-surface",
  path: "/undeclared",
  itemKey: "@test/pkg/modules/module-a/nav/undeclared",
  injection: { navKey: "public:missing", parentItemKey: null, before: SETTINGS_ITEM_KEY },
});
assert.throws(() => resolvePhiCmsDescriptorCatalog(createCatalog([undeclaredSurfaceRoute])), /is not declared/);

const unanchoredRootRoute = createRoute({
  moduleId: MODULE_A_ID,
  presetKey: "unanchored-root",
  path: "/unanchored",
  itemKey: "@test/pkg/modules/module-a/nav/unanchored",
  injection: { parentItemKey: null },
});
assert.throws(() => resolvePhiCmsDescriptorCatalog(createCatalog([unanchoredRootRoute])), /must reference a before or after anchor/);

const privateAnchorRoute = createRoute({
  moduleId: MODULE_A_ID,
  presetKey: "private-anchor",
  path: "/private-anchor",
  itemKey: "@test/pkg/modules/module-a/nav/private-anchor",
  injection: { parentItemKey: null, before: PRIVATE_ITEM_KEY },
});
assert.throws(() => resolvePhiCmsDescriptorCatalog(createCatalog([privateAnchorRoute])), /is not an exported base or same-module item/);

const crossModuleAnchorRoute = createRoute({
  moduleId: MODULE_B_ID,
  presetKey: "cross-module-anchor",
  path: "/cross-module-anchor",
  itemKey: "@test/pkg/modules/module-b/nav/cross-module-anchor",
  injection: { parentItemKey: null, after: MODULE_A_ITEM_KEY },
});
assert.throws(() => resolvePhiCmsDescriptorCatalog(createCatalog(undefined, [crossModuleAnchorRoute])), /is not an exported base or same-module item/);

console.log("Navigation contracts valid.");
