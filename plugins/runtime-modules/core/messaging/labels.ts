import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../../gateway/label-set";
import { PHI_CORE_RUNTIME_MODULE_IDENTITY } from "../ids";
import { PHI_THREAD_CONVERSATION_DEFAULT_LABELS, type PhiThreadConversationLabels } from "./label-defaults";

/*
 * What a conversation and the reply to it say, wherever they are placed.
 *
 * Core's, because messaging is: every Module that runs conversations of its own kind -- direct ones,
 * a group's, Support's, an add-on's -- places the same conversation and the same reply, and reads them
 * in the same words. A Module says what its own Page is called; it does not say "Reply" again.
 */

const D = PHI_THREAD_CONVERSATION_DEFAULT_LABELS;

const PHI_THREAD_CONVERSATION_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_CORE_RUNTIME_MODULE_IDENTITY, {
  key: "widget:thread-conversation",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    no_thread_text: definePhiMessageLabel(D.noThreadText),
    loading_text: definePhiMessageLabel(D.loadingText),
    empty_text: definePhiMessageLabel(D.emptyText),
    subject_fallback: D.subjectFallback,
    older_label: D.olderLabel,
    archived_label: D.archivedLabel,
    locked_label: D.lockedLabel,
    /*
     * Where the Reply would have been. A locked conversation takes no new message from anybody, so the
     * way to write one is not offered at all rather than offered and then refused.
     */
    locked_text: definePhiMessageLabel(D.lockedText),
    /* The action in the conversation's heading that opens a reply. */
    reply_label: D.replyLabel,
    /* Before the names of who is in it, beneath a heading that is the subject. */
    participants_label: D.participantsLabel,
    /*
     * Said on the note itself rather than in a legend somewhere.
     *
     * Staff write internal notes in the same place they write to the requester, and the one thing that
     * must never be in doubt is which of the two a message is. A marker on the message is the only
     * place a person actually looks while writing the next one.
     */
    internal_label: D.internalLabel,
    /*
     * One word for the control, because there is one control.
     *
     * The target language is not asked for: it is the language this person is reading in, and the button
     * only appears where that language can actually be produced. A picker beside every message would have
     * been a second control on every row for the sake of reading one message in a third language.
     */
    translate_label: D.translateLabel,
    original_label: D.originalLabel,
    /*
     * Said on the translation, because an unmarked one reads as what the person wrote.
     *
     * A machine translation carries a register nobody chose, and a support agent answering a sentence a
     * machine put there has to know that is what they are looking at. The language it came out of stands
     * beside it as its own name, where the provider reported one -- not woven into a sentence, which would
     * fix a word order that only holds in English.
     */
    machine_translation_label: D.machineTranslationLabel,
    translation_error_text: definePhiMessageLabel(D.feedback.errorTranslation),
    redacted_text: definePhiMessageLabel(D.redactedText),
    withheld_text: definePhiMessageLabel(D.withheldText),
    system_author_label: D.systemAuthorLabel,
    /* A projection carries a display name or nothing; nothing is still somebody. */
    unnamed_author_label: D.unnamedAuthorLabel,
    error_title: D.feedback.errorTitle,
    error_generic: definePhiMessageLabel(D.feedback.errorGeneric),
    error_network: definePhiMessageLabel(D.feedback.errorNetwork),
    error_not_found: definePhiMessageLabel(D.feedback.errorNotFound),
    // The Builder canvas's made-up conversation (`label-defaults.ts`, `sample`).
    sample_tag: D.sample.tag,
    sample_subject: D.sample.subject,
    sample_member_name: D.sample.memberName,
    sample_staff_name: D.sample.staffName,
    sample_question: definePhiMessageLabel(D.sample.question),
    sample_note: definePhiMessageLabel(D.sample.note),
    sample_answer: definePhiMessageLabel(D.sample.answer),
    sample_answer_attachment: D.sample.answerAttachment,
    sample_file_call: definePhiMessageLabel(D.sample.fileCall),
    sample_file_address: definePhiMessageLabel(D.sample.fileAddress),
    sample_file_contract: definePhiMessageLabel(D.sample.fileContract),
    sample_file_attachment: D.sample.fileAttachment,
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
    reply_send_label: "Send",
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
    replySendLabel: labels.reply_send_label,
  };
}

export async function getPhiThreadConversationLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiThreadConversationLabels> {
  const labels = await getPhiLabelSet(options, PHI_THREAD_CONVERSATION_LABEL_SET);
  return {
    noThreadText: labels.no_thread_text,
    loadingText: labels.loading_text,
    emptyText: labels.empty_text,
    subjectFallback: labels.subject_fallback,
    olderLabel: labels.older_label,
    archivedLabel: labels.archived_label,
    lockedLabel: labels.locked_label,
    lockedText: labels.locked_text,
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
    sample: {
      tag: labels.sample_tag,
      subject: labels.sample_subject,
      memberName: labels.sample_member_name,
      staffName: labels.sample_staff_name,
      question: labels.sample_question,
      note: labels.sample_note,
      answer: labels.sample_answer,
      answerAttachment: labels.sample_answer_attachment,
      fileCall: labels.sample_file_call,
      fileAddress: labels.sample_file_address,
      fileContract: labels.sample_file_contract,
      fileAttachment: labels.sample_file_attachment,
    },
  };
}
