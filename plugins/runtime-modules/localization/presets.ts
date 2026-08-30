import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "./ids";

export const PHI_LOCALIZATION_RUNTIME_MODULE_ROUTES = [{
  ownerModuleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
  presetKey: "admin-locales-page",
  presetVersion: 1,
  area: "admin",
  pageKey: "locales",
  title: "Locales",
  path: "/locales",
  navigation: [{
    navKey: "admin:sidebar",
    parentItemKey: null,
    before: "@phis/ui/modules/admin/nav/settings",
    item: {
      itemKey: "@phis/ui/modules/localization/nav/admin/locales",
      label: { defaultMessage: "Locales" },
      icon: "antd:translation",
      routePresetKey: "admin-locales-page",
    },
  }],
  loadTree: ({ page, runtime }) =>
    import("../../../components/regions/presets/phi-default-admin-locales-page-tree")
      .then((module) => module.buildPhiDefaultAdminLocalesPageTree({ page, runtime })),
}] satisfies readonly PhiCmsRoutePresetDescriptor[];
