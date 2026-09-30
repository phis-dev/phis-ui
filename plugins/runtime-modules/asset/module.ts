import { PHI_ASSET_RUNTIME_CONTROLLER_DEFINITION } from "./controller/definition";
import { PHI_ASSET_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_ASSET_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_ASSET_RUNTIME_MODULE_DEFINITION,
  PHI_ASSET_RUNTIME_CONTROLLER_DEFINITION,
);
