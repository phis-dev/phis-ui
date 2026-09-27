/**
 * What a Module package needs to have translated text, and nothing else.
 *
 * A narrow door on purpose. `@phis/ui/server-helpers` carries these names too, and a package that
 * reaches for them there pulls the whole server barrel with it -- `cms-root.ts` and `next/headers`
 * among the rest -- into a graph that must not have them. It compiles, and then every page of the Site
 * answers 500 with an import trace that names the barrel rather than the mistake.
 *
 * The first-party Modules never met this, because they sit inside this package and import
 * `../../gateway/label-set` directly. That is the whole reason this file exists: the boundary a Module
 * outside must use should be as narrow as the relative path a Module inside gets for free.
 */

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
export { PHI_TR_CTX_WEB_UI_LABEL, PHI_TR_CTX_WEB_UI_MESSAGE } from "./gateway/tr";
export type { PhiGlobalTranslatorOptions } from "./gateway/tr";
/** Where a Site's own address for this server comes from, for code that runs outside a request. */
export { readPhiServerApiCredentials } from "./helpers/phis-server-credentials";
export type { PhiServerApiCredentials } from "./helpers/phis-server-credentials";
