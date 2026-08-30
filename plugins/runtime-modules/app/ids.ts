import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";

export const PHI_APP_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/app` as const satisfies PhiRuntimeModuleId;
