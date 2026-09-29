import { PHI_BUILDER_RUNTIME_CONTROLLER_SERVER_DEFINITION } from "./controller/server-definition";
import { PHI_BUILDER_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_BUILDER_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_BUILDER_RUNTIME_MODULE_DEFINITION,
  PHI_BUILDER_RUNTIME_CONTROLLER_SERVER_DEFINITION,
);
