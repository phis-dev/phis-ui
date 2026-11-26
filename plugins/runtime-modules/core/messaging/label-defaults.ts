/*
 * The words of a conversation reader in their source language, where the browser can read them.
 *
 * The Label Set in `labels.ts` is built from these, so each sentence is written once; the server
 * translates the set for the live Widget, and the Builder canvas, which shows every text in its source
 * language, reads them here.
 */

export type PhiThreadConversationLabels = {
  noThreadText: string;
  loadingText: string;
  emptyText: string;
  subjectFallback: string;
  olderLabel: string;
  archivedLabel: string;
  lockedLabel: string;
  lockedText: string;
  replyLabel: string;
  participantsLabel: string;
  internalLabel: string;
  translateLabel: string;
  originalLabel: string;
  machineTranslationLabel: string;
  redactedText: string;
  withheldText: string;
  systemAuthorLabel: string;
  unnamedAuthorLabel: string;
  feedback: {
    errorTitle: string;
    errorGeneric: string;
    errorNetwork: string;
    errorNotFound: string;
    errorTranslation: string;
  };
  /**
   * The made-up conversation the Builder canvas draws in place of one it may not read: who wrote, what
   * they wrote and what hung on it. Never shown on a live Page.
   */
  sample: {
    /** On the heading, so nobody takes the sample for somebody's conversation. */
    tag: string;
    subject: string;
    memberName: string;
    staffName: string;
    /** A conversation: the member asks, staff note it internally and answer with an attachment. */
    question: string;
    note: string;
    answer: string;
    answerAttachment: string;
    /** A file (a placement that names its conversation): staff's notes, one with an attachment. */
    fileCall: string;
    fileAddress: string;
    fileContract: string;
    fileAttachment: string;
  };
};

export const PHI_THREAD_CONVERSATION_DEFAULT_LABELS: PhiThreadConversationLabels = {
  noThreadText: "Choose a conversation to read.",
  loadingText: "Loading the conversation.",
  emptyText: "Nothing has been said here yet.",
  subjectFallback: "Conversation",
  olderLabel: "Show earlier messages",
  archivedLabel: "Archived",
  lockedLabel: "Locked",
  lockedText: "This conversation is locked. Nobody can write in it until it is unlocked.",
  replyLabel: "Reply",
  participantsLabel: "In this conversation",
  internalLabel: "Internal note",
  translateLabel: "Translate",
  originalLabel: "Show the original",
  machineTranslationLabel: "Machine translation",
  redactedText: "This message was withdrawn.",
  withheldText: "This message is not shown to you.",
  systemAuthorLabel: "System",
  unnamedAuthorLabel: "Someone",
  feedback: {
    errorTitle: "That did not work",
    errorGeneric: "The conversation could not be loaded.",
    errorNetwork: "The site could not be reached.",
    errorNotFound: "This conversation is not there, or is not yours to read.",
    errorTranslation: "The translation could not be fetched.",
  },
  sample: {
    tag: "Sample",
    subject: "Missing manual",
    memberName: "Alex Example",
    staffName: "Robin Sample",
    question: "Hello, my order arrived without the manual. Could you send it to me?",
    note: "The whole batch shipped without manuals; the warehouse knows.",
    answer: "Thank you for telling us. The manual is attached, and a printed copy is on its way to you.",
    answerAttachment: "manual.pdf",
    fileCall: "Called about the open invoice. Payment follows by the end of the month.",
    fileAddress: "A parcel came back undelivered; the delivery address is corrected.",
    fileContract: "Signed contract received and filed.",
    fileAttachment: "contract.pdf",
  },
};
