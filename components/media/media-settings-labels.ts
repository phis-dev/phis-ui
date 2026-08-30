import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../gateway/label-set";

const PHI_MEDIA_SETTINGS_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:admin-media-settings-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    page_title: "Media",
    page_description: "Configure the default Media Space quotas for this site.",
    intro_title: "Media settings",
    intro_description: "Control the default storage quotas for Member and group Media Spaces.",
    technical_title: "Technical",
    technical_description: "Read-only runtime values derived from the current media configuration.",
    max_object_bytes_label: "Maximum object size (bytes)",
    user_spaces_enabled_label: "User Spaces",
    group_spaces_enabled_label: "Group Spaces",
    space_kind_available: "available",
    space_kind_unavailable: "not activated by any Module",
    default_user_quota_label: "Default User Space quota (bytes)",
    default_user_quota_hint: "Applies to User Spaces without an override. Empty means no limit.",
    default_group_quota_label: "Default Group Space quota (bytes)",
    default_group_quota_hint: "Applies to Group Spaces without an override. Empty means no limit.",
    submit_label: "Save",
  },
});

export async function getPhiMediaSettingsPageLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_MEDIA_SETTINGS_PAGE_LABEL_SET);
  return {
    pageTitle: labels.page_title,
    pageDescription: labels.page_description,
    intro: {
      title: labels.intro_title,
      description: labels.intro_description,
    },
    technical: {
      title: labels.technical_title,
      description: labels.technical_description,
    },
    availability: {
      available: labels.space_kind_available,
      unavailable: labels.space_kind_unavailable,
    },
    fields: {
      userSpacesEnabled: labels.user_spaces_enabled_label,
      groupSpacesEnabled: labels.group_spaces_enabled_label,
      defaultUserQuota: labels.default_user_quota_label,
      defaultUserQuotaHint: labels.default_user_quota_hint,
      defaultGroupQuota: labels.default_group_quota_label,
      defaultGroupQuotaHint: labels.default_group_quota_hint,
      maxObjectBytes: labels.max_object_bytes_label,
    },
    submitLabel: labels.submit_label,
  };
}
