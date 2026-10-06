import type { PhiRuntimeModule } from "../contracts";
import { PHI_EDITOR_RUNTIME_MODULE_DEFINITION } from "./definition";

/**
 * No Controller. The one this Module carried answered nothing and rendered nothing, and was mounted on
 * every page of its Areas for it. Area-wide behaviour that belongs to no Module goes to the Core Runtime
 * Controller; a Module's own goes into that Module's Controller, mounted on demand.
 */
export const PHI_EDITOR_RUNTIME_MODULE = {
  ...PHI_EDITOR_RUNTIME_MODULE_DEFINITION,
} satisfies PhiRuntimeModule;
