import { createPhiFormLabelSetLoader } from "../../../components/forms/shared-form-loaders";
import type {
  PhiFormDescriptor,
  PhiFormHandlerProviderDescriptor,
} from "../../../types";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_UPLOAD_LABEL_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { PhisThreadKind } from "../../../constants/threads";
import { PHI_THREADS_USER_SPACE_MEDIA_KINDS } from "./media-spaces";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS, PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_THREADS_FORM_IDS = {
  newConversation: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "threads/new-conversation"),
  message: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "threads/message"),
} as const;

export const PHI_THREADS_FORM_HANDLER_KEYS = {
  newConversation: "site.threads.create",
  message: "site.threads.message",
} as const;

const LABEL_SET_KEY = "@phis/ui/modules/threads/labels/forms" as const;
const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);

/**
 * Opening a conversation, as a declared Form rather than as a panel.
 *
 * What replaced a hand-written panel is four field descriptors, and everything the panel had to do for
 * itself -- ask who is reachable, validate, submit, report a failure, say what it is doing while it
 * waits -- is now somebody else's declared job. The wording is in a label set, so it is translated;
 * the panel's was in a client component, where no translator could reach it.
 *
 * `kind` is hidden and fixed. This Module brings `Direct` and says so in its definition: a conversation
 * inside a group is the groups Module's, and Support's is Support's, because each of those is a Site
 * deciding to run that thing. A kind offered here that the Site never materialized would be a choice
 * whose only outcome is a refusal from Core.
 *
 * The values go to the route as they stand, which is why nothing converts them: the Core route reads
 * `kind` and the participant ids through the same normalizer whether they arrive as numbers or as the
 * strings a Select holds.
 */
const PHI_THREADS_NEW_CONVERSATION_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_THREADS_FORM_IDS.newConversation,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    {
      key: "kind",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden,
      initialValue: String(PhisThreadKind.Direct),
    },
    {
      key: "participantUserIds",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
      label: label("people", "People"),
      placeholder: label("peoplePlaceholder", "Who is this with?"),
      description: label("peopleHint", "Everyone you name can read the whole conversation."),
      optionsProvider: { providerKey: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.candidates },
      validation: [{
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
        message: label("peopleRequired", "Choose at least one person."),
      }],
    },
    /*
     * Required here, although the column is nullable.
     *
     * The subject is the name of the whole chain: it is the row in an inbox, the heading above the
     * messages, and what a notification is called. A conversation opened without one is named after
     * whoever is in it for the rest of its life, which reads as a list of people rather than as a
     * subject -- and the person who could have said what it is about in four words is the one opening it.
     *
     * The column stays nullable because an integration cannot be held to this. A mail arrives with an
     * empty `Subject` header and is still a conversation; refusing it in the database would lose the
     * message to protect a heading.
     */
    {
      key: "subject",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("subject", "Subject"),
      placeholder: label("subjectPlaceholder", "What is it about?"),
      validation: [{
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
        message: label("subjectRequired", "Give the conversation a subject."),
      }],
    },
    {
      key: "message",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.textarea,
      label: label("message", "Message"),
      placeholder: label("messagePlaceholder", "Write the first message"),
      config: { rows: 4 },
      validation: [{
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
        message: label("messageRequired", "A conversation starts with a message."),
      }],
    },
  ],
  layout: {
    gap: { compact: "sm", medium: "base" },
  },
};

const loadLabels = createPhiFormLabelSetLoader(
  () => import("./labels").then((module) => module.getPhiThreadFormLabels),
  (labels) => ({
    people: labels.peopleLabel,
    peoplePlaceholder: labels.peoplePlaceholder,
    peopleHint: labels.peopleHint,
    peopleRequired: labels.peopleRequired,
    subject: labels.subjectLabel,
    subjectPlaceholder: labels.subjectPlaceholder,
    subjectRequired: labels.subjectRequired,
    message: labels.messageLabel,
    messagePlaceholder: labels.messagePlaceholder,
    messageRequired: labels.messageRequired,
    reply: labels.replyLabel,
    replyPlaceholder: labels.replyPlaceholder,
    replyRequired: labels.replyRequired,
    replyThreadRequired: labels.replyThreadRequired,
    replyAttach: labels.replyAttachLabel,
    replySend: labels.replySendLabel,
    /*
     * The upload field's own keys, which the descriptor cannot name.
     *
     * A label a field asks for by name arrives resolved because the descriptor names it. The wording of a
     * refusal that has not happened yet cannot be named there, so the upload Control reads these by key
     * (`PHI_FORM_UPLOAD_LABEL_KEYS`) -- both Forms in this set share one loader, so they arrive whether
     * the placed Form has an upload field or not.
     */
    [PHI_FORM_UPLOAD_LABEL_KEYS.tooMany]: labels.replyAttachTooMany,
    [PHI_FORM_UPLOAD_LABEL_KEYS.pending]: labels.replyAttachPending,
    [PHI_FORM_UPLOAD_LABEL_KEYS.errorGeneric]: labels.replyErrorGeneric,
    [PHI_FORM_UPLOAD_LABEL_KEYS.errorNetwork]: labels.replyErrorNetwork,
    [PHI_FORM_UPLOAD_LABEL_KEYS.errorTooLarge]: labels.replyErrorTooLarge,
    [PHI_FORM_UPLOAD_LABEL_KEYS.errorDuplicate]: labels.replyErrorDuplicate,
    [PHI_FORM_UPLOAD_LABEL_KEYS.errorTypeNotAllowed]: labels.replyErrorTypeNotAllowed,
    [PHI_FORM_UPLOAD_LABEL_KEYS.errorQuotaExceeded]: labels.replyErrorQuotaExceeded,
    [PHI_FORM_UPLOAD_LABEL_KEYS.errorSpaceUnavailable]: labels.replyErrorSpaceUnavailable,
    [PHI_FORM_UPLOAD_LABEL_KEYS.errorStorageUnreachable]: labels.replyErrorStorageUnreachable,
  }),
);

/**
 * Writing into the conversation that is open, as a declared Form.
 *
 * The composer that stood here was a client component with its own text state, its own upload session and
 * its own `fetch` -- it worked, and it sat outside every Form contract while it did. There is nothing in
 * it a descriptor cannot say: a message is a textarea, an attachment is the upload field, and which
 * conversation it goes to is a value like any other.
 *
 * `threadId` is hidden and arrives at runtime. Nobody types it and no record read produces it: the
 * conversation is whatever the listing beside this Form has selected, and the Conversations Controller
 * sends it into this field -- the route names the field, and this descriptor says nothing about the route
 * ([SIGNALS.md](../../../SIGNALS.md), "Capabilities and routes"). It is `required` as a guard, not as the
 * empty state: the placement keeps the Form out of sight until a conversation is chosen, so the only way
 * to reach that message is a Site that wired the Form without wiring the field.
 *
 * The attachment field narrows nothing the Site has not narrowed already. `kinds` repeats the Module's own
 * declaration for the viewer's Space, so the file dialog and the answer from the control plane cannot
 * drift apart, and `space: "user"` is the only place on a Site a person may write -- custody follows the
 * uploader.
 */
const PHI_THREADS_MESSAGE_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_THREADS_FORM_IDS.message,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    {
      key: "threadId",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden,
      validation: [{
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
        message: label("replyThreadRequired", "Choose a conversation first."),
      }],
    },
    {
      key: "message",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.textarea,
      label: label("reply", "Your message"),
      placeholder: label("replyPlaceholder", "Write a message"),
      config: { rows: 3 },
      validation: [{
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
        message: label("replyRequired", "Write something before you send it."),
      }],
    },
    {
      key: "assetIds",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.upload,
      placeholder: label("replyAttach", "Attach a file"),
      config: { kinds: [...PHI_THREADS_USER_SPACE_MEDIA_KINDS], space: "user" },
    },
  ],
  layout: { gap: { compact: "sm", medium: "base" } },
  // At the end of the row, where a composer's send stands; drawn only where the placement says inline.
  submit: { label: label("replySend", "Send"), align: "end" },
};

export const PHI_THREADS_RUNTIME_MODULE_FORMS = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    areas: ["app"],
    formId: PHI_THREADS_FORM_IDS.newConversation,
    version: 1,
    flags: 0,
    title: "New conversation",
    description: "Name who it is with, what it is about, and what there is to say.",
    category: "forms",
    tags: ["threads", "create"],
    descriptor: PHI_THREADS_NEW_CONVERSATION_FORM_DESCRIPTOR,
    submitHandlerKey: PHI_THREADS_FORM_HANDLER_KEYS.newConversation,
    loadLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    areas: ["app"],
    formId: PHI_THREADS_FORM_IDS.message,
    version: 1,
    flags: 0,
    title: "Reply",
    description: "Writes a message into the open conversation, with whatever hangs on it.",
    category: "forms",
    tags: ["threads", "message"],
    descriptor: PHI_THREADS_MESSAGE_FORM_DESCRIPTOR,
    submitHandlerKey: PHI_THREADS_FORM_HANDLER_KEYS.message,
    loadLabels,
  }),
] as const;

export const PHI_THREADS_FORM_HANDLER_PROVIDER_DESCRIPTORS = [
  {
    key: createPhiSharedFormProviderKey("handler", "threads-new-conversation"),
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    title: "Open a conversation",
    phase: "submit",
    handlerKey: PHI_THREADS_FORM_HANDLER_KEYS.newConversation,
    category: "site",
    transport: "relay",
    method: "POST",
    endpointKey: null,
    // The Site-session address for conversations; who may open one, and with whom, is settled there.
    upstreamPath: "/api/site/threads",
    csrfPath: null,
    requiresCsrf: false,
    credentialPolicy: "site-session",
  },
  /*
   * The conversation travels in the values, not in the path.
   *
   * A relay handler declares one static upstream path, and that is the right shape rather than a
   * limitation: a Form submits values, and which record it acts on is one of them -- the Users edit Form
   * carries its `userId` exactly so. The Core answers this at `/api/site/threads/messages` and reads the
   * id from the body; the REST route with the id in its path stays where it is, for the packages that
   * call it directly.
   */
  {
    key: createPhiSharedFormProviderKey("handler", "threads-message"),
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    title: "Write into a conversation",
    phase: "submit",
    handlerKey: PHI_THREADS_FORM_HANDLER_KEYS.message,
    category: "site",
    transport: "relay",
    method: "POST",
    endpointKey: null,
    upstreamPath: "/api/site/threads/messages",
    csrfPath: null,
    requiresCsrf: false,
    credentialPolicy: "site-session",
  },
] satisfies readonly PhiFormHandlerProviderDescriptor[];
