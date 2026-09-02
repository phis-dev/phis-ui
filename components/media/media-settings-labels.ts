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
    intro_description: "Control the default storage quotas, and the ceilings an individual Space may not exceed.",
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
    default_addon_quota_label: "Default Add-on Space quota (bytes)",
    default_addon_quota_hint: "Applies to each Add-on's own store. An Add-on Space has no owner to notice it filling, so a limit here is what bounds it.",
    max_user_quota_label: "Maximum User Space quota (bytes)",
    max_user_quota_hint: "The ceiling an override may not exceed. Empty means no ceiling.",
    max_group_quota_label: "Maximum Group Space quota (bytes)",
    max_group_quota_hint: "The ceiling a group Manager may not exceed for their own group. Empty means no ceiling.",
    max_addon_quota_label: "Maximum Add-on Space quota (bytes)",
    max_addon_quota_hint: "The ceiling an override may not exceed. Empty means no ceiling.",
    addon_spaces_title: "Add-on stores",
    addon_spaces_empty: "No Add-on holds files on this site.",
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
      defaultAddonQuota: labels.default_addon_quota_label,
      defaultAddonQuotaHint: labels.default_addon_quota_hint,
      maxUserQuota: labels.max_user_quota_label,
      maxUserQuotaHint: labels.max_user_quota_hint,
      maxGroupQuota: labels.max_group_quota_label,
      maxGroupQuotaHint: labels.max_group_quota_hint,
      maxAddonQuota: labels.max_addon_quota_label,
      maxAddonQuotaHint: labels.max_addon_quota_hint,
      maxObjectBytes: labels.max_object_bytes_label,
    },
    addonSpaces: {
      title: labels.addon_spaces_title,
      empty: labels.addon_spaces_empty,
    },
    submitLabel: labels.submit_label,
  };
}
