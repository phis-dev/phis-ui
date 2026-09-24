import assert from "node:assert/strict";

import { PhiBaseRole } from "../constants/phi-base-roles";
import { filterPhiCmsRenderableTreeForViewer } from "../helpers/cms-access-policy";
import { createPhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import {
  PHI_VIEWER_ACCESS_ANYONE,
  PHI_VIEWER_ACCESS_AUTHENTICATED,
  PHI_VIEWER_ACCESS_SITE_ADMIN,
  canPhiViewerAccessOwnedPolicy,
  intersectPhiInheritedViewportFlags,
} from "../types/access";
import type { PhiResolvedCmsRenderableTree } from "../types/cms";
import type {
  PhiRuntimeModuleCatalogEntry,
  PhiRuntimeModuleDefinition,
} from "../types/cms-plugins";
import { filterPhiCommandToolbarButtonsForViewer } from "../plugins/runtime-modules/core/widgets/command-toolbar/config";
import { listPhiAccessibleAreas } from "../components/widgets/accessible-areas";

const CORE_PROVIDER = "@phis/server/core" as const;
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
  controllerType: "@test/pkg/modules/controller",
  controller: {
    // Matches `controllerType` above; the Module-policy assertion used to throw before this was read.
    pluginKey: "@test/pkg/modules",
    key: "controller",
    title: "Controller",
    allowedMountScopes: ["area"],
    runtimeSignals: { emits: [], listens: [] },
  },
  title: "Test",
  description: "Test runtime module.",
  category: "other",
  iconFamily: "test",
  controllerMountPolicy: "demand",
} satisfies PhiRuntimeModuleDefinition;

/*
 * A Module may name Core's roles or its own provider's, and nobody else's. The subject used to be the
 * Module itself; a Module carries no access policy any more (ACCESS.md section 5 -- it is on for an
 * Area or it is not), so the rule is checked where a policy still lives. A Widget minimum is the
 * smallest such place.
 */
const entry = {
  definition,
  routes: [{
    ownerModuleId: MODULE_ID,
    presetKey: "probe-page",
    presetVersion: 1,
    area: "public",
    title: "Probe",
    path: "/probe",
    navigation: [{
      navKey: "public:header",
      parentItemKey: null,
      item: {
        itemKey: "@test/pkg/nav/probe",
        label: { defaultMessage: "Probe" },
        accessPolicy: {
          access: "roles",
          providerId: FOREIGN_PROVIDER,
          allowedRoleFlags: 1,
        },
      },
    }],
    loadTree: () => {
      throw new Error("not loaded");
    },
  }],
  widgets: [],
  layouts: [],
  load: async () => {
    throw new Error("not loaded");
  },
} as unknown as PhiRuntimeModuleCatalogEntry;

assert.throws(
  () => createPhiRuntimeModuleCatalog([entry], []),
  /instead of Core or its bound provider/,
);

/**
 * The account menu offers the Areas a person may enter, so the list must agree with the Area policies
 * exactly. It used to re-derive visibility from base roles and from `viewer.resolvedArea`, which
 * disagreed: a Developer saw only App and Admin although the `Structure authoring`, `Content editing`
 * and `Accounting` masks all include Developer.
 *
 * Public is in the list. It is the Area anyone may enter, and from a staff shell it is the way back to
 * the Site -- the Area menu Widget that left it out was placed in staff shells only, and it is gone.
 */
const accessibleAreasFor = (roleFlags: number) =>
  listPhiAccessibleAreas({
    access: "authenticated",
    roleClaims: [{ providerId: CORE_PROVIDER, flags: roleFlags }],
    groupClaims: [],
  });

assert.deepEqual(
  accessibleAreasFor(PhiBaseRole.Developer),
  ["public", "app", "accounting", "admin", "editor", "builder"],
);
assert.deepEqual(accessibleAreasFor(PhiBaseRole.Builder), ["public", "app", "builder"]);
assert.deepEqual(accessibleAreasFor(PhiBaseRole.Author), ["public", "app", "editor"]);
assert.deepEqual(accessibleAreasFor(PhiBaseRole.Publisher), ["public", "app", "editor"]);
assert.deepEqual(accessibleAreasFor(PhiBaseRole.Accountant), ["public", "app", "accounting"]);
// The Site superuser rule carries the Admin, who appears in no ordinary Area mask.
assert.deepEqual(
  accessibleAreasFor(PhiBaseRole.Admin),
  ["public", "app", "accounting", "admin", "editor", "builder"],
);
// A signed-in account with no role holds App, which is authenticated rather than role-gated.
assert.deepEqual(accessibleAreasFor(0), ["public", "app"]);
// A guest reaches Public and nothing else, which is why the menu offers them no list at all.
assert.deepEqual(listPhiAccessibleAreas(publicViewer), ["public"]);

console.log("Access-policy contracts validated.");
