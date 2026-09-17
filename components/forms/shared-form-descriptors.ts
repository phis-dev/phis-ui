import {
  PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
  type PhiFormDescriptor,
  type PhiFormTextDescriptor,
} from "../../types/form-descriptor";
import {
  PHI_AUTH_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
} from "./form-provider-contract";
import {
  PHI_FORM_STACKED_FULL,
  PHI_FORM_STACKED_LAYOUT,
} from "./form-descriptor-contract";
import { PHI_SHARED_FORM_IDS } from "./shared-form-ids";

function label(key: string, fallback: string): PhiFormTextDescriptor {
  return { kind: "label", key, fallback };
}

function required(messageKey: string, fallback: string) {
  return {
    providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
    message: label(messageKey, fallback),
  } as const;
}

export const PHI_FORM_LABEL_SET_KEYS = {
  login: "@phis/ui/modules/auth/labels/login",
  registration: "@phis/ui/modules/auth/labels/registration",
  contact: "@phis/ui/modules/public/labels/contact",
  confirm: "@phis/ui/modules/auth/labels/confirm",
  resetPassword: "@phis/ui/modules/auth/labels/reset-password",
} as const;

export const PHI_LOGIN_FORM_DESCRIPTOR = {
  schemaVersion: PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
  key: PHI_SHARED_FORM_IDS.login,
  labelSetKey: PHI_FORM_LABEL_SET_KEYS.login,
  fields: [
    {
      key: "email",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.email,
      label: label("fields.email.label", "Email"),
      autoComplete: "email",
      validation: [
        required("fields.email.required", "Please enter your email."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.email,
          message: label("fields.email.invalid", "Please enter a valid email address."),
        },
      ],
    },
    {
      key: "password",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.password,
      label: label("fields.password.label", "Password"),
      autoComplete: "current-password",
      validation: [required("fields.password.required", "Please enter your password.")],
    },
    { key: "next", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
  ],
} as const satisfies PhiFormDescriptor;

export const PHI_PROVIDER_LINK_CONFIRMATION_FORM_DESCRIPTOR = {
  schemaVersion: PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
  key: PHI_SHARED_FORM_IDS.providerLinkConfirmation,
  labelSetKey: PHI_FORM_LABEL_SET_KEYS.login,
  layout: PHI_FORM_STACKED_LAYOUT,
  fields: [
    {
      key: "password",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.password,
      label: label("providerLink.passwordLabel", "Password"),
      autoComplete: "current-password",
      validation: [
        required("providerLink.passwordRequired", "Enter your existing account password."),
      ],
    },
  ],
} as const satisfies PhiFormDescriptor;

export const PHI_REGISTRATION_FORM_DESCRIPTOR = {
  schemaVersion: PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
  key: PHI_SHARED_FORM_IDS.registration,
  labelSetKey: PHI_FORM_LABEL_SET_KEYS.registration,
  fields: [
    {
      key: "firstName",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("fields.firstName.label", "First name"),
      placeholder: label("fields.firstName.placeholder", "Jane"),
      autoComplete: "given-name",
      validation: [
        required("fields.firstName.required", "Please enter your first name."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.minLetters,
          message: label("fields.firstName.minLetters", "First name must contain at least 3 letters."),
          config: { min: 3 },
        },
      ],
    },
    {
      key: "lastName",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("fields.lastName.label", "Last name"),
      placeholder: label("fields.lastName.placeholder", "Doe"),
      autoComplete: "family-name",
      validation: [
        required("fields.lastName.required", "Please enter your last name."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.minLetters,
          message: label("fields.lastName.minLetters", "Last name must contain at least 3 letters."),
          config: { min: 3 },
        },
      ],
    },
    {
      key: "company",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("fields.company.label", "Company"),
      placeholder: label("fields.company.placeholder", "Optional"),
    },
    {
      key: "email",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.email,
      label: label("fields.email.label", "Email"),
      placeholder: label("fields.email.placeholder", "you@example.com"),
      autoComplete: "email",
      validation: [
        required("fields.email.required", "Please enter your email address."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.email,
          message: label("fields.email.invalid", "Please enter a valid email address."),
        },
      ],
    },
    {
      key: "password",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.password,
      label: label("fields.password.label", "Password"),
      placeholder: label("fields.password.placeholder", "Choose a secure password"),
      autoComplete: "new-password",
      validation: [
        required("fields.password.required", "Please enter a password."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.minLength,
          message: label("fields.password.minLength", "Use at least 10 characters."),
          config: { min: 10 },
        },
      ],
    },
    {
      key: "confirmPassword",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.password,
      label: label("fields.confirmPassword.label", "Confirm password"),
      placeholder: label("fields.confirmPassword.placeholder", "Repeat your password"),
      autoComplete: "new-password",
      validation: [
        required("fields.confirmPassword.required", "Please confirm your password."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.matchesField,
          message: label("fields.confirmPassword.mismatch", "The passwords do not match."),
          config: { field: "password" },
        },
      ],
    },
    {
      key: "website",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.honeypot,
    },
    { key: "locale", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden },
    {
      key: "termsAccepted",
      fieldProviderKey: PHI_AUTH_FORM_FIELD_PROVIDER_KEYS.termsConsent,
      placement: PHI_FORM_STACKED_FULL,
      validation: [required("consent.termsRequired", "You must accept the terms to continue.")],
      config: {
        text: label("consent.termsText", "I agree to the %1"),
        linkLabel: label("consent.termsLinkLabel", "Terms & Conditions"),
        // Where the terms live is a property of the placement: the Area, and the language's path.
        href: { kind: "config", key: "termsHref", fallback: "/terms-and-conditions" },
      },
    },
    {
      key: "newsletter",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.checkbox,
      controlLabel: label("consent.newsletter", "Send me product and platform updates."),
      placement: PHI_FORM_STACKED_FULL,
    },
  ],
  success: {
    title: label("feedback.successTitle", "Account created"),
    text: label("feedback.successText", "Check your inbox to confirm your email address."),
    reset: true,
  },
  // Long enough that somebody who leaves to read the terms should not come back to an empty form.
  persistDraft: true,
  guard: true,
} as const satisfies PhiFormDescriptor;

export const PHI_CONTACT_FORM_DESCRIPTOR = {
  schemaVersion: PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
  key: PHI_SHARED_FORM_IDS.contact,
  labelSetKey: PHI_FORM_LABEL_SET_KEYS.contact,
  fields: [
    {
      key: "name",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("fields.name.label", "Name"),
      placeholder: label("fields.name.placeholder", "Your name"),
      validation: [required("fields.name.required", "Please enter your name.")],
    },
    {
      key: "email",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.email,
      label: label("fields.email.label", "Email"),
      placeholder: label("fields.email.placeholder", "mail@example.com"),
      validation: [
        required("fields.email.required", "Please enter your email address."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.email,
          message: label("fields.email.invalid", "Please provide a valid email address."),
        },
      ],
    },
    {
      key: "subject",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text,
      label: label("fields.subject.label", "Subject"),
      placeholder: label("fields.subject.placeholder", "What is this about?"),
      validation: [required("fields.subject.required", "Please enter a subject.")],
    },
    {
      key: "message",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.textarea,
      label: label("fields.message.label", "Message"),
      placeholder: label("fields.message.placeholder", "Your message"),
      validation: [required("fields.message.required", "Please enter your message.")],
      config: { rows: 6 },
    },
    { key: "website", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.honeypot },
  ],
  success: {
    title: label("feedback.successTitle", "Message sent"),
    text: label("feedback.successText", "Your message has been submitted successfully."),
    reset: true,
  },
  guard: true,
} as const satisfies PhiFormDescriptor;

export const PHI_CONFIRM_FORM_DESCRIPTOR = {
  schemaVersion: PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
  key: PHI_SHARED_FORM_IDS.confirm,
  labelSetKey: PHI_FORM_LABEL_SET_KEYS.confirm,
  layout: PHI_FORM_STACKED_LAYOUT,
  fields: [
    {
      key: "token",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden,
      validation: [required("fields.token.required", "Confirmation token is required.")],
    },
  ],
  success: {
    title: label("feedback.successTitle", "Confirmed"),
    text: label("feedback.successText", "Your registration has been confirmed."),
  },
} as const satisfies PhiFormDescriptor;

export const PHI_RESET_PASSWORD_FORM_DESCRIPTOR = {
  schemaVersion: PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
  key: PHI_SHARED_FORM_IDS.resetPassword,
  labelSetKey: PHI_FORM_LABEL_SET_KEYS.resetPassword,
  layout: PHI_FORM_STACKED_LAYOUT,
  fields: [
    {
      key: "email",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.email,
      label: label("fields.email.label", "Email"),
      placeholder: label("fields.email.placeholder", "you@example.com"),
      autoComplete: "email",
      validation: [
        required("fields.email.required", "Please enter your email address."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.email,
          message: label("fields.email.invalid", "Please enter a valid email address."),
        },
      ],
    },
  ],
  success: {
    title: label("feedback.successTitle", "Check your email"),
    text: label("feedback.successText", "If an account exists for that address, a reset link is on its way."),
  },
} as const satisfies PhiFormDescriptor;

export const PHI_RESET_PASSWORD_CONFIRM_FORM_DESCRIPTOR = {
  schemaVersion: PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
  key: PHI_SHARED_FORM_IDS.resetPasswordConfirm,
  labelSetKey: PHI_FORM_LABEL_SET_KEYS.resetPassword,
  layout: PHI_FORM_STACKED_LAYOUT,
  fields: [
    /*
     * Hidden, because it is not a question: the token arrived in the link and the placement puts it
     * here. A field nobody should have to type is one nobody should be shown typing.
     */
    {
      key: "token",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.hidden,
      validation: [required("fields.token.required", "The reset token is required.")],
    },
    {
      key: "password",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.password,
      label: label("fields.password.label", "New password"),
      placeholder: label("fields.password.placeholder", "Choose a secure password"),
      autoComplete: "new-password",
      validation: [
        required("fields.password.required", "Please enter a new password."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.minLength,
          message: label("fields.password.minLength", "Use at least 10 characters."),
          config: { min: 10 },
        },
      ],
    },
    {
      key: "confirmPassword",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.password,
      label: label("fields.confirmPassword.label", "Confirm new password"),
      placeholder: label("fields.confirmPassword.placeholder", "Repeat your new password"),
      autoComplete: "new-password",
      validation: [
        required("fields.confirmPassword.required", "Please confirm the new password."),
        {
          providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.matchesField,
          message: label("fields.confirmPassword.mismatch", "The passwords do not match."),
          config: { field: "password" },
        },
      ],
    },
  ],
  success: {
    title: label("feedback.successTitle", "Password updated"),
    text: label("feedback.successText", "You can now sign in with your new password."),
  },
} as const satisfies PhiFormDescriptor;
