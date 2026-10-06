import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import { PHI_THREADS_RUNTIME_MODULE_IDENTITY } from "./ids";

const PHI_THREAD_CONVERSATION_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_THREADS_RUNTIME_MODULE_IDENTITY, {
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
 * What the Page around the three surfaces says.
 *
 * Its own set rather than a corner of the conversation's: this is the Page's title in a navigation
 * menu and in a browser tab, and a Site that renames the Page renames one thing.
 */
const PHI_THREAD_PAGE_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_THREADS_RUNTIME_MODULE_IDENTITY, {
  key: "page:threads",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Conversations",
    description: definePhiMessageLabel("Everything you are part of, and where to answer it."),
    inbox_title: "Conversations",
    inbox_empty: definePhiMessageLabel("Nothing yet. Start one."),
    inbox_empty_hint: definePhiMessageLabel("Conversations you are part of appear here."),
    new_conversation_label: "New conversation",
    open_conversation_label: "Open conversation",
    cancel_label: "Cancel",
    composer_label: "Your answer",
    /*
     * The reply's button and the sentence that stands where the reply would be.
     *
     * Both belong to the Page rather than to the Form's own set: whether a reply is offered at all, what
     * its button says and what stands there while nothing is chosen are decisions of this arrangement,
     * and a Site that places the same Form elsewhere makes them again.
     */
    composer_no_thread_text: definePhiMessageLabel("Choose a conversation to write in."),
    /*
     * The listing is a Table, so what used to be a renderer's vocabulary is now column headings and
     * the names a badge draws. They are here rather than in the Provider for the reason every visible
     * word is: the Provider answers in numbers and runs in a browser, and a Site reads its own
     * language.
     */
    column_subject: "Subject",
    column_kind: "Kind",
    column_state: "State",
    column_activity: "Last activity",
    state_unread: "New",
    state_open: "Open",
    state_archived: "Archived",
    kind_direct: "Direct",
    kind_group: "Group",
    kind_cross_group: "Between groups",
    kind_support: "Support",
    filter_unread_label: "Unread only",
    filter_status_label: "Status",
    filter_status_open: "Open",
    filter_status_archived: "Archived",
    archive_label: "Archive",
    reopen_label: "Reopen",
    /*
     * Archiving asks first because it reaches other people: one row carries the status, so the
     * conversation closes for everyone in it. Reopening asks nothing, because it is the way back.
     */
    archive_confirm_title: "Archive this conversation?",
    archive_confirm_text: definePhiMessageLabel(
      "It closes for everyone in it. Anyone can reopen it later.",
    ),
    archive_confirm_ok: "Archive",
    confirm_cancel: "Cancel",
  },
});

export async function getPhiThreadPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_THREAD_PAGE_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    inboxTitle: labels.inbox_title,
    inboxEmpty: labels.inbox_empty,
    inboxEmptyHint: labels.inbox_empty_hint,
    newConversationLabel: labels.new_conversation_label,
    openConversationLabel: labels.open_conversation_label,
    cancelLabel: labels.cancel_label,
    composerLabel: labels.composer_label,
    composerNoThreadText: labels.composer_no_thread_text,
    columns: {
      subject: labels.column_subject,
      kind: labels.column_kind,
      state: labels.column_state,
      activity: labels.column_activity,
    },
    states: {
      unread: labels.state_unread,
      open: labels.state_open,
      archived: labels.state_archived,
    },
    kinds: {
      direct: labels.kind_direct,
      group: labels.kind_group,
      crossGroup: labels.kind_cross_group,
      support: labels.kind_support,
    },
    filters: {
      unreadLabel: labels.filter_unread_label,
      statusLabel: labels.filter_status_label,
      statusOpen: labels.filter_status_open,
      statusArchived: labels.filter_status_archived,
    },
    actions: {
      archive: labels.archive_label,
      reopen: labels.reopen_label,
      archiveConfirmTitle: labels.archive_confirm_title,
      archiveConfirmText: labels.archive_confirm_text,
      archiveConfirmOk: labels.archive_confirm_ok,
      confirmCancel: labels.confirm_cancel,
    },
  };
}

/**
 * What the form that opens a conversation says.
 *
 * Its own set because a Form descriptor names one, and because these words belong to the form wherever
 * it is placed -- the Page's set is about the Page. Everything a person reads while writing the first
 * message is here, which is also what makes it translatable: the old panel carried its English inside
 * a client component, where no translator could reach it.
 */
const PHI_THREAD_FORM_LABEL_SET = definePhiRuntimeModuleLabelSet(PHI_THREADS_RUNTIME_MODULE_IDENTITY, {
  key: "@phis/ui/modules/threads/labels/forms",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    people_label: "People",
    people_placeholder: definePhiMessageLabel("Who is this with?"),
    people_hint: definePhiMessageLabel("Everyone you name can read the whole conversation."),
    people_required: definePhiMessageLabel("Choose at least one person."),
    subject_label: "Subject",
    subject_placeholder: definePhiMessageLabel("What is it about?"),
    /*
     * Asked for, although the column may be null.
     *
     * The subject names the whole chain -- the inbox row, the heading, what a notification is called --
     * and a conversation without one is named after whoever is in it instead. An integration relaying a
     * mail with an empty subject header cannot be held to this, which is why the database still allows
     * none; a person opening one here can be.
     */
    subject_required: definePhiMessageLabel("Give the conversation a subject."),
    message_label: "Message",
    message_placeholder: definePhiMessageLabel("Write the first message"),
    message_required: definePhiMessageLabel("A conversation starts with a message."),
    /*
     * The reply, in the same set as the conversation it opens.
     *
     * Two Forms, one vocabulary: a Site that translates "message" once should not meet it twice under
     * different keys. The refusals an upload can produce are here for the same reason the Form's own
     * are -- a file that was too large says so in the reader's language, and the shared English default
     * in `upload-form-control.tsx` is what a Form without a label set falls back to, not what this one
     * should show.
     */
    reply_label: "Your message",
    reply_placeholder: definePhiMessageLabel("Write a message"),
    reply_required: definePhiMessageLabel("Write something before you send it."),
    reply_thread_required: definePhiMessageLabel("Choose a conversation first."),
    reply_attach_label: "Attach a file",
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

export async function getPhiThreadFormLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_THREAD_FORM_LABEL_SET);
  return {
    peopleLabel: labels.people_label,
    peoplePlaceholder: labels.people_placeholder,
    peopleHint: labels.people_hint,
    peopleRequired: labels.people_required,
    subjectLabel: labels.subject_label,
    subjectPlaceholder: labels.subject_placeholder,
    subjectRequired: labels.subject_required,
    messageLabel: labels.message_label,
    messagePlaceholder: labels.message_placeholder,
    messageRequired: labels.message_required,
    replyLabel: labels.reply_label,
    replyPlaceholder: labels.reply_placeholder,
    replyRequired: labels.reply_required,
    replyThreadRequired: labels.reply_thread_required,
    replyAttachLabel: labels.reply_attach_label,
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
