import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PHI_CDN_ADMIN_PAGE_PRESET_KEY, PHI_CDN_RUNTIME_MODULE_ID } from "./ids";

/*
 * The Admin Area's policy already admits Admins and Maintainers (`PHI_VIEWER_ACCESS_SITE_MAINTENANCE`),
 * which is who Core lets use the CDN routes; the entry needs no policy of its own.
 */
export const PHI_CDN_RUNTIME_MODULE_ROUTES = [
  buildPhiSidebarRoutePresetDescriptor({
    area: "admin",
    anchor: "main",
    ownerModuleId: PHI_CDN_RUNTIME_MODULE_ID,
    presetKey: PHI_CDN_ADMIN_PAGE_PRESET_KEY,
    title: "CDN",
    path: "/cdn",
    itemKey: "@phis/ui/modules/cdn/nav/admin/cdn",
    icon: "antd:cloud-upload",
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-admin-cdn-page-tree")
        .then((module) => module.buildPhiDefaultAdminCdnPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
