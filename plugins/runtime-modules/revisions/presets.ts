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
    loadTree: ({ page, runtime }) =>
      import("./trees/phi-default-builder-revisions-page-tree")
        .then((module) => module.buildPhiDefaultBuilderRevisionsPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
