import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";

export const PHI_AVATAR_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/avatar` as const satisfies PhiRuntimeModuleId;
