import assert from "node:assert/strict";

import { PhiBaseRole } from "../constants/phi-base-roles";
import { filterPhiCmsRenderableTreeForViewer } from "../helpers/cms-access-policy";
import { createPhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import {
  PHI_VIEWER_ACCESS_ANYONE,
  PHI_VIEWER_ACCESS_AUTHENTICATED,
  PHI_VIEWER_ACCESS_SITE_ADMIN,
  canPhiViewerAccess,
  canPhiViewerAccessOwnedPolicy,
  intersectPhiInheritedViewportFlags,
  readPhiViewerAccessPolicy,
  type PhiViewerAccessPolicy,
} from "../types/access";
import type { PhiResolvedCmsRenderableTree } from "../types/cms";
import type {
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
} from "../types/cms-plugins";
import { filterPhiCommandToolbarButtonsForViewer } from "../plugins/runtime-modules/core/widgets/command-toolbar/config";
import { buildPhiVisibleAreaMenuItems } from "../components/widgets/area-menu-items";

const CORE_PROVIDER = "@phis/phi-server/core" as const;
const MODULE_PROVIDER = "@test/pkg/modules/add-on" as const;
const FOREIGN_PROVIDER = "@other/add-on" as const;
const MODULE_ID = "@test/pkg/modules/module" as const;
const LAYOUT_TYPE = "@test/pkg/modules/layout";
const LAYOUT_NODE_TYPE = `${LAYOUT_TYPE}/layout`;
const WIDGET_TYPE = "@test/pkg/modules/widget";

const publicViewer = {
  access: "public" as const,
  roleClaims: [],
};
const authenticatedViewer = {
  access: "authenticated" as const,
  roleClaims: [],
  groupClaims: [],
};

assert.equal(
  canPhiViewerAccessOwnedPolicy(
    { access: "authenticated", roleClaims: [], groupClaims: [{ providerId: MODULE_PROVIDER, key: "editors", flags: 0 }] },
    { access: "groups", providerId: MODULE_PROVIDER, allowedGroupKeys: ["editors"] },
    MODULE_PROVIDER,
  ),
  true,
);
assert.equal(
  canPhiViewerAccessOwnedPolicy(
    { access: "authenticated", roleClaims: [], groupClaims: [{ providerId: FOREIGN_PROVIDER, key: "editors", flags: 0 }] },
    { access: "groups", providerId: MODULE_PROVIDER, allowedGroupKeys: ["editors"] },
    MODULE_PROVIDER,
  ),
  false,
);

assert.equal(
  canPhiViewerAccessOwnedPolicy(
    authenticatedViewer,
    { access: "roles", providerId: MODULE_PROVIDER, allowedRoleFlags: 1 },
    MODULE_PROVIDER,
  ),
  false,
);
assert.equal(
  canPhiViewerAccessOwnedPolicy(
    {
      access: "authenticated",
      roleClaims: [{ providerId: CORE_PROVIDER, flags: PhiBaseRole.Admin }],
    },
    PHI_VIEWER_ACCESS_SITE_ADMIN,
    MODULE_PROVIDER,
  ),
  true,
);
assert.equal(
  canPhiViewerAccessOwnedPolicy(
    authenticatedViewer,
    { access: "roles", providerId: FOREIGN_PROVIDER, allowedRoleFlags: 1 },
    MODULE_PROVIDER,
  ),
  false,
);

assert.equal(intersectPhiInheritedViewportFlags(null, 1), 1);
assert.equal(intersectPhiInheritedViewportFlags(1, 2), 0);
assert.equal(intersectPhiInheritedViewportFlags(3, 0), 3);
assert.deepEqual(
  filterPhiCommandToolbarButtonsForViewer(
    [
      { key: "public", emits: [{ capabilityId: "command" }] },
      {
        key: "private",
        emits: [{ capabilityId: "command" }],
        accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED,
      },
    ],
    publicViewer,
    CORE_PROVIDER,
  ).map(({ key }) => key),
  ["public"],
);

const tree = {
  regions: [{
    id: 1,
    pageId: 1,
    regionType: 1,
    rootLayoutNodeId: "AAAAAAAAAAAAAAAA",
    status: 1,
    flags: 0,
    visibilityMask: 0,
    sortOrder: 0,
    config: {},
  }],
  overlays: [],
  layoutNodes: [
    {
      id: "AAAAAAAAAAAAAAAA",
      siteId: 1,
      parentLayoutNodeId: null,
      widgetType: LAYOUT_NODE_TYPE,
      slotIndex: 0,
      sortOrder: 0,
      status: 1,
      flags: 0,
      visibilityMask: 0,
      label: null,
      config: {},
    },
    {
      id: "BBBBBBBBBBBBBBBB",
      siteId: 1,
      parentLayoutNodeId: "AAAAAAAAAAAAAAAA",
      widgetType: LAYOUT_NODE_TYPE,
      slotIndex: 0,
      sortOrder: 0,
      status: 1,
      flags: 0,
      visibilityMask: 0,
      label: null,
      config: { accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED },
    },
  ],
  contentWidgets: [{
    id: "CCCCCCCCCCCCCCCC",
    siteId: 1,
    parentLayoutNodeId: "BBBBBBBBBBBBBBBB",
    widgetType: WIDGET_TYPE,
    slotIndex: 0,
    sortOrder: 0,
    status: 1,
    flags: 0,
    visibilityMask: 0,
    label: null,
    config: {},
    contentId: null,
  }, {
    id: "DDDDDDDDDDDDDDDD",
    siteId: 1,
    parentLayoutNodeId: "AAAAAAAAAAAAAAAA",
    widgetType: WIDGET_TYPE,
    slotIndex: 1,
    sortOrder: 1,
    status: 1,
    flags: 0,
    visibilityMask: 0,
    label: null,
    config: {},
    contentId: null,
  }],
} as unknown as PhiResolvedCmsRenderableTree;

const registry = {
  widgetAccessPoliciesByType: new Map([[WIDGET_TYPE, PHI_VIEWER_ACCESS_AUTHENTICATED]]),
  layoutAccessPoliciesByType: new Map([[LAYOUT_TYPE, PHI_VIEWER_ACCESS_ANYONE]]),
  roleProviderIdByWidgetType: new Map([[WIDGET_TYPE, MODULE_PROVIDER]]),
  roleProviderIdByLayoutType: new Map([[LAYOUT_TYPE, MODULE_PROVIDER]]),
};

const publicTree = filterPhiCmsRenderableTreeForViewer({
  tree,
  viewer: publicViewer,
  registry,
});
assert.deepEqual(publicTree.layoutNodes.map(({ id }) => id), ["AAAAAAAAAAAAAAAA"]);
assert.equal(publicTree.contentWidgets.length, 0);

const authenticatedTree = filterPhiCmsRenderableTreeForViewer({
  tree,
  viewer: authenticatedViewer,
  registry,
});
assert.equal(authenticatedTree.layoutNodes.length, 2);
assert.equal(authenticatedTree.contentWidgets.length, 2);

const definition = {
  moduleId: MODULE_ID,
  kind: "platform",
  eligibleAreas: ["public"],
  serverBinding: {
    providerId: MODULE_PROVIDER,
    requiredCapabilities: [],
  },
  accessPolicy: {
    access: "roles",
    providerId: FOREIGN_PROVIDER,
    allowedRoleFlags: 1,
  },
  controllerType: "@test/pkg/modules/controller",
  controller: {
    pluginKey: "@test",
    key: "controller",
    title: "Controller",
    allowedMountScopes: ["area"],
    runtimeSignals: { emits: [], listens: [] },
  },
  title: "Test",
  description: "Test runtime module.",
  category: "test",
  iconFamily: "test",
  controllerMountPolicy: "demand",
} satisfies PhiRuntimeModuleDefinition;

const entry = {
  definition,
  widgets: [],
  layouts: [],
  load: async () => {
    throw new Error("not loaded");
  },
} satisfies PhiRuntimeModuleCatalogEntry;

assert.throws(
  () => createPhiRuntimeModuleCatalog([entry], []),
  /instead of Core or its bound provider/,
);

/**
 * The Area menu presents Area access, so it must agree with the Area policies exactly. It used to
 * re-derive visibility from base roles and from `viewer.resolvedArea`, which disagreed: a Developer
 * saw only App and Admin although the `Structure authoring`, `Content editing` and `Accounting`
 * masks all include Developer.
 */
const areaMenuKeysFor = (roleFlags: number) =>
  buildPhiVisibleAreaMenuItems({
    access: "authenticated",
    roleClaims: [{ providerId: CORE_PROVIDER, flags: roleFlags }],
    groupClaims: [],
  }).map((item) => item.key);

assert.deepEqual(
  areaMenuKeysFor(PhiBaseRole.Developer),
  ["app", "accounting", "admin", "editor", "builder"],
);
assert.deepEqual(areaMenuKeysFor(PhiBaseRole.Builder), ["app", "builder"]);
assert.deepEqual(areaMenuKeysFor(PhiBaseRole.Author), ["app", "editor"]);
assert.deepEqual(areaMenuKeysFor(PhiBaseRole.Publisher), ["app", "editor"]);
assert.deepEqual(areaMenuKeysFor(PhiBaseRole.Accountant), ["app", "accounting"]);
// The Site superuser rule carries the Admin, who appears in no ordinary Area mask.
assert.deepEqual(
  areaMenuKeysFor(PhiBaseRole.Admin),
  ["app", "accounting", "admin", "editor", "builder"],
);
assert.deepEqual(areaMenuKeysFor(0), ["app"]);
assert.deepEqual(buildPhiVisibleAreaMenuItems(publicViewer).map((item) => item.key), []);
// Public is the Area a viewer is already in, never a switch target.
assert.equal(
  buildPhiVisibleAreaMenuItems({ access: "authenticated", roleClaims: [], groupClaims: [] })
    .some((item) => item.key === "public"),
  false,
);

/*
 * Gating a surface on a role a Server Add-on defined.
 *
 * The names travel with the viewer so a navigation entry can be left out for somebody who would be
 * refused anyway. That is presentation, not protection: the request behind the link is decided again on
 * the server, and leaving the link out only spares a person a refusal they cannot act on.
 */
const MARKET = "@acme/market" as const;
const vendorOnly = {
  access: "addon-roles",
  providerId: MARKET,
  allowedRoles: ["vendor"],
} as const satisfies PhiViewerAccessPolicy;

function addonViewer(roles: string[] | null) {
  return {
    access: "authenticated" as const,
    roleClaims: [],
    groupClaims: [],
    ...(roles === null ? {} : { addonRoleClaims: [{ providerId: MARKET, roles }] }),
  };
}

assert.equal(canPhiViewerAccess(addonViewer(["vendor"]), vendorOnly), true);
assert.equal(canPhiViewerAccess(addonViewer(["reviewer", "vendor"]), vendorOnly), true);
assert.equal(canPhiViewerAccess(addonViewer(["reviewer"]), vendorOnly), false);
// A surface that never carried the claims must deny rather than assume: absent is not empty-and-known.
assert.equal(canPhiViewerAccess(addonViewer(null), vendorOnly), false);
assert.equal(
  canPhiViewerAccess({ access: "public", roleClaims: [], groupClaims: [] }, vendorOnly),
  false,
);
// The same role name from another Add-on is another role.
assert.equal(
  canPhiViewerAccess(
    {
      access: "authenticated",
      roleClaims: [],
      groupClaims: [],
      addonRoleClaims: [{ providerId: "@acme/other", roles: ["vendor"] }],
    },
    vendorOnly,
  ),
  false,
);
// Owner-checked like every other provider-scoped policy: a Module may not gate on somebody else's roles.
assert.equal(canPhiViewerAccessOwnedPolicy(addonViewer(["vendor"]), vendorOnly, MARKET), true);
assert.equal(canPhiViewerAccessOwnedPolicy(addonViewer(["vendor"]), vendorOnly, "@acme/other"), false);
assert.deepEqual(
  readPhiViewerAccessPolicy({ ...vendorOnly, allowedRoles: ["vendor", "vendor"] }),
  { access: "addon-roles", providerId: MARKET, allowedRoles: ["vendor"] },
);
assert.equal(readPhiViewerAccessPolicy({ ...vendorOnly, allowedRoles: [] }), null);
assert.equal(readPhiViewerAccessPolicy({ ...vendorOnly, allowedRoles: ["Vendor"] }), null);
assert.equal(readPhiViewerAccessPolicy({ ...vendorOnly, providerId: "market" }), null);

console.log("Access-policy contracts validated, including Add-on role policies.");
