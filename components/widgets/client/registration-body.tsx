"use client";

import type { RegistrationFormLabels, RegistrationFormValues } from "../../forms/registration-form";
import { RegistrationForm } from "../../forms/registration-form";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";
import type { PhiClientBlockBaseProps, PhiBlockRuntime, PhiSignalAddress } from "../../../types";
import { usePhiRuntimeFormClient } from "../../forms/runtime-form-client";
import type { PhiFormDescriptor } from "../../../types/form-descriptor";

export type PhiRegistrationFormClientProps = PhiClientBlockBaseProps<
  RegistrationFormLabels,
  Record<string, never>,
  Pick<PhiBlockRuntime, "locale">
> & {
  issuedAt: string;
  formToken: string;
  formId?: string;
  formControllerAddress?: PhiSignalAddress | null;
  descriptor?: PhiFormDescriptor;
};

export function PhiRegistrationFormClient(props: PhiRegistrationFormClientProps) {
  const formController = usePhiRuntimeFormClient({
    controllerAddress: props.formControllerAddress,
  });

  async function handleSubmit(values: RegistrationFormValues) {
    const result = await formController.submit({
      formId: props.formId ?? PHI_SHARED_FORM_IDS.registration,
      values,
    });

    if (!result.ok) {
      const payload = result.payload;

      if (payload?.code === "account_exists") {
        throw new Error(props.labels.feedback.accountExistsError);
      }

      if (result.status === 401 && payload?.error === "Invalid credentials.") {
        throw new Error(props.labels.feedback.invalidCredentialsError);
      }

      throw new Error(
        typeof payload?.error === "string" ? payload.error : props.labels.feedback.genericError,
      );
    }
  }

  return (
    <RegistrationForm
      descriptor={props.descriptor}
      locale={props.runtime?.locale.current ?? "en"}
      issuedAt={props.issuedAt}
      formToken={props.formToken}
      onSubmit={handleSubmit}
      labels={props.labels}
    />
  );
}
