import { createPhiFormLabelSetLoader } from "../../../../components/forms/shared-form-loaders";
import type { PhiFormDescriptor, PhiFormHandlerProviderDescriptor } from "../../../../types";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_UPLOAD_LABEL_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../../components/forms/form-provider-contract";
import { PHI_FORM_GRID_LAST_LINE } from "../../../../components/forms/form-descriptor-contract";
import { definePhiRuntimeModuleForm } from "../../../../components/forms/form-registry";
import { PHI_SHARED_FORM_IDS } from "../../../../components/forms/shared-form-ids";
import { PHI_CMS_AREA_KEYS } from "../../../../constants/cms-areas";
import { PhisThreadMessageFlag } from "../../../../constants/threads";
import { PHI_CORE_RUNTIME_MODULE_ID } from "../ids";

/*
 * Answering a conversation, as Core's Form, for every Module that runs conversations.
 *
 * A Module brings a kind of conversation -- direct ones, a group's, Support's, an add-on's -- and places
 * this Form for writing into one. It is meant for a dialog opened by the conversation's own Reply
 * action: that action names the thread as its row, and the Form reads it from there (`recordOpen` with
 * the thread inbox as its `source`), so nothing has to carry the thread into a hidden field beside it.
 *
 * What a placement decides is whether it offers an internal note. `internalAllowed` is a hidden field
 * the placement fills through `formConfig.initialValues`; the choice of audience is shown only where it
 * is set. Core writes `Internal` for Staff alone whatever arrives, so a placement that offers it to
 * somebody who may not write one offers a choice that changes nothing -- the setting says where the
 * question makes sense, not who may answer it.
 */

const LABEL_SET_KEY = "@phis/ui/modules/core/labels/form:thread-reply" as const;
const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);
const FULL_ROW = { start: 1, end: PHI_FORM_GRID_LAST_LINE };
const FULL_WIDTH = { compact: FULL_ROW, medium: FULL_ROW, wide: FULL_ROW };

const PHI_THREAD_REPLY_FORM_HANDLER_KEY = "site.threads.reply" as const;

/** The user Space a reply's files go into: the writer's own, which is the only place a person may write. */
const PHI_THREAD_REPLY_SPACE = "user";

const PHI_THREAD_REPLY_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_SHARED_FORM_IDS.threadReply,
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
    // Set by the placement where it offers a note only the people working the conversation read.
    { key: "internalAllowed", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
    /*
     * The message's flags as Core spells them, relayed as they are: `0` for everyone in it,
     * `PhisThreadMessageFlag.Internal` for the note. It starts on everyone after every send, so a note is
     * a choice made for that note.
     */
    {
      key: "messageFlags",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.segmented,
      initialValue: "0",
      options: [
        { value: "0", label: label("audienceEveryone", "To everyone in it") },
        { value: String(PhisThreadMessageFlag.Internal), label: label("audienceInternal", "Internal note") },
      ],
      visibleWhen: { source: "form", valuePath: "internalAllowed", operator: "truthy" },
    },
    {
      key: "message",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.textarea,
      label: label("reply", "Your message"),
      placeholder: label("replyPlaceholder", "Write a message"),
      config: { rows: 4 },
      validation: [{
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
        message: label("replyRequired", "Write something before you send it."),
      }],
    },
    /*
     * The attachment narrows nothing the Site has not narrowed already: the kinds are what the writer's
     * own Space accepts, which the control plane answers for. An area rather than a button, because a
     * file is part of what a reply says.
     */
    {
      key: "assetIds",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.upload,
      placeholder: label("replyAttach", "Attach a file"),
      config: { space: PHI_THREAD_REPLY_SPACE, presentation: "area" },
    },
  ],
  // One column: a reply is written across the width of the dialog, its label above it.
  layout: { gap: { compact: "sm", medium: "base" }, label: FULL_WIDTH, control: FULL_WIDTH },
  submit: { label: label("replySend", "Send"), align: "end" },
};

const loadLabels = createPhiFormLabelSetLoader(
  () => import("./labels").then((module) => module.getPhiThreadReplyFormLabels),
  (labels) => ({
    reply: labels.replyLabel,
    replyPlaceholder: labels.replyPlaceholder,
    replyRequired: labels.replyRequired,
    replyThreadRequired: labels.replyThreadRequired,
    audienceEveryone: labels.audienceEveryone,
    audienceInternal: labels.audienceInternal,
    replyAttach: labels.replyAttachLabel,
    replySend: labels.replySendLabel,
    [PHI_FORM_UPLOAD_LABEL_KEYS.dropHint]: labels.replyAttachDropHint,
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

// Every Area: a conversation may be placed wherever a Site runs one.
export const PHI_CORE_MESSAGING_FORMS = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    areas: PHI_CMS_AREA_KEYS,
    formId: PHI_SHARED_FORM_IDS.threadReply,
    version: 1,
    flags: 0,
    title: "Reply",
    description: "Writes a message into a conversation, with whatever hangs on it.",
    category: "forms",
    tags: ["threads", "message"],
    descriptor: PHI_THREAD_REPLY_FORM_DESCRIPTOR,
    submitHandlerKey: PHI_THREAD_REPLY_FORM_HANDLER_KEY,
    loadLabels,
  }),
] as const;

/*
 * The conversation travels in the values, not in the path: a relay handler declares one static upstream
 * path, and Core answers this at `/api/site/threads/messages`, reading the thread from the body.
 */
export const PHI_CORE_MESSAGING_FORM_HANDLER_DESCRIPTORS = [
  {
    key: createPhiSharedFormProviderKey("handler", "thread-reply"),
    ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
    title: "Write into a conversation",
    phase: "submit",
    handlerKey: PHI_THREAD_REPLY_FORM_HANDLER_KEY,
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
