import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_ADMIN_SETTINGS_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:admin-settings",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Site settings",
    description: "Update the core site identity and contact details.",
    identity_title: "Identity",
    identity_description: "Site name and technical hostname.",
    urls_title: "URLs",
    urls_description: "Public base URL for this site.",
    contact_title: "Contact",
    contact_description: "Support and public contact addresses.",
    technical_title: "Technical",
    technical_description: "Read-only runtime values derived from the current site configuration.",
    site_name_label: "Site name",
    hostname_label: "Hostname",
    public_base_url_label: "Public base URL",
    support_email_label: "Support email",
    site_key_label: "Site key",
    mail_from_label: "Mail from",
    mail_from_name_label: "Mail from name",
    contact_recipient_label: "Contact recipient",
    submit_label: "Save",
    error_title: "Settings update failed",
    error_load: "Failed to load site settings.",
    error_network: "Network error while updating the site settings.",
    error_invalid_public_base_url: "Please provide a valid public base URL.",
    error_invalid_support_email: "Please provide a valid support email address.",
    error_generic: "The site settings could not be updated.",
    success_title: "Settings updated",
    success_text: "The site settings have been saved.",
  },
});

export async function getPhiAdminSettingsWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_ADMIN_SETTINGS_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    sections: {
      identity: {
        title: labels.identity_title,
        description: labels.identity_description,
      },
      urls: {
        title: labels.urls_title,
        description: labels.urls_description,
      },
      contact: {
        title: labels.contact_title,
        description: labels.contact_description,
      },
      technical: {
        title: labels.technical_title,
        description: labels.technical_description,
      },
    },
    fields: {
      siteName: labels.site_name_label,
      hostname: labels.hostname_label,
      publicBaseUrl: labels.public_base_url_label,
      supportEmail: labels.support_email_label,
      siteKey: labels.site_key_label,
      mailFrom: labels.mail_from_label,
      mailFromName: labels.mail_from_name_label,
      contactRecipient: labels.contact_recipient_label,
    },
    submitLabel: labels.submit_label,
    feedback: {
      errorTitle: labels.error_title,
      errorLoad: labels.error_load,
      errorNetwork: labels.error_network,
      errorInvalidPublicBaseUrl: labels.error_invalid_public_base_url,
      errorInvalidSupportEmail: labels.error_invalid_support_email,
      errorGeneric: labels.error_generic,
      successTitle: labels.success_title,
      successText: labels.success_text,
    },
  };
}
