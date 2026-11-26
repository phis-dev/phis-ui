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
    // A Maintainer reads the user list and a user's login history but changes nothing, matching what
    // `phi-server` enforces (owner, 2026-11-26): GET on /api/site/admin/users -- the list and
    // `historyUserId` -- takes the maintainer guard; a user's record (`userId`, what the edit Form loads)
    // and every mutating method the admin-only one. The page carries that split through the controller's
    // `permissions.readOnly` projection: Create, Edit and Delete are hidden on it (`visibleWhen`), cell
    // editing stays locked (`disabledWhen`). Entry is the route's decision, capability the surface's.
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
   * Named "Customer data" (owner, 2026-11-26); the item key and the preset key keep the page's first name,
   * so the Site's stored navigation and revisions still find it.
   */
  buildPhiSidebarRoutePresetDescriptor({
    area: "admin",
    anchor: "settings",
    ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
    presetKey: PHI_USER_MANAGEMENT_USERS_ACCESS_PAGE_PRESET_KEY,
    title: "Customer data",
    path: "/settings/customer-data",
    itemKey: "@phis/ui/modules/user-management/nav/admin/settings/people-data",
    icon: "antd:safety-certificate",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-admin-users-access-page-tree")
        .then((module) => module.buildPhiDefaultAdminUsersAccessPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
