import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";

export const PHI_TOUR_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/tour` as const satisfies PhiRuntimeModuleId;

/**
 * Where a person's Tours stand on this Site, one value for all of them: which version of which Tour was
 * completed or dismissed. One key rather than one per Tour, because the Tours a Site carries come from
 * whichever Modules own its Pages and this Module may only write keys it declared.
 */
export const PHI_TOUR_PROGRESS_USER_STATE_KEY = `${PHI_TOUR_RUNTIME_MODULE_ID}/progress` as const;
