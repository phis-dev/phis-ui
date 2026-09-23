import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../../components/regions/presets/phi-base-page-layout";
import type {
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { PHI_APP_SETTINGS_NAV_ITEM_KEY } from "../area-definitions";
import type { PhiAreaDashboardKey } from "../../../components/regions/presets/area-dashboard-label-set";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./ids";

/**
 * One Dashboard per Area, at the same path in each.
 *
 * The entry is anchored before the Area's own first sidebar item rather than appended, because the
 * Area root forwards to the first entry the viewer can see: where this item sits decides where the
 * front door leads.
 *
 * Anchoring before an Area's Settings container is how most Areas state it, and that container stands
 * last: "before" it means ahead of everything held back to the end, which is where a Dashboard wants
 * to be -- and, sorted against the other Modules anchored the same way, first.
 */
type PhiDashboardRouteTemplate = {
  area: PhiAreaDashboardKey;
  navKey: `${PhiCmsAreaKey}:${string}`;
  /** Absent only where an Area declares no intrinsic entry at all to sit before. */
  before?: string;
};

/*
 * What each of these Dashboards says is no longer here.
 *
 * The eyebrow and the sentence travelled with the template while the page drew them on a card. The page
 * places a Collection over the card contributions now, so the sentence is a page description and lives
 * in the preset's label set with the rest of its words -- see `area-dashboard-label-set.ts`.
 */
const GENERIC_DASHBOARDS = [
  {
    area: "app",
    navKey: "app:sidebar",
    before: PHI_APP_SETTINGS_NAV_ITEM_KEY,
  },
  {
    area: "accounting",
    navKey: "accounting:sidebar",
    before: "@phis/ui/modules/accounting/nav/home",
  },
  {
    area: "editor",
    navKey: "editor:sidebar",
    before: "@phis/ui/modules/editor/nav/translations",
  },
] as const satisfies readonly PhiDashboardRouteTemplate[];

function buildDashboardRoute({
  area,
  navKey,
  before,
  loadTree,
}: {
  area: PhiCmsAreaKey;
  navKey: `${PhiCmsAreaKey}:${string}`;
  /** Absent where the Area declares no intrinsic entry to sit before. */
  before?: string;
  loadTree: PhiCmsRoutePresetDescriptor["loadTree"];
}): PhiCmsRoutePresetDescriptor {
  const presetKey = `${area}-dashboard-page`;
  return {
    ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    presetKey,
    presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
    area,
    title: "Dashboard",
    path: "/dashboard",
    navigation: [{
      navKey,
      parentItemKey: null,
      ...(before ? { before } : {}),
      item: {
        itemKey: `@phis/ui/modules/dashboard/nav/${area}/dashboard`,
        label: { defaultMessage: "Dashboard" },
        icon: "antd:dashboard",
        routePresetKey: presetKey,
      },
    }],
    loadTree,
  };
}

export const PHI_DASHBOARD_RUNTIME_MODULE_ROUTES = [
  buildDashboardRoute({
    area: "admin",
    navKey: "admin:sidebar",
    before: "@phis/ui/modules/admin/nav/settings",
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-admin-dashboard-page-tree")
        .then((module) => module.buildPhiDefaultAdminDashboardPageTree({ page, runtime })),
  }),
  buildDashboardRoute({
    area: "builder",
    navKey: "builder:sidebar",
    before: "@phis/ui/builder/nav/modules",
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-builder-dashboard-page-tree")
        .then((module) => module.buildPhiDefaultBuilderDashboardPageTree({ page, runtime })),
  }),
  ...GENERIC_DASHBOARDS.map((template) =>
    buildDashboardRoute({
      area: template.area,
      navKey: template.navKey,
      ...("before" in template ? { before: template.before } : {}),
      loadTree: ({ page, runtime }: PhiCmsDescriptorBuildContext) =>
        import("../../../components/regions/presets/phi-default-area-dashboard-page-tree")
          .then((module) => module.buildPhiDefaultAreaDashboardPageTree({
            page,
            runtime,
            area: template.area,
            presetKey: `${template.area}-dashboard-page`,
          })),
    })
  ),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
