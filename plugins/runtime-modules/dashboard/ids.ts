import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleDefinition } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleId } from "../contracts";

export const PHI_DASHBOARD_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/dashboard` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's identity as its Label Sets inherit it (`definePhiRuntimeModuleLabelSet`): the id and,
 * where a Module declares one, its source locale. Stated here beside the id and spread into the
 * definition, so a Label Set a tree or a form reads does not import the definition that imports the
 * tree -- and a Module that writes in another language says so once.
 */
export const PHI_DASHBOARD_RUNTIME_MODULE_IDENTITY = {
  moduleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
} as const satisfies Pick<PhiRuntimeModuleDefinition, "moduleId" | "sourceLocale">;

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
