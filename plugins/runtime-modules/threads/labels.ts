import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiRuntimeModuleLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import { PHI_THREADS_RUNTIME_MODULE_IDENTITY } from "./ids";

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
    inbox_footer: definePhiMessageLabel("%1 conversations · %2 unread"),
    new_conversation_label: "New conversation",
    open_conversation_label: "Open conversation",
    cancel_label: "Cancel",
    /*
     * The reply dialog's title and its button. The Page's rather than the Form's: the Form is Core's and
     * placed by every Module, and what its dialog is called is this arrangement's to say.
     */
    composer_label: "Reply",
    reply_send_label: "Send",
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
    inboxFooter: labels.inbox_footer,
    newConversationLabel: labels.new_conversation_label,
    openConversationLabel: labels.open_conversation_label,
    cancelLabel: labels.cancel_label,
    composerLabel: labels.composer_label,
    replySendLabel: labels.reply_send_label,
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
  };
}
