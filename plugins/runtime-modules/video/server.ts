import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_VIDEO_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_VIDEO_RUNTIME_MODULE_WIDGETS } from "./widgets";

export function createPhiVideoRuntimeModuleServerAreaContribution() {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_VIDEO_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_VIDEO_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_VIDEO_RUNTIME_MODULE_WIDGETS,
      layouts: [],
      routes: [],
      load: () => import("./module").then((module) => module.PHI_VIDEO_RUNTIME_MODULE),
    },
  });
}
