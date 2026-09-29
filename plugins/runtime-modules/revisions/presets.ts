import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_REVISIONS_RUNTIME_MODULE_ROUTES = [
  buildPhiSidebarRoutePresetDescriptor({
    area: "builder",
    anchor: "main",
    ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
    presetKey: "builder-revisions-page",
    title: "Revisions",
    path: "/revisions",
    itemKey: "@phis/ui/modules/revisions/nav/builder/revisions",
    icon: "antd:history",
    loadTree: ({ page, runtime, catalog }) =>
      import("../../../components/regions/presets/phi-default-builder-area-preset-tree")
        .then((module) => module.buildPhiDefaultBuilderPagePresetTree({
          page,
          runtime,
          registry: catalog,
          ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
          presetKey: "builder-revisions-page",
        })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
