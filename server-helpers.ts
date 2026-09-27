export {
  tr,
  trGlobal,
  trForLocale,
  trGlobalForLocale,
  trBulk,
  trBulkForLocale,
  trGlobalBulk,
  trGlobalBulkForLocale,
  PHI_TR_CTX_WEB_UI_LABEL,
} from "./server-helpers/translate";
export { phiRuntime } from "./server-helpers/phi-runtime";
export {
  definePhiLabelSet,
  definePhiMessageLabel,
  definePhiRuntimeModuleLabelSet,
  getPhiLabelSet,
  type PhiLabelSetDefinition,
  type PhiLabelSetEntry,
  type PhiLabelSetLabels,
  type PhiLabelSetTexts,
} from "./gateway/label-set";
/*
 * What `getPhiLabelSet` is asked with, named.
 *
 * The function above has been reachable by a Module package all along and its first parameter type was
 * not, so a package could call it and could not write down what it was calling it with -- which leaves
 * an author restating the shape locally, which is a second copy of a contract. The first-party label
 * sets take it from the gateway directly; this is the same type by the same name.
 */
export type { PhiGlobalTranslatorOptions } from "./gateway/tr";
/*
 * The Site's own address for this server, for code that runs outside a request.
 *
 * A label set is loaded while a Page is assembled and while a Form is prepared, and neither has a
 * request runtime to take the credentials from -- the first-party sets read them from here. It reads
 * `config/site-runtime.json` and caches by path, so it belongs on this boundary and not on the
 * Client-safe one.
 */
export { readPhiServerApiCredentials } from "./helpers/phis-server-credentials";
export type { PhiServerApiCredentials } from "./helpers/phis-server-credentials";
export { getPhiUserState, type GetPhiUserStateOptions, type PhiUserState } from "./gateway/user-state";
export { resolvePhiRequestLocale } from "./server-helpers/request-locale";
export { loadPhiResolvedCmsRequest } from "./server-helpers/cms-request";
export { loadPhiCmsRootRequest } from "./server-helpers/cms-root";
export { isPhiCmsGatewayAuthError } from "./gateway/errors";
export { loadPhiSiteRequestContext } from "./server-helpers/runtime";
export {
  loadPhiRootLayoutContext,
  type LoadPhiRootLayoutContextOptions,
  type PhiRootLayoutContext,
} from "./server-helpers/root-layout";
