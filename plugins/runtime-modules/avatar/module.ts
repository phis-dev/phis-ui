import type { PhiRuntimeModule } from "../contracts";
import { PHI_AVATAR_RUNTIME_MODULE_DEFINITION } from "./definition";

/**
 * No Controller: nothing here coordinates between surfaces. The Widget opens the Overlay with the
 * generic dialog signal and the picker calls its route directly, so a Controller would only be a place
 * for state neither of them keeps.
 */
export const PHI_AVATAR_RUNTIME_MODULE = {
  ...PHI_AVATAR_RUNTIME_MODULE_DEFINITION,
} satisfies PhiRuntimeModule;
