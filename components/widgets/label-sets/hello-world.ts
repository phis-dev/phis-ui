import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_HELLO_WORLD_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:hello-world",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Hello world",
    locale_label: "Locale",
    site_name_label: "Site name",
    site_key_label: "Site key",
    path_label: "Path",
    area_label: "Area",
    access_label: "Access",
    current_user_label: "Current user",
    page_status_label: "Page status",
    widget_id_label: "Widget ID",
    widget_type_label: "Widget type",
    public_value: "public",
    authenticated_value: "authenticated",
  },
});

export async function getPhiHelloWorldWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_HELLO_WORLD_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    localeLabel: labels.locale_label,
    siteNameLabel: labels.site_name_label,
    siteKeyLabel: labels.site_key_label,
    pathLabel: labels.path_label,
    areaLabel: labels.area_label,
    accessLabel: labels.access_label,
    currentUserLabel: labels.current_user_label,
    pageStatusLabel: labels.page_status_label,
    widgetIdLabel: labels.widget_id_label,
    widgetTypeLabel: labels.widget_type_label,
    publicValue: labels.public_value,
    authenticatedValue: labels.authenticated_value,
  };
}
