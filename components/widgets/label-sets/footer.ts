import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_FOOTER_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:footer",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    links_title: "Quick Links",
    contact_title: "Contact",
    email_label: "Email",
    location_label: "Location",
  },
});

export async function getPhiFooterWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_FOOTER_WIDGET_LABEL_SET);
  return {
    linksTitle: labels.links_title,
    contactTitle: labels.contact_title,
    emailLabel: labels.email_label,
    locationLabel: labels.location_label,
  };
}
