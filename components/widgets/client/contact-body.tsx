"use client";

import type { ContactFormValues, ContactFormLabels } from "../../forms/contact-form";
import { ContactForm } from "../../forms/contact-form";
import { PHI_SHARED_FORM_IDS } from "../../forms/shared-form-ids";
import type { PhiClientBlockBaseProps, PhiSignalAddress } from "../../../types";
import { usePhiRuntimeFormClient } from "../../forms/runtime-form-client";
import type { PhiFormDescriptor } from "../../../types/form-descriptor";

export type PhiContactFormClientProps = PhiClientBlockBaseProps<ContactFormLabels> & {
  issuedAt: string;
  formToken: string;
  formId?: string;
  formControllerAddress?: PhiSignalAddress | null;
  descriptor?: PhiFormDescriptor;
};

export function PhiContactFormClient(props: PhiContactFormClientProps) {
  const formController = usePhiRuntimeFormClient({
    controllerAddress: props.formControllerAddress,
  });

  async function handleSubmit(values: ContactFormValues) {
    if (values.website) {
      return;
    }

    const result = await formController.submit({
      formId: props.formId ?? PHI_SHARED_FORM_IDS.contact,
      values,
    });

    if (!result.ok) {
      throw new Error(
        typeof result.payload?.error === "string" ? result.payload.error : props.labels.feedback.genericError,
      );
    }
  }

  return (
    <ContactForm
      descriptor={props.descriptor}
      labels={props.labels}
      issuedAt={props.issuedAt}
      formToken={props.formToken}
      onSubmit={handleSubmit}
    />
  );
}
