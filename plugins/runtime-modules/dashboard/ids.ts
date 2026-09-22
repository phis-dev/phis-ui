import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";

export const PHI_DASHBOARD_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/dashboard` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's own view of the fan-in it answers. The names are a Foundation contract, so anything
 * outside this Module cites those; these aliases exist because a Module should not have to spell its
 * own namespace back to itself.
 */
export {
  PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY,
  PHI_DASHBOARD_CARD_ITEM_RENDERER_KEY,
  PHI_DASHBOARD_CARD_RESOURCE_KEY,
} from "../../../constants/dashboard-card-provider-keys";
