import { PHI_THEME_RUNTIME_CONTROLLER_SERVER_DEFINITION } from "./controller/server-definition";
import { PHI_THEME_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_THEME_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_THEME_RUNTIME_MODULE_DEFINITION,
  PHI_THEME_RUNTIME_CONTROLLER_SERVER_DEFINITION,
);
