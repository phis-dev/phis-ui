import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID, PHI_USER_MANAGEMENT_USERS_ACCESS_PAGE_PRESET_KEY } from "./ids";

export const PHI_USER_MANAGEMENT_RUNTIME_MODULE_ROUTES = [
  buildPhiSidebarRoutePresetDescriptor({
    area: "admin",
    anchor: "main",
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    presetKey: "admin-users-page",
    title: "Users",
    // A Maintainer reads user management but changes nothing, matching what `phi-server` enforces:
    // GET on /api/site/admin/users takes the maintainer guard, every mutating method the admin-only
    // one. The page carries that split through the controller's `permissions.readOnly` projection and
    // the `disabledWhen` conditions built on it, so entry is the route's decision and capability is
    // the surface's.
    path: "/users",
    itemKey: "@phis/ui/modules/user-management/nav/admin/users",
    icon: "antd:team",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-admin-users-page-tree")
        .then((module) => module.buildPhiDefaultAdminUsersPageTree({ page, runtime })),
  }),
  /*
   * What Add-ons may read of people, in the Admin's Settings: the entry is a Site Admin's, as the routes
   * behind it are (`/api/site/admin/users-access`). Beside Users, because it is about the same people.
   */
  buildPhiSidebarRoutePresetDescriptor({
    area: "admin",
    anchor: "settings",
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    presetKey: PHI_USER_MANAGEMENT_USERS_ACCESS_PAGE_PRESET_KEY,
    title: "People data",
    path: "/settings/people-data",
    itemKey: "@phis/ui/modules/user-management/nav/admin/settings/people-data",
    icon: "antd:safety-certificate",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-admin-users-access-page-tree")
        .then((module) => module.buildPhiDefaultAdminUsersAccessPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
