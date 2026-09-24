import type {
  PhiFormDescriptor,
  PhiFormHandlerProviderDescriptor,
} from "../../../types";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { flattenPhiFormLabels } from "../../../components/forms/form-labels";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { PhisThreadKind } from "../../../constants/threads";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../core/ids";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS, PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";

export const PHI_THREADS_FORM_IDS = {
  newConversation: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "threads/new-conversation"),
} as const;

export const PHI_THREADS_FORM_HANDLER_KEYS = {
  newConversation: "site.threads.create",
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
    {
      key: "subject",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("subject", "Subject"),
      placeholder: label("subjectPlaceholder", "What is it about? (optional)"),
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
    /*
     * What the opening message is written in, declared rather than guessed.
     *
     * The options are not in this descriptor, for the reason the profile language field's are not: a
     * registered Form is the same on every Site and the languages are not, so the placement hands them
     * over and the Core options provider reads them back during the render. The preselection travels
     * the same way -- the writer's own setting, falling back to the Site default -- because only the
     * Page knows either.
     *
     * Required, and it can be: the placement always preselects, so the rule can only fail where a
     * person cleared the field on purpose. What it buys is that the field cannot be silently empty on
     * a placement that forgot to hand the languages over.
     */
    {
      key: "messageSourceLang",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("language", "Language"),
      description: label(
        "languageHint",
        "The language you are writing in, so it can be offered for translation.",
      ),
      optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteLocales },
      validation: [{
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
        message: label("languageRequired", "Choose the language you are writing in."),
      }],
    },
  ],
  layout: {
    gap: { compact: "sm", medium: "base" },
  },
};

async function loadLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiThreadFormLabels } = await import("../../../components/widgets/label-sets/threads");
  const credentials = readPhiServerApiCredentials();
  const labels = await getPhiThreadFormLabels({
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    people: labels.peopleLabel,
    peoplePlaceholder: labels.peoplePlaceholder,
    peopleHint: labels.peopleHint,
    peopleRequired: labels.peopleRequired,
    subject: labels.subjectLabel,
    subjectPlaceholder: labels.subjectPlaceholder,
    message: labels.messageLabel,
    messagePlaceholder: labels.messagePlaceholder,
    messageRequired: labels.messageRequired,
    language: labels.languageLabel,
    languageHint: labels.languageHint,
    languageRequired: labels.languageRequired,
  });
}

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
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
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
] satisfies readonly PhiFormHandlerProviderDescriptor[];
