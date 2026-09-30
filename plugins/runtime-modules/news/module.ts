import { createPhiAreaBaseRuntimeModule } from "../area-base-module";
import { PHI_NEWS_RUNTIME_CONTROLLER_DEFINITION } from "./controller/definition";
import { PHI_NEWS_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_NEWS_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_NEWS_RUNTIME_MODULE_DEFINITION,
  PHI_NEWS_RUNTIME_CONTROLLER_DEFINITION,
);
