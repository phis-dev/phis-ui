import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";

export const PHI_CORE_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/core` as const satisfies PhiRuntimeModuleId;
