import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";

export const PHI_DASHBOARD_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/dashboard` as const satisfies PhiRuntimeModuleId;
