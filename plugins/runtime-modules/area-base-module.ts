import type { PhiRuntimeControllerDefinition } from "../../types";
import type {
  PhiRuntimeModule,
  PhiRuntimeModuleDefinition,
} from "./contracts";

export function createPhiAreaBaseRuntimeModule(
  definition: PhiRuntimeModuleDefinition,
  controllerDefinition: PhiRuntimeControllerDefinition<unknown, unknown>,
): PhiRuntimeModule {
  return { ...definition, controllerDefinition };
}
