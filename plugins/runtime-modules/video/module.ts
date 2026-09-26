import type { PhiRuntimeModule } from "../contracts";
import { PHI_VIDEO_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_VIDEO_RUNTIME_MODULE = {
  ...PHI_VIDEO_RUNTIME_MODULE_DEFINITION,
} satisfies PhiRuntimeModule;
