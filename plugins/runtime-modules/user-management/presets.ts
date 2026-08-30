import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "./ids";
import { PHI_VIEWER_ACCESS_DEVELOPER_TOOLS } from "../../../types/access";

export const PHI_USER_MANAGEMENT_RUNTIME_MODULE_ROUTES = [{
  ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
  presetKey: "admin-users-page",
  presetVersion: 1,
  area: "admin",
  pageKey: "users",
  title: "Users",
  // A Developer reads user management but changes nothing, matching what `phi-server` enforces:
  // GET on /api/site/admin/users takes the developer guard, every mutating method the admin-only
  // one. The page carries that split through the controller's `permissions.readOnly` projection and
  // the `disabledWhen` conditions built on it, so entry is the route's decision and capability is
  // the surface's.
  accessPolicy: PHI_VIEWER_ACCESS_DEVELOPER_TOOLS,
  path: "/users",
  navigation: [{
    navKey: "admin:sidebar",
    parentItemKey: null,
    before: "@phis/ui/modules/admin/nav/settings",
    item: {
      itemKey: "@phis/ui/modules/user-management/nav/admin/users",
      label: { defaultMessage: "Users" },
      icon: "antd:team",
      routePresetKey: "admin-users-page",
    },
  }],
  loadTree: ({ page, runtime }) =>
    import("../../../components/regions/presets/phi-default-admin-users-page-tree")
      .then((module) => module.buildPhiDefaultAdminUsersPageTree({ page, runtime })),
}] satisfies readonly PhiCmsRoutePresetDescriptor[];
