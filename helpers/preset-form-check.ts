import type { PhiFormDescriptor } from "@phis/contracts/forms";

import { checkPhiFormDescriptorFields } from "../components/forms/form-descriptor-field-check";
import type { PhiPresetTreeContractFinding } from "./preset-tree-contract-check";

/**
 * Every Form a package ships, held to the rules its fields' Controls read them by
 * (`checkPhiFormDescriptorFields`: a money field's currency and `currencyField`, a flags field's bits),
 * as findings whose `node` is the Form id (THIRD_PARTY_MODULES.md, "Checking a Page preset").
 *
 * Verify-time only, from `@phis/ui/module/page-check`: a package runs it in its own tests over its Form
 * definitions (`definePhiRuntimeModuleForm`), as phis-ui runs it over its own, and a Site never loads it.
 */
export function checkPhiPresetForms(
  forms: Iterable<{ formId: string; descriptor: Pick<PhiFormDescriptor, "fields"> }>,
): PhiPresetTreeContractFinding[] {
  return [...forms].flatMap((form) =>
    checkPhiFormDescriptorFields(form.descriptor).map((message) => ({ node: form.formId, message })));
}
