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
    inbox_empty_hint: definePhiMessageLabel("Conversations you are part of appear here."),
    new_conversation_label: "New conversation",
    open_conversation_label: "Open conversation",
    cancel_label: "Cancel",
    composer_label: "Your answer",
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

export type PhiThreadPageLabels = Awaited<ReturnType<typeof getPhiThreadPageLabels>>;

/**
 * What the form that opens a conversation says.
 *
 * Its own set because a Form descriptor names one, and because these words belong to the form wherever
 * it is placed -- the Page's set is about the Page. Everything a person reads while writing the first
 * message is here, which is also what makes it translatable: the old panel carried its English inside
 * a client component, where no translator could reach it.
 */
const PHI_THREAD_FORM_LABEL_SET = definePhiLabelSet({
  key: "@phis/ui/modules/threads/labels/forms",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    people_label: "People",
    people_placeholder: definePhiMessageLabel("Who is this with?"),
    people_hint: definePhiMessageLabel("Everyone you name can read the whole conversation."),
    people_required: definePhiMessageLabel("Choose at least one person."),
    subject_label: "Subject",
    subject_placeholder: definePhiMessageLabel("What is it about? (optional)"),
    message_label: "Message",
    message_placeholder: definePhiMessageLabel("Write the first message"),
    message_required: definePhiMessageLabel("A conversation starts with a message."),
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
    messageLabel: labels.message_label,
    messagePlaceholder: labels.message_placeholder,
    messageRequired: labels.message_required,
  };
}

export type PhiThreadFormLabels = Awaited<ReturnType<typeof getPhiThreadFormLabels>>;

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
