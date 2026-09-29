import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PHI_GROUPS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_GROUPS_RUNTIME_MODULE_ROUTES = [
  buildPhiSidebarRoutePresetDescriptor({
    area: "admin",
    anchor: "main",
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    presetKey: "admin-groups-page",
    title: "Groups",
    // Entry is Developer, which the Core Admin override widens to Admin -- a group is an authorization
    // unit Pages, Navigation, and Assets refer to, so making one is Site administration. A group's own
    // Manager administers their group where they work, not here.
    path: "/groups",
    itemKey: "@phis/ui/modules/groups/nav/admin/groups",
    icon: "antd:cluster",
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-admin-groups-page-tree")
        .then((module) => module.buildPhiDefaultAdminGroupsPageTree({ page, runtime })),
  }),
  buildPhiSidebarRoutePresetDescriptor({
    area: "app",
    anchor: "main",
    ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
    presetKey: "app-groups-page",
    title: "Groups",
    // Anyone signed in: the page answers "which groups am I in and what may I do there", and having no
    // group is an answer rather than a reason to hide the page.
    path: "/groups",
    itemKey: "@phis/ui/modules/groups/nav/app/groups",
    icon: "antd:cluster",
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-app-groups-page-tree")
        .then((module) => module.buildPhiDefaultAppGroupsPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
