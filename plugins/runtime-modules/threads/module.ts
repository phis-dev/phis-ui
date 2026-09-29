import { PHI_THREADS_RUNTIME_CONTROLLER_DEFINITION } from "./controller/definition";
import { PHI_THREADS_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_THREADS_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_THREADS_RUNTIME_MODULE_DEFINITION,
  PHI_THREADS_RUNTIME_CONTROLLER_DEFINITION,
);
