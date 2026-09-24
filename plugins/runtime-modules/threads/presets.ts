import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_BASE_PAGE_LAYOUT_VERSION } from "../../../components/regions/presets/phi-base-page-layout";
import { PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_THREADS_RUNTIME_MODULE_ROUTES = [{
  ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
  presetKey: "app-threads-page",
  presetVersion: 1 + PHI_BASE_PAGE_LAYOUT_VERSION,
  area: "app",
  title: "Conversations",
  // Anyone signed in. Which conversations they see is the Core route's answer and not this Page's:
  // having none is an answer, and one a person can act on from here.
  path: "/conversations",
  navigation: [{
    navKey: "app:sidebar",
    parentItemKey: null,
    item: {
      itemKey: "@phis/ui/modules/threads/nav/app/conversations",
      label: { defaultMessage: "Conversations" },
      icon: "antd:message",
      routePresetKey: "app-threads-page",
    },
  }],
  loadTree: ({ page, runtime }) =>
    import("../../../components/regions/presets/phi-default-app-threads-page-tree")
      .then((module) => module.buildPhiDefaultAppThreadsPageTree({ page, runtime })),
}] satisfies readonly PhiCmsRoutePresetDescriptor[];
