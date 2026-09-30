import type { PhiRuntimeModule } from "../contracts";
import { PHI_NEWS_RUNTIME_MODULE_DEFINITION } from "./definition";

/**
 * No Controller: nothing here coordinates between surfaces.
 *
 * The Table announces which action happened on which row, and each dialog and each Form decides by its
 * own `openActionKey` whether it was meant; a Form that went through closes its dialog and tells the
 * Table to read again. A Controller would be a place for state none of them keeps -- it held two things,
 * a spinner on the Save button and a refusal to close mid-save, and cost three silent failures for them.
 */
export const PHI_NEWS_RUNTIME_MODULE = {
  ...PHI_NEWS_RUNTIME_MODULE_DEFINITION,
} satisfies PhiRuntimeModule;
