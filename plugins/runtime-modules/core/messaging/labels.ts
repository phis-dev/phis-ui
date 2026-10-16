import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../../gateway/label-set";
import { PHI_CORE_RUNTIME_MODULE_IDENTITY } from "../ids";

/*
 * What a conversation and the reply to it say, wherever they are placed.
 *
 * Core's, because messaging is: every Module that runs conversations of its own kind -- direct ones,
 * a group's, Support's, an add-on's -- places the same conversation and the same reply, and reads them
 * in the same words. A Module says what its own Page is called; it does not say "Reply" again.
 */

const PHI_THREAD_CONVERSATION_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_CORE_RUNTIME_MODULE_IDENTITY, {
  key: "widget:thread-conversation",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    no_thread_text: definePhiMessageLabel("Choose a conversation to read."),
    loading_text: definePhiMessageLabel("Loading the conversation."),
    empty_text: definePhiMessageLabel("Nothing has been said here yet."),
    subject_fallback: "Conversation",
    older_label: "Show earlier messages",
    archived_label: "Archived",
    /* The action in the conversation's heading that opens a reply. */
    reply_label: "Reply",
    /* Before the names of who is in it, beneath a heading that is the subject. */
    participants_label: "In this conversation",
    /*
     * Said on the note itself rather than in a legend somewhere.
     *
     * Staff write internal notes in the same place they write to the requester, and the one thing that
     * must never be in doubt is which of the two a message is. A marker on the message is the only
     * place a person actually looks while writing the next one.
     */
    internal_label: "Internal note",
    /*
     * One word for the control, because there is one control.
     *
     * The target language is not asked for: it is the language this person is reading in, and the button
     * only appears where that language can actually be produced. A picker beside every message would have
     * been a second control on every row for the sake of reading one message in a third language.
     */
    translate_label: "Translate",
    original_label: "Show the original",
    /*
     * Said on the translation, because an unmarked one reads as what the person wrote.
     *
     * A machine translation carries a register nobody chose, and a support agent answering a sentence a
     * machine put there has to know that is what they are looking at. The language it came out of stands
     * beside it as its own name, where the provider reported one -- not woven into a sentence, which would
     * fix a word order that only holds in English.
     */
    machine_translation_label: "Machine translation",
    translation_error_text: definePhiMessageLabel("The translation could not be fetched."),
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
 * The reply, as a declared Form. Its upload refusals are here for the reason the Form's own wording is:
 * a file that was too large says so in the reader's language, and the shared English default in
 * `upload-form-control.tsx` is what a Form without a label set falls back to, not what this one shows.
 */
const PHI_THREAD_REPLY_FORM_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_CORE_RUNTIME_MODULE_IDENTITY, {
  key: "form:thread-reply",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    reply_label: "Your message",
    reply_placeholder: definePhiMessageLabel("Write a message"),
    reply_required: definePhiMessageLabel("Write something before you send it."),
    reply_thread_required: definePhiMessageLabel("Choose a conversation first."),
    /*
     * Who reads it, where the placement offers the choice. Said as who it reaches rather than as a
     * setting, because that is the question the writer is answering.
     */
    audience_everyone: "To everyone in it",
    audience_internal: "Internal note",
    reply_attach_label: "Attach a file",
    reply_attach_drop_hint: "or drop it here",
    reply_send_label: "Send",
    reply_attach_too_many: definePhiMessageLabel("No more files fit here."),
    reply_attach_pending: definePhiMessageLabel("Wait until the file has arrived, then send."),
    reply_error_generic: definePhiMessageLabel("The file could not be attached."),
    reply_error_network: definePhiMessageLabel("The site could not be reached."),
    reply_error_too_large: definePhiMessageLabel("That file is too large."),
    reply_error_duplicate: definePhiMessageLabel("That file is already attached."),
    reply_error_type_not_allowed: definePhiMessageLabel("That kind of file cannot be attached."),
    reply_error_quota_exceeded: definePhiMessageLabel("There is no room left in your space."),
    reply_error_space_unavailable: definePhiMessageLabel("Files cannot be attached on this site."),
    reply_error_storage_unreachable: definePhiMessageLabel("The file storage could not be reached."),
  },
});

export async function getPhiThreadReplyFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_THREAD_REPLY_FORM_LABEL_SET);
  return {
    replyLabel: labels.reply_label,
    replyPlaceholder: labels.reply_placeholder,
    replyRequired: labels.reply_required,
    replyThreadRequired: labels.reply_thread_required,
    audienceEveryone: labels.audience_everyone,
    audienceInternal: labels.audience_internal,
    replyAttachLabel: labels.reply_attach_label,
    replyAttachDropHint: labels.reply_attach_drop_hint,
    replySendLabel: labels.reply_send_label,
    replyAttachTooMany: labels.reply_attach_too_many,
    replyAttachPending: labels.reply_attach_pending,
    replyErrorGeneric: labels.reply_error_generic,
    replyErrorNetwork: labels.reply_error_network,
    replyErrorTooLarge: labels.reply_error_too_large,
    replyErrorDuplicate: labels.reply_error_duplicate,
    replyErrorTypeNotAllowed: labels.reply_error_type_not_allowed,
    replyErrorQuotaExceeded: labels.reply_error_quota_exceeded,
    replyErrorSpaceUnavailable: labels.reply_error_space_unavailable,
    replyErrorStorageUnreachable: labels.reply_error_storage_unreachable,
  };
}

export async function getPhiThreadConversationLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_THREAD_CONVERSATION_LABEL_SET);
  return {
    noThreadText: labels.no_thread_text,
    loadingText: labels.loading_text,
    emptyText: labels.empty_text,
    subjectFallback: labels.subject_fallback,
    olderLabel: labels.older_label,
    archivedLabel: labels.archived_label,
    replyLabel: labels.reply_label,
    participantsLabel: labels.participants_label,
    internalLabel: labels.internal_label,
    translateLabel: labels.translate_label,
    originalLabel: labels.original_label,
    machineTranslationLabel: labels.machine_translation_label,
    redactedText: labels.redacted_text,
    withheldText: labels.withheld_text,
    systemAuthorLabel: labels.system_author_label,
    unnamedAuthorLabel: labels.unnamed_author_label,
    feedback: {
      errorTitle: labels.error_title,
      errorGeneric: labels.error_generic,
      errorNetwork: labels.error_network,
      errorNotFound: labels.error_not_found,
      errorTranslation: labels.translation_error_text,
    },
  };
}

export type PhiThreadConversationLabels =
  Awaited<ReturnType<typeof getPhiThreadConversationLabels>>;
