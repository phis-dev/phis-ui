import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_THREADS_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_THREADS_RUNTIME_MODULE_WIDGETS } from "./widgets";

export function createPhiThreadsRuntimeModuleServerAreaContribution() {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_THREADS_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_THREADS_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_THREADS_RUNTIME_MODULE_WIDGETS,
      layouts: [],
      areaOverlays: [],
      // No route and no navigation yet: the composer is placed beside a conversation rather than being
      // a destination of its own. The Page it belongs on arrives with the inbox.
      routes: [],
      navigation: [],
      load: () => import("./module").then((module) => module.PHI_THREADS_RUNTIME_MODULE),
    },
  });
}
