import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiAdminSidebarRoutePresetDescriptor } from "../admin-sidebar-route";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "./ids";

export const PHI_USER_MANAGEMENT_RUNTIME_MODULE_ROUTES = [
  buildPhiAdminSidebarRoutePresetDescriptor({
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    presetKey: "admin-users-page",
    title: "Users",
    // A Developer reads user management but changes nothing, matching what `phi-server` enforces:
    // GET on /api/site/admin/users takes the developer guard, every mutating method the admin-only
    // one. The page carries that split through the controller's `permissions.readOnly` projection and
    // the `disabledWhen` conditions built on it, so entry is the route's decision and capability is
    // the surface's.
    path: "/users",
    placement: "sidebar",
    itemKey: "@phis/ui/modules/user-management/nav/admin/users",
    icon: "antd:team",
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-admin-users-page-tree")
        .then((module) => module.buildPhiDefaultAdminUsersPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
