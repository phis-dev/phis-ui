import { PHI_ASSET_RUNTIME_CONTROLLER_DEFINITION } from "../../../components/media/asset-controller-definition";
import { PHI_ASSET_RUNTIME_MODULE_DEFINITION } from "./definition";
import type { PhiRuntimeModule } from "../contracts";

export const PHI_ASSET_RUNTIME_MODULE = {
  ...PHI_ASSET_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_ASSET_RUNTIME_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
