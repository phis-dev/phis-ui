import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_THREAD_COMPOSER_LABEL_SET = definePhiLabelSet({
  key: "widget:thread-composer",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    message_placeholder: definePhiMessageLabel("Write a message"),
    send_label: "Send",
    attach_label: "Attach a file",
    attach_hint: definePhiMessageLabel("Anyone who can read this conversation can open what you attach."),
    remove_attachment_label: "Remove",
    no_thread_text: definePhiMessageLabel("Choose a conversation to write in."),
    error_title: "That did not work",
    error_generic: definePhiMessageLabel("The message could not be sent."),
    error_network: definePhiMessageLabel("The site could not be reached."),
    error_too_large: definePhiMessageLabel("That file is too large."),
    error_type_not_allowed: definePhiMessageLabel("That kind of file cannot be attached."),
    error_duplicate: definePhiMessageLabel("That file is already attached."),
    error_quota_exceeded: definePhiMessageLabel("There is no room left in your space."),
    error_space_unavailable: definePhiMessageLabel("Files cannot be attached on this site."),
    error_storage_unreachable: definePhiMessageLabel("The file storage could not be reached."),
  },
});

export async function getPhiThreadComposerLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_THREAD_COMPOSER_LABEL_SET);
  return {
    messagePlaceholder: labels.message_placeholder,
    sendLabel: labels.send_label,
    attachLabel: labels.attach_label,
    attachHint: labels.attach_hint,
    removeAttachmentLabel: labels.remove_attachment_label,
    noThreadText: labels.no_thread_text,
    feedback: {
      errorTitle: labels.error_title,
      errorGeneric: labels.error_generic,
      errorNetwork: labels.error_network,
      errorTooLarge: labels.error_too_large,
      errorTypeNotAllowed: labels.error_type_not_allowed,
      errorDuplicate: labels.error_duplicate,
      errorQuotaExceeded: labels.error_quota_exceeded,
      errorSpaceUnavailable: labels.error_space_unavailable,
      errorStorageUnreachable: labels.error_storage_unreachable,
    },
  };
}

export type PhiThreadComposerLabels = Awaited<ReturnType<typeof getPhiThreadComposerLabels>>;
