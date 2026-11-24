import { createPhiFormLabelSetLoader } from "../../../components/forms/shared-form-loaders";
import type {
  PhiFormDescriptor,
  PhiFormHandlerProviderDescriptor,
} from "../../../types";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../components/forms/form-provider-contract";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../constants/core-data-provider-keys";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { PHI_APP_RUNTIME_MODULE_ID } from "./ids";
import { phiFormLabel as label } from "../../../components/forms/form-descriptor-text";
import { PhisSiteAddressFlags } from "@phis/contracts/users";
import type { PhiFormId } from "../../../types/form-id";

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
  profilePhone: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "app/profile-phone"),
  addressCreate: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "app/address-create"),
  addressEdit: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "app/address-edit"),
  profileNewsletter: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "app/profile-newsletter"),
  profileLocale: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "app/profile-locale"),
  profileTheme: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "app/profile-theme"),
} as const;

const PHI_APP_FORM_HANDLER_KEYS = {
  profileName: "site.app.profile-name",
  profilePhone: "site.app.profile-phone",
  addressCreate: "site.app.address-create",
  addressEdit: "site.app.address-edit",
  profileNewsletter: "site.app.profile-newsletter",
  profileLocale: "site.app.profile-locale",
  profileTheme: "site.app.profile-theme",
} as const;

const NAME_LABEL_SET_KEY = "@phis/ui/modules/app/labels/profile-name" as const;
const PHONE_LABEL_SET_KEY = "@phis/ui/modules/app/labels/profile-phone" as const;
const ADDRESS_LABEL_SET_KEY = "@phis/ui/modules/app/labels/address" as const;
const NEWSLETTER_LABEL_SET_KEY = "@phis/ui/modules/app/labels/profile-newsletter" as const;
const LOCALE_LABEL_SET_KEY = "@phis/ui/modules/app/labels/profile-locale" as const;
const THEME_LABEL_SET_KEY = "@phis/ui/modules/app/labels/profile-theme" as const;


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
    /*
     * How a reader sees this person -- the byline over what they write -- where it should not be the first
     * and last name. Empty is those two; the address is never shown in its place.
     */
    {
      key: "displayName",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("displayName", "Display name"),
      autoComplete: "nickname",
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
 * The two numbers beside the name, a Form of their own because Core keeps them behind their own write
 * (`PATCH /api/v1/auth/profile/phone`), which takes both at once: what is sent is what is kept, an empty
 * field clears its number. They are written as the person writes them -- spaces, a leading `+`, an
 * extension -- so the rule is the Core's own length and nothing about the digits; the member picker finds a
 * person by them either way.
 */
const PHONE_MAX_LENGTH = 64;
const phoneDescriptor: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_APP_FORM_IDS.profilePhone,
  labelSetKey: PHONE_LABEL_SET_KEY,
  fields: [
    {
      key: "phone",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.tel,
      label: label("phone", "Business phone"),
      autoComplete: "work tel",
      validation: [{
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.maxLength,
        message: label("tooLong", "At most 64 characters."),
        config: { max: PHONE_MAX_LENGTH },
      }],
    },
    {
      key: "mobile",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.tel,
      label: label("mobile", "Mobile"),
      autoComplete: "mobile tel",
      validation: [{
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.maxLength,
        message: label("tooLong", "At most 64 characters."),
        config: { max: PHONE_MAX_LENGTH },
      }],
    },
  ],
  success: {
    title: label("successTitle", "Numbers updated"),
    text: label("successText", "Your telephone numbers have been saved."),
  },
  layout: { gap: { compact: "sm", medium: "base" } },
};

/**
 * One address of the account's book, added or changed (`users:v1`, phis-server
 * `/api/site/account/addresses`): the same two fields twice, the change with the hidden id of the version
 * it replaces in its address. Core takes `{ address, flags }`, and the fields are those two values: the
 * `address` field holds the parts as `PhisSiteAddressInput` and its own rules, the `flags` field what the
 * address is for as `PhisSiteAddressFlags`, a default offered only beside its purpose -- Core refuses a
 * default for a purpose the address does not have.
 */
const ADDRESS_FLAG_OPTIONS = [
  { value: String(PhisSiteAddressFlags.Billing), label: label("billing", "Billing address") },
  { value: String(PhisSiteAddressFlags.Shipping), label: label("shipping", "Shipping address") },
  { value: String(PhisSiteAddressFlags.DefaultBilling), label: label("defaultBilling", "Default for billing") },
  { value: String(PhisSiteAddressFlags.DefaultShipping), label: label("defaultShipping", "Default for shipping") },
];

function addressDescriptor(formId: PhiFormId, mode: "create" | "edit"): PhiFormDescriptor {
  return {
    schemaVersion: 1,
    key: formId,
    labelSetKey: ADDRESS_LABEL_SET_KEY,
    fields: [
      ...(mode === "edit" ? [{ key: "id", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden }] : []),
      { key: "address", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.address },
      {
        key: "flags",
        fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.flags,
        label: label("purposes", "Used for"),
        options: ADDRESS_FLAG_OPTIONS,
        config: {
          requires: {
            [String(PhisSiteAddressFlags.DefaultBilling)]: String(PhisSiteAddressFlags.Billing),
            [String(PhisSiteAddressFlags.DefaultShipping)]: String(PhisSiteAddressFlags.Shipping),
          },
        },
        ...(mode === "create" ? { initialValue: PhisSiteAddressFlags.Billing | PhisSiteAddressFlags.Shipping } : {}),
      },
    ],
    success: {
      title: label("successTitle", "Address saved"),
      text: label("successText", "Your address has been saved."),
    },
    layout: { gap: { compact: "sm", medium: "base" } },
  };
}

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

/**
 * The one language question, whose answers only the Site knows.
 *
 * The options are not in this descriptor, because a registered Form is the same on every Site and the
 * languages are not. They arrive through the placement -- the Page preset writes them into the Form
 * Widget's config and the Core options provider reads them back during the render -- so the select is
 * complete in the HTML the Server sends. A provider that fetched them would leave it empty until the
 * browser caught up, for a list the Page had in its hand all along.
 */
const localeDescriptor: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_APP_FORM_IDS.profileLocale,
  labelSetKey: LOCALE_LABEL_SET_KEY,
  fields: [
    {
      key: "locale",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("fieldLabel", "Default language"),
      optionsProvider: { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.siteLocales },
      /*
       * No `required` rule, for the same reason the Appearance segmented carries none: the select
       * opens on the account's language and offers no way to empty it, so the rule could only ever
       * pass -- and it would print an asterisk beside a field nobody can leave blank. The endpoint
       * refuses a code this Site does not have, which is where that answer belongs.
       */
    },
  ],
  /*
   * It says nothing on success, because the Page says it: the answer sets the account's language and
   * the Preset asks the runtime for this Page again, which comes back written in it.
   */
  layout: { gap: { compact: "sm", medium: "base" } },
};

/**
 * Which half of the Theme this account asks for, including asking for neither.
 *
 * Segmented rather than a switch, because the answer has three states and the third is not "off": a
 * switch would have to hide "follow my device" behind one of the two halves, which is the one thing it
 * is not. The values are the names the endpoint takes, so nothing translates them on the way.
 *
 * It says nothing on success by itself -- the Page asks the runtime for itself again and comes back
 * written in the chosen mode, which is a better answer than a sentence about it.
 */
const themeDescriptor: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_APP_FORM_IDS.profileTheme,
  labelSetKey: THEME_LABEL_SET_KEY,
  fields: [
    {
      key: "themeMode",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.segmented,
      label: label("fieldLabel", "Appearance"),
      options: [
        { value: "system", label: label("modeSystem", "System") },
        { value: "light", label: label("modeLight", "Light") },
        { value: "dark", label: label("modeDark", "Dark") },
      ],
      /*
       * No `required` rule: a segmented control always holds one of its options, so the rule could
       * only ever pass -- and a rule that cannot fail is a rule nobody can read the purpose of. The
       * endpoint refuses a name it does not know, which is where that answer belongs anyway.
       */
    },
  ],
  layout: { gap: { compact: "sm", medium: "base" } },
};

const loadNameLabels = createPhiFormLabelSetLoader(
  () => import("../../../components/widgets/label-sets/profile").then((module) => module.getPhiProfileNameWidgetLabels),
  (labels) => ({
    firstName: labels.fields.firstName,
    lastName: labels.fields.lastName,
    displayName: labels.fields.displayName,
    companyName: labels.fields.companyName,
    successTitle: labels.feedback.successTitle,
    successText: labels.feedback.successText,
    actions: { submitLabel: labels.submitLabel },
  }),
);

const loadPhoneLabels = createPhiFormLabelSetLoader(
  () => import("../../../components/widgets/label-sets/profile").then((module) => module.getPhiProfilePhoneWidgetLabels),
  (labels) => ({
    phone: labels.fields.phone,
    mobile: labels.fields.mobile,
    tooLong: labels.tooLong,
    successTitle: labels.feedback.successTitle,
    successText: labels.feedback.successText,
    actions: { submitLabel: labels.submitLabel },
  }),
);

const loadAddressLabels = createPhiFormLabelSetLoader(
  () => import("./trees/addresses-label-set").then((module) => module.getPhiAppAddressesLabels),
  (labels) => ({ ...labels.form, actions: { submitLabel: labels.save } }),
);

const loadNewsletterLabels = createPhiFormLabelSetLoader(
  () => import("../../../components/widgets/label-sets/profile").then((module) => module.getPhiProfileOverviewWidgetLabels),
  (labels) => ({
    newsletter: labels.newsletterLabel,
    newsletterDescription: labels.newsletterDescription,
  }),
);

const loadLocaleLabels = createPhiFormLabelSetLoader(
  () => import("../../../components/widgets/label-sets/profile").then((module) => module.getPhiProfileLocaleWidgetLabels),
  (labels) => ({
    fieldLabel: labels.fieldLabel,
  }),
);

const loadThemeLabels = createPhiFormLabelSetLoader(
  () => import("../../../components/widgets/label-sets/profile").then((module) => module.getPhiProfileThemeWidgetLabels),
  (labels) => ({
    fieldLabel: labels.fieldLabel,
    modeSystem: labels.modes.system,
    modeLight: labels.modes.light,
    modeDark: labels.modes.dark,
  }),
);

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
    loadLabels: loadNameLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    areas: ["app"],
    formId: PHI_APP_FORM_IDS.profilePhone,
    version: 1,
    flags: 0,
    title: "Telephone numbers",
    description: "The business telephone and mobile number this account can be reached at.",
    category: "forms",
    tags: ["profile", "account"],
    descriptor: phoneDescriptor,
    submitHandlerKey: PHI_APP_FORM_HANDLER_KEYS.profilePhone,
    loadLabels: loadPhoneLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    areas: ["app"],
    formId: PHI_APP_FORM_IDS.addressCreate,
    version: 1,
    flags: 0,
    title: "Add address",
    description: "A billing or shipping address of this account on this site.",
    category: "forms",
    tags: ["profile", "account", "address"],
    descriptor: addressDescriptor(PHI_APP_FORM_IDS.addressCreate, "create"),
    submitHandlerKey: PHI_APP_FORM_HANDLER_KEYS.addressCreate,
    loadLabels: loadAddressLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    areas: ["app"],
    formId: PHI_APP_FORM_IDS.addressEdit,
    version: 1,
    flags: 0,
    title: "Change address",
    description: "A new version of one of this account's addresses, replacing it.",
    category: "forms",
    tags: ["profile", "account", "address"],
    descriptor: addressDescriptor(PHI_APP_FORM_IDS.addressEdit, "edit"),
    submitHandlerKey: PHI_APP_FORM_HANDLER_KEYS.addressEdit,
    loadLabels: loadAddressLabels,
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
    loadLabels: loadNewsletterLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    areas: ["app"],
    formId: PHI_APP_FORM_IDS.profileLocale,
    version: 1,
    flags: 0,
    title: "Language",
    description: "Which of the site's languages this account reads it in.",
    category: "forms",
    tags: ["profile", "account"],
    descriptor: localeDescriptor,
    submitHandlerKey: PHI_APP_FORM_HANDLER_KEYS.profileLocale,
    loadLabels: loadLocaleLabels,
  }),
  definePhiRuntimeModuleForm({
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    areas: ["app"],
    formId: PHI_APP_FORM_IDS.profileTheme,
    version: 1,
    flags: 0,
    title: "Appearance",
    description: "Which half of the Theme this account is shown, or neither.",
    category: "forms",
    tags: ["profile", "account"],
    descriptor: themeDescriptor,
    submitHandlerKey: PHI_APP_FORM_HANDLER_KEYS.profileTheme,
    loadLabels: loadThemeLabels,
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
    key: createPhiSharedFormProviderKey("handler", "app-profile-phone"),
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    title: "Profile telephone numbers",
    phase: "submit",
    handlerKey: PHI_APP_FORM_HANDLER_KEYS.profilePhone,
    category: "site",
    transport: "relay",
    method: "PATCH",
    endpointKey: null,
    upstreamPath: "/api/v1/auth/profile/phone",
    csrfPath: "/api/v1/auth/csrf",
    requiresCsrf: true,
    credentialPolicy: "site-session",
  },
  /*
   * The address book's two writes. The Form's two values are Core's `{ address, flags }`; a change names
   * the version it replaces in its path, the hidden `id` as `{id}`.
   */
  {
    key: createPhiSharedFormProviderKey("handler", "app-address-create"),
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    title: "Add address",
    phase: "submit",
    handlerKey: PHI_APP_FORM_HANDLER_KEYS.addressCreate,
    category: "site",
    transport: "relay",
    method: "POST",
    endpointKey: null,
    upstreamPath: "/api/site/account/addresses",
    csrfPath: null,
    requiresCsrf: false,
    credentialPolicy: "site-session",
  },
  {
    key: createPhiSharedFormProviderKey("handler", "app-address-edit"),
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    title: "Change address",
    phase: "submit",
    handlerKey: PHI_APP_FORM_HANDLER_KEYS.addressEdit,
    category: "site",
    transport: "relay",
    method: "PUT",
    endpointKey: null,
    upstreamPath: "/api/site/account/addresses/{id}",
    csrfPath: null,
    requiresCsrf: false,
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
  {
    key: createPhiSharedFormProviderKey("handler", "app-profile-theme"),
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    title: "Profile appearance",
    phase: "submit",
    handlerKey: PHI_APP_FORM_HANDLER_KEYS.profileTheme,
    category: "site",
    transport: "relay",
    method: "PATCH",
    endpointKey: null,
    upstreamPath: "/api/v1/auth/profile/theme",
    csrfPath: "/api/v1/auth/csrf",
    requiresCsrf: true,
    credentialPolicy: "site-session",
  },
  {
    key: createPhiSharedFormProviderKey("handler", "app-profile-locale"),
    ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
    title: "Profile language",
    phase: "submit",
    handlerKey: PHI_APP_FORM_HANDLER_KEYS.profileLocale,
    category: "site",
    transport: "relay",
    method: "PATCH",
    endpointKey: null,
    upstreamPath: "/api/v1/auth/profile/locale",
    csrfPath: "/api/v1/auth/csrf",
    requiresCsrf: true,
    credentialPolicy: "site-session",
  },
] satisfies readonly PhiFormHandlerProviderDescriptor[];
