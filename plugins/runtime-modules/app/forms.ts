import type {
  PhiFormDescriptor,
  PhiFormHandlerProviderDescriptor,
} from "../../../types";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { flattenPhiFormLabels } from "../../../components/forms/form-labels";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
import { PHI_APP_RUNTIME_MODULE_ID } from "./ids";

/**
 * What a signed-in person can settle about their own account, as Forms rather than as Widgets.
 *
 * Every field here used to be a Widget that built a descriptor in place, drew its own Save button and
 * reached the server with a hand-written `fetch`, CSRF request and all -- five times over, each with
 * its own idea of what an error looks like. SETTINGS.md section 6 rules that out for anything inside
 * the Settings container: a section is a registered Form descriptor, submitted through a handler
 * Provider by the Site Form gateway, which is where credentials and CSRF are already handled once.
 *
 * The labels are the ones those Widgets already had. Their wording was translated and reviewed; only
 * the thing that renders them changes.
 */
export const PHI_APP_FORM_IDS = {
  profileName: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "app/profile-name"),
  profileNewsletter: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "app/profile-newsletter"),
} as const;

export const PHI_APP_FORM_HANDLER_KEYS = {
  profileName: "site.app.profile-name",
  profileNewsletter: "site.app.profile-newsletter",
} as const;

const NAME_LABEL_SET_KEY = "@phis/ui/modules/app/labels/profile-name" as const;
const NEWSLETTER_LABEL_SET_KEY = "@phis/ui/modules/app/labels/profile-newsletter" as const;

const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);

const nameDescriptor: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_APP_FORM_IDS.profileName,
  labelSetKey: NAME_LABEL_SET_KEY,
  fields: [
    {
      key: "firstName",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("firstName", "First name"),
      autoComplete: "given-name",
    },
    {
      key: "lastName",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("lastName", "Last name"),
      autoComplete: "family-name",
    },
    {
      key: "companyName",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("companyName", "Company"),
      autoComplete: "organization",
    },
  ],
  /*
   * The fields keep what was just saved: they show what the account now says, not an empty form
   * waiting for another name. `reset` would also put the values back and, in a panel that submits on
   * change, would be a change of its own.
   */
  success: {
    title: label("successTitle", "Name updated"),
    text: label("successText", "Your profile details have been saved."),
  },
  layout: { gap: { compact: "sm", medium: "base" } },
};

/**
 * One switch, and therefore no Save button: the Preset routes the Form's own `stateChange` back to
 * its `submit` channel, so flipping it is the submit. A panel holding more than one field states a
 * Save instead -- two fields changed one at a time would otherwise be two writes and one of them a
 * half-finished thought.
 *
 * It says nothing on success for the same reason. A switch that stays where it was put has already
 * told the person it worked; an alert under it would be a second answer to a question nobody asked.
 */
const newsletterDescriptor: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_APP_FORM_IDS.profileNewsletter,
  labelSetKey: NEWSLETTER_LABEL_SET_KEY,
  fields: [
    {
      key: "newsletterOptIn",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.switch,
      controlLabel: label("newsletter", "Newsletter"),
      description: label("newsletterDescription", "Receive product and platform updates for this site."),
    },
  ],
  layout: { gap: { compact: "sm", medium: "base" } },
};

async function loadNameLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiProfileNameWidgetLabels } = await import("../../../components/widgets/label-sets/profile");
  const labels = await getPhiProfileNameWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    firstName: labels.fields.firstName,
    lastName: labels.fields.lastName,
    companyName: labels.fields.companyName,
    successTitle: labels.feedback.successTitle,
    successText: labels.feedback.successText,
    save: labels.submitLabel,
    saving: labels.submitLabel,
  });
}

async function loadNewsletterLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiProfileOverviewWidgetLabels } = await import("../../../components/widgets/label-sets/profile");
  const labels = await getPhiProfileOverviewWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    newsletter: labels.newsletterLabel,
    newsletterDescription: labels.newsletterDescription,
  });
}

export const PHI_APP_RUNTIME_MODULE_FORMS = [
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    areas: ["app"],
    formId: PHI_APP_FORM_IDS.profileName,
    version: 1,
    flags: 0,
    title: "Profile name",
    description: "The name and company this account is known by.",
    category: "forms",
    tags: ["profile", "account"],
    descriptor: nameDescriptor,
    submitHandlerKey: PHI_APP_FORM_HANDLER_KEYS.profileName,
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels: loadNameLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    areas: ["app"],
    formId: PHI_APP_FORM_IDS.profileNewsletter,
    version: 1,
    flags: 0,
    title: "Newsletter",
    description: "Whether this account receives product and platform updates.",
    category: "forms",
    tags: ["profile", "account"],
    descriptor: newsletterDescriptor,
    submitHandlerKey: PHI_APP_FORM_HANDLER_KEYS.profileNewsletter,
    confirmHandlerKey: null,
    previewHandlerKey: null,
    defaultConfig: {},
    variant: "default",
    config: {},
    previewUpstreamPath: null,
    loadLabels: loadNewsletterLabels,
  }),
] as const;

/*
 * The account's own endpoints, reached the way every other Form reaches the server.
 *
 * `site-session` is what makes them the signed-in person's own: the gateway relays the Site session
 * cookie, so the server answers about whoever is asking and no account id is ever passed in. CSRF is
 * the gateway's business too -- the Widgets used to fetch a token themselves before every write.
 */
export const PHI_APP_FORM_HANDLER_PROVIDER_DESCRIPTORS = [
  {
    key: createPhiSharedFormProviderKey("handler", "app-profile-name"),
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    title: "Profile name",
    phase: "submit",
    handlerKey: PHI_APP_FORM_HANDLER_KEYS.profileName,
    category: "site",
    transport: "relay",
    method: "PATCH",
    endpointKey: null,
    upstreamPath: "/api/v1/auth/profile/name",
    csrfPath: "/api/v1/auth/csrf",
    requiresCsrf: true,
    credentialPolicy: "site-session",
  },
  {
    key: createPhiSharedFormProviderKey("handler", "app-profile-newsletter"),
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    title: "Profile newsletter",
    phase: "submit",
    handlerKey: PHI_APP_FORM_HANDLER_KEYS.profileNewsletter,
    category: "site",
    transport: "relay",
    method: "PATCH",
    endpointKey: null,
    upstreamPath: "/api/v1/auth/profile/newsletter",
    csrfPath: "/api/v1/auth/csrf",
    requiresCsrf: true,
    credentialPolicy: "site-session",
  },
] satisfies readonly PhiFormHandlerProviderDescriptor[];
