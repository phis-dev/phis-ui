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

const PHI_THREAD_CONVERSATION_LABEL_SET = definePhiLabelSet({
  key: "widget:thread-conversation",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    no_thread_text: definePhiMessageLabel("Choose a conversation to read."),
    loading_text: definePhiMessageLabel("Loading the conversation."),
    empty_text: definePhiMessageLabel("Nothing has been said here yet."),
    subject_fallback: "Conversation",
    older_label: "Show earlier messages",
    archived_label: "Archived",
    /*
     * Said on the note itself rather than in a legend somewhere.
     *
     * Staff write internal notes in the same place they write to the requester, and the one thing that
     * must never be in doubt is which of the two a message is. A marker on the message is the only
     * place a person actually looks while writing the next one.
     */
    internal_label: "Internal note",
    redacted_text: definePhiMessageLabel("This message was withdrawn."),
    withheld_text: definePhiMessageLabel("This message is not shown to you."),
    system_author_label: "System",
    /* A projection carries a display name or nothing; nothing is still somebody. */
    unnamed_author_label: "Someone",
    error_title: "That did not work",
    error_generic: definePhiMessageLabel("The conversation could not be loaded."),
    error_network: definePhiMessageLabel("The site could not be reached."),
    error_not_found: definePhiMessageLabel("This conversation is not there, or is not yours to read."),
  },
});

/**
 * What the Page around the three surfaces says.
 *
 * Its own set rather than a corner of the conversation's: this is the Page's title in a navigation
 * menu and in a browser tab, and a Site that renames the Page renames one thing.
 */
const PHI_THREAD_PAGE_LABEL_SET = definePhiLabelSet({
  key: "page:threads",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Conversations",
    description: definePhiMessageLabel("Everything you are part of, and where to answer it."),
    inbox_title: "Conversations",
    inbox_empty: definePhiMessageLabel("Nothing yet. Start one."),
    new_conversation_label: "New conversation",
    composer_label: "Your answer",
  },
});

export async function getPhiThreadPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_THREAD_PAGE_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    inboxTitle: labels.inbox_title,
    inboxEmpty: labels.inbox_empty,
    newConversationLabel: labels.new_conversation_label,
    composerLabel: labels.composer_label,
  };
}

export type PhiThreadPageLabels = Awaited<ReturnType<typeof getPhiThreadPageLabels>>;

export async function getPhiThreadConversationLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_THREAD_CONVERSATION_LABEL_SET);
  return {
    noThreadText: labels.no_thread_text,
    loadingText: labels.loading_text,
    emptyText: labels.empty_text,
    subjectFallback: labels.subject_fallback,
    olderLabel: labels.older_label,
    archivedLabel: labels.archived_label,
    internalLabel: labels.internal_label,
    redactedText: labels.redacted_text,
    withheldText: labels.withheld_text,
    systemAuthorLabel: labels.system_author_label,
    unnamedAuthorLabel: labels.unnamed_author_label,
    feedback: {
      errorTitle: labels.error_title,
      errorGeneric: labels.error_generic,
      errorNetwork: labels.error_network,
      errorNotFound: labels.error_not_found,
    },
  };
}

export type PhiThreadConversationLabels =
  Awaited<ReturnType<typeof getPhiThreadConversationLabels>>;

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
