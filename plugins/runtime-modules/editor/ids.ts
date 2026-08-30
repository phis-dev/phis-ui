import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";

export const PHI_EDITOR_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/editor` as const satisfies PhiRuntimeModuleId;
