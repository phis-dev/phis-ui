/**
 * What a Module package needs to check its own preset Pages in its own verify step, and nothing else
 * (THIRD_PARTY_MODULES.md, "Checking a Page preset").
 *
 * Narrow because it is verify-time tooling: it carries the Layout config parsers, which a Site's runtime
 * must not load for this. A package runs the check in its own tests over the trees its route presets
 * build, and treats a finding as an error; it is never called while a Site serves a request, and so it is
 * never part of `@phis/ui/helpers`.
 *
 * `checkPhiPresetTreeContract` is the one exception to "never at request time" for the code behind it, not
 * for this door: the descriptor compiler runs the same rules on every tree a preset loads and throws the
 * first finding. Here a package runs them first, with its own Forms, so a tree the compiler would refuse
 * fails the package's tests instead of answering 500 on a Site.
 *
 * No `server-only` here, on purpose: a test in a package loads this door without a mock.
 */

export { createPhiDeclaredMediaResolver, type PhiModuleMediaFinding } from "./helpers/module-media-check";
export { checkPhiPagePresetLayout, type PhiPageLayoutFinding } from "./helpers/page-layout-check";
export { checkPhiPresetTextSources, type PhiPresetTextSourceFinding } from "./helpers/preset-text-source-check";
export { checkPhiPresetTreeContract, type PhiPresetTreeContractFinding } from "./helpers/preset-tree-contract-check";
export { checkPhiRouteAddresses, type PhiRouteAddressFinding, type PhiRouteAddressSubject } from "./helpers/route-address-check";
