import { describe, expect, it } from "vitest";

import { PHI_SHARED_FORM_IDS } from "./shared-form-ids";
import { PHI_AUTH_RUNTIME_MODULE_FORMS } from "../../plugins/runtime-modules/auth/forms";
import { PHI_PUBLIC_RUNTIME_MODULE_FORMS } from "../../plugins/runtime-modules/public/forms";
import {
  definePhiRuntimeModuleForm,
  findPhiFormDefinitionByPurpose,
  PHI_FORM_PURPOSES,
  type PhiRuntimeModuleFormDefinition,
} from "./form-registry";

/**
 * Core asks for the Form that sets a password by what it does, not by its id, so a Module replacing the
 * Auth Module can supply its own and the forced password change still has something to show.
 */
const PHI_SHARED_FORM_DEFINITIONS = [...PHI_AUTH_RUNTIME_MODULE_FORMS, ...PHI_PUBLIC_RUNTIME_MODULE_FORMS];

describe("Forms found by purpose", () => {
  it("finds the Auth Module's password Form as the account password change", () => {
    const found = findPhiFormDefinitionByPurpose(
      PHI_SHARED_FORM_DEFINITIONS,
      PHI_FORM_PURPOSES.accountPasswordChange,
    );
    expect(found?.formId).toBe(PHI_SHARED_FORM_IDS.profilePassword);
  });

  it("finds nothing where no active Module supplies the purpose", () => {
    const withoutPassword = PHI_SHARED_FORM_DEFINITIONS.filter(
      (definition) => definition.formId !== PHI_SHARED_FORM_IDS.profilePassword,
    );
    expect(findPhiFormDefinitionByPurpose(withoutPassword, PHI_FORM_PURPOSES.accountPasswordChange))
      .toBeNull();
  });

  it("refuses a purpose the platform does not know", () => {
    const passwordForm = PHI_SHARED_FORM_DEFINITIONS.find(
      (definition) => definition.formId === PHI_SHARED_FORM_IDS.profilePassword,
    ) as PhiRuntimeModuleFormDefinition;
    expect(() => definePhiRuntimeModuleForm({
      ...passwordForm,
      purpose: "account-anything" as never,
    })).toThrow(/unknown purpose/u);
  });
});
