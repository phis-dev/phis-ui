"use client";

import { useRef, useState } from "react";
import { Space } from "antd";

import type { PhiFormDescriptor } from "../../types/form-descriptor";
import type { PhiFormGuardProps, PhiSubmitFormProps } from "./contracts";
import { PhiFormControl, type PhiFormControlHandle } from "../controls/phi-form-control";
import { flattenPhiFormLabels } from "./form-labels";
import { PHI_CONTACT_FORM_DESCRIPTOR } from "./shared-form-descriptors";
import { PhiAlertControl } from "../controls/phi-alert-control";
import { usePhiApplicationFeedback } from "../runtime/use-phi-application-feedback";
import { PhiButtonControl } from "../controls/phi-button-control";

export type ContactFormLabels = {
  fields: {
    name: { label: string; placeholder: string; required: string };
    email: { label: string; placeholder: string; required: string; invalid: string };
    subject: { label: string; placeholder: string; required: string };
    message: { label: string; placeholder: string; required: string };
  };
  actions: { submitLabel: string };
  feedback: { successTitle: string; successText: string; genericError: string };
};

export type ContactFormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string;
  issuedAt: string;
  formToken: string;
};

export type ContactFormProps = PhiSubmitFormProps<ContactFormValues, ContactFormLabels> &
  PhiFormGuardProps & {
    descriptor?: PhiFormDescriptor;
  };

export function ContactForm({
  descriptor = PHI_CONTACT_FORM_DESCRIPTOR,
  labels,
  issuedAt,
  formToken,
  onSubmit,
}: ContactFormProps) {
  const { showMessage } = usePhiApplicationFeedback();
  const formRef = useRef<PhiFormControlHandle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <Space orientation="vertical" size={24} style={{ width: "100%" }}>
      {sent ? (
        <PhiAlertControl
          level="success"
          showIcon
          title={labels.feedback.successTitle}
          description={labels.feedback.successText}
        />
      ) : null}
      <PhiFormControl
        ref={formRef}
        descriptor={descriptor}
        labels={flattenPhiFormLabels(labels)}
        initialValues={{ issuedAt, formToken }}
        onSubmittingChange={setSubmitting}
        onSubmit={async (values) => {
          try {
            await onSubmit(values as ContactFormValues);
            setSent(true);
            formRef.current?.reset();
            showMessage({ level: "success", content: labels.feedback.successTitle });
          } catch (error) {
            showMessage({ level: "error", content: error instanceof Error ? error.message : labels.feedback.genericError });
            throw error;
          }
        }}
      />
      <PhiButtonControl
        type="primary"
        label={labels.actions.submitLabel}
        loading={submitting}
        onClick={() => formRef.current?.submit()}
      />
    </Space>
  );
}
