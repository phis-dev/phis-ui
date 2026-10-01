import type { PhiRuntimeModule } from "../contracts";
import { PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION } from "../accounting/definition";

/**
 * No Controller. The Area base Controller this Module carried answered nothing and rendered nothing,
 * and was mounted on every page of the Area for it. Area-wide behaviour that belongs to no Module goes
 * to the Core Runtime Controller; a Module's own goes into that Module's Controller, mounted on demand.
 */
export const PHI_ACCOUNTING_RUNTIME_MODULE = {
  ...PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION,
} satisfies PhiRuntimeModule;
