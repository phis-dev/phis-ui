import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_CONTACT_FORM_LABEL_SET = definePhiLabelSet({
  key: "widget:contact-form",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    name_label: "Name",
    name_placeholder: "Your name",
    name_required: "Please enter your name.",
    email_label: "Email",
    email_placeholder: "mail@example.com",
    email_required: "Please enter your email address.",
    email_invalid: "Please provide a valid email address.",
    subject_label: "Subject",
    subject_placeholder: "What is this about?",
    subject_required: "Please enter a subject.",
    message_label: "Message",
    message_placeholder: "Your message",
    message_required: "Please enter your message.",
    generic_error: "Could not send message.",
    submit_label: "Send",
    success_title: "Message sent",
    success_text: "Your message has been submitted successfully. We will get back to you as soon as possible.",
  },
});

export async function getPhiContactFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_CONTACT_FORM_LABEL_SET);
  return {
    fields: {
      name: {
        label: labels.name_label,
        placeholder: labels.name_placeholder,
        required: labels.name_required,
      },
      email: {
        label: labels.email_label,
        placeholder: labels.email_placeholder,
        required: labels.email_required,
        invalid: labels.email_invalid,
      },
      subject: {
        label: labels.subject_label,
        placeholder: labels.subject_placeholder,
        required: labels.subject_required,
      },
      message: {
        label: labels.message_label,
        placeholder: labels.message_placeholder,
        required: labels.message_required,
      },
    },
    actions: {
      submitLabel: labels.submit_label,
    },
    feedback: {
      successTitle: labels.success_title,
      successText: labels.success_text,
      genericError: labels.generic_error,
    },
  };
}
