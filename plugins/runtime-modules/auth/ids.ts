import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleDefinition } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";
import { PHI_PUBLIC_LOGIN_ROUTE_IDENTITY } from "../../../constants/public-login-route";

export const PHI_AUTH_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/auth` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's identity as its Label Sets inherit it (`definePhiRuntimeModuleLabelSet`): the id and,
 * where a Module declares one, its source locale. Stated here beside the id and spread into the
 * definition, so a Label Set a tree or a form reads does not import the definition that imports the
 * tree -- and a Module that writes in another language says so once.
 */
export const PHI_AUTH_RUNTIME_MODULE_IDENTITY = {
  moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
} as const satisfies Pick<PhiRuntimeModuleDefinition, "moduleId" | "sourceLocale">;

/**
 * The route preset the Public login Page is: what the Area access guard looks up in the active route
 * table to learn where signing in is answered on this Site. The identity lives in the Foundation
 * (`constants/public-login-route.ts`) because the guard may not import this Module; the key is read from
 * there so the Module's route and the guard's lookup are one statement. The path is the Site's to assign.
 */
export const PHI_AUTH_PUBLIC_LOGIN_ROUTE_PRESET_KEY = PHI_PUBLIC_LOGIN_ROUTE_IDENTITY.presetKey;


export const PHI_AUTH_RUNTIME_DATA_PROVIDER_KEYS = {
  installations: createPhiSharedRuntimeDataProviderKey("tables", "auth-installations"),
} as const;

/**
 * The namespace this Module publishes its configuration facts under.
 *
 * Here rather than beside the resolver, so that naming it costs nothing: the catalog states the
 * namespace on every render and loads the resolver only where a page asks about it.
 */
export const PHI_AUTH_RUNTIME_MODULE_FEATURE_NAMESPACE = "auth";
