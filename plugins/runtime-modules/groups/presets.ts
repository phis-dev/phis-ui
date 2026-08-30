import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_GROUPS_RUNTIME_MODULE_ID } from "./ids";
import {
  PHI_VIEWER_ACCESS_AUTHENTICATED,
  PHI_VIEWER_ACCESS_DEVELOPER_TOOLS,
} from "../../../types/access";

export const PHI_GROUPS_RUNTIME_MODULE_ROUTES = [{
  ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
  presetKey: "admin-groups-page",
  presetVersion: 1,
  area: "admin",
  pageKey: "groups",
  title: "Groups",
  // Entry is Developer, which the Core Admin override widens to Admin -- a group is an authorization
  // unit Pages, Navigation, and Assets refer to, so making one is Site administration. A group's own
  // Manager administers their group where they work, not here.
  accessPolicy: PHI_VIEWER_ACCESS_DEVELOPER_TOOLS,
  path: "/groups",
  navigation: [{
    navKey: "admin:sidebar",
    parentItemKey: null,
    before: "@phis/ui/modules/admin/nav/settings",
    item: {
      itemKey: "@phis/ui/modules/groups/nav/admin/groups",
      label: { defaultMessage: "Groups" },
      icon: "antd:cluster",
      routePresetKey: "admin-groups-page",
    },
  }],
  loadTree: ({ page, runtime }) =>
    import("../../../components/regions/presets/phi-default-admin-groups-page-tree")
      .then((module) => module.buildPhiDefaultAdminGroupsPageTree({ page, runtime })),
}, {
  ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
  presetKey: "app-groups-page",
  presetVersion: 1,
  area: "app",
  pageKey: "groups",
  title: "Groups",
  // Anyone signed in: the page answers "which groups am I in and what may I do there", and having no
  // group is an answer rather than a reason to hide the page.
  accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED,
  path: "/groups",
  navigation: [{
    navKey: "app:sidebar",
    parentItemKey: null,
    // After Home, which is the App's own anchor: a root injection has to name where it goes.
    after: "@phis/ui/modules/app/nav/home",
    item: {
      itemKey: "@phis/ui/modules/groups/nav/app/groups",
      label: { defaultMessage: "Groups" },
      icon: "antd:cluster",
      routePresetKey: "app-groups-page",
    },
  }],
  loadTree: ({ page, runtime }) =>
    import("../../../components/regions/presets/phi-default-app-groups-page-tree")
      .then((module) => module.buildPhiDefaultAppGroupsPageTree({ page, runtime })),
}] satisfies readonly PhiCmsRoutePresetDescriptor[];
