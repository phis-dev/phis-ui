import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type {
  PhiCmsDescriptorBuildContext,
  PhiCmsRoutePresetDescriptor,
} from "../../../types/cms-module-descriptors";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./ids";

/**
 * One Dashboard per Area, at the same path in each.
 *
 * The entry is anchored before the Area's own first sidebar item rather than appended, because the
 * Area root forwards to the first entry the viewer can see: where this item sits decides where the
 * front door leads.
 */
type PhiDashboardRouteTemplate = {
  area: PhiCmsAreaKey;
  navKey: `${PhiCmsAreaKey}:${string}`;
  before: string;
  eyebrow: string;
  description: string;
};

const GENERIC_DASHBOARDS = [
  {
    area: "app",
    navKey: "app:sidebar",
    before: "@phis/ui/modules/app/nav/home",
    eyebrow: "App",
    description: "Everything this site makes available to you once you are signed in.",
  },
  {
    area: "accounting",
    navKey: "accounting:sidebar",
    before: "@phis/ui/modules/accounting/nav/home",
    eyebrow: "Accounting",
    description: "Invoices and billing workflows for this site.",
  },
  {
    area: "editor",
    navKey: "editor:sidebar",
    before: "@phis/ui/modules/editor/nav/translations",
    eyebrow: "Editor",
    description: "Content and translation work for this site.",
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
  before: string;
  loadTree: PhiCmsRoutePresetDescriptor["loadTree"];
}): PhiCmsRoutePresetDescriptor {
  const presetKey = `${area}-dashboard-page`;
  return {
    ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    presetKey,
    presetVersion: 1,
    area,
    pageKey: "dashboard",
    title: "Dashboard",
    path: "/dashboard",
    navigation: [{
      navKey,
      parentItemKey: null,
      before,
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
      before: template.before,
      loadTree: ({ page }: PhiCmsDescriptorBuildContext) =>
        import("../../../components/regions/presets/phi-default-area-dashboard-page-tree")
          .then((module) => module.buildPhiDefaultAreaDashboardPageTree({
            page,
            area: template.area,
            presetKey: `${template.area}-dashboard-page`,
            title: "Dashboard",
            eyebrow: template.eyebrow,
            description: template.description,
          })),
    })
  ),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
