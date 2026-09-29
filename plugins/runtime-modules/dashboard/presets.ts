import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../../components/regions/presets/phi-base-page-layout";
import type {
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import type { PhiAreaDashboardKey } from "../../../components/regions/presets/area-dashboard-label-set";
import { buildPhiSidebarRoutePresetDescriptor, type PhiSidebarAreaKey } from "../sidebar-route";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./ids";

/**
 * One Dashboard per Area, at the same path in each, at the top of the Area's sidebar.
 *
 * `start` rather than wherever the Module happens to sort, because the Area root forwards to the first
 * entry the viewer can see: where this item sits decides where the front door leads. What `start` is
 * the Area says, so the Dashboard names no entry of any Area's.
 *
 * Every Dashboard is a base page layout, the Builder's included, so every one states that version
 * rather than the one its Area's own pages are built on.
 */
function buildDashboardRoute({
  area,
  loadTree,
}: {
  area: PhiSidebarAreaKey;
  loadTree: PhiCmsRoutePresetDescriptor["loadTree"];
}): PhiCmsRoutePresetDescriptor {
  return buildPhiSidebarRoutePresetDescriptor({
    area,
    anchor: "start",
    ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    presetKey: `${area}-dashboard-page`,
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    title: "Dashboard",
    path: "/dashboard",
    itemKey: `@phis/ui/modules/dashboard/nav/${area}/dashboard`,
    icon: "antd:dashboard",
    loadTree,
  });
}

/*
 * What each of these Dashboards says is no longer here.
 *
 * The eyebrow and the sentence travelled with the template while the page drew them on a card. The page
 * places a Collection over the card contributions now, so the sentence is a page description and lives
 * in the preset's label set with the rest of its words -- see `area-dashboard-label-set.ts`.
 */
const GENERIC_DASHBOARD_AREAS = ["app", "accounting", "editor"] as const satisfies
  readonly PhiAreaDashboardKey[];

export const PHI_DASHBOARD_RUNTIME_MODULE_ROUTES = [
  buildDashboardRoute({
    area: "admin",
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-admin-dashboard-page-tree")
        .then((module) => module.buildPhiDefaultAdminDashboardPageTree({ page, runtime })),
  }),
  buildDashboardRoute({
    area: "builder",
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-builder-dashboard-page-tree")
        .then((module) => module.buildPhiDefaultBuilderDashboardPageTree({ page, runtime })),
  }),
  ...GENERIC_DASHBOARD_AREAS.map((area) =>
    buildDashboardRoute({
      area,
      loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
        import("../../../components/regions/presets/phi-default-area-dashboard-page-tree")
          .then((module) => module.buildPhiDefaultAreaDashboardPageTree({
            page,
            runtime,
            area,
            presetKey: `${area}-dashboard-page`,
          })),
    })
  ),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
