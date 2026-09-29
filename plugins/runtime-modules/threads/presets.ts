import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { buildPhiSidebarRoutePresetDescriptor } from "../sidebar-route";
import { PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_THREADS_RUNTIME_MODULE_ROUTES = [
  buildPhiSidebarRoutePresetDescriptor({
    area: "app",
    anchor: "main",
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    presetKey: "app-threads-page",
    title: "Conversations",
    // Anyone signed in. Which conversations they see is the Core route's answer and not this Page's:
    // having none is an answer, and one a person can act on from here.
    path: "/conversations",
    itemKey: "@phis/ui/modules/threads/nav/app/conversations",
    icon: "antd:message",
    loadTree: ({ page, runtime }) =>
      import("../../../components/regions/presets/phi-default-app-threads-page-tree")
        .then((module) => module.buildPhiDefaultAppThreadsPageTree({ page, runtime })),
  }),
] satisfies readonly PhiCmsRoutePresetDescriptor[];
