/*
 * What a Module is for, as an operator reads it on the Modules page.
 *
 * The list comes from `@phis/contracts/catalog`, because the site UI is not the only party that reads
 * it: an Add-on declares a category per Module, and a marketplace filters offerings on it. Kept as a
 * re-export so an Add-on can keep reaching it through `@phis/ui/constants` without knowing that.
 *
 * The words an operator actually sees are not here -- those are label-set keys under
 * `components/widgets/label-sets/builder-modules`, translated per site. This file holds identifiers.
 */
export {
  PHI_RUNTIME_MODULE_CATEGORIES,
  isPhiRuntimeModuleCategory,
  type PhiRuntimeModuleCategory,
} from "@phis/contracts/catalog";
