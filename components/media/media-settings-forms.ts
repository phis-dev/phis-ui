import { PHI_ASSET_RUNTIME_MODULE_ID } from "../../plugins/runtime-modules/asset/ids";
import type {
  PhiFormDescriptor,
  PhiFormHandlerProviderDescriptor,
} from "../../types";
import { createPhiFormId } from "../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../types/signals";
import { flattenPhiFormLabels } from "../forms/form-labels";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../forms/form-registry";

export const PHI_MEDIA_SETTINGS_FORM_IDS = {
  general: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "asset/media-settings"),
} as const;

export const PHI_MEDIA_SETTINGS_FORM_HANDLER_KEYS = {
  general: "site.admin.media-settings",
} as const;

const LABEL_SET_KEY = "@phis/ui/modules/asset/labels/settings" as const;
const label = (key: string, fallback: string) => ({ kind: "label", key, fallback } as const);

const PHI_MEDIA_SETTINGS_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_MEDIA_SETTINGS_FORM_IDS.general,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    // Availability is deliberately absent: which Space kinds exist follows from the Modules the Site
    // activates, so it is reported next to the technical values rather than switched here.
    {
      key: "defaultUserQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
      label: label("defaultUserQuota", "Default User Space quota (bytes)"),
      description: label("defaultUserQuotaHint", "Applies to User Spaces without an override. Empty means no limit."),
    },
    {
      key: "defaultGroupQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
      label: label("defaultGroupQuota", "Default Group Space quota (bytes)"),
      description: label("defaultGroupQuotaHint", "Applies to Group Spaces without an override. Empty means no limit."),
    },
    // The fourth kind, on the same rails. An Add-on Space has no owner: no page showing the figure and
    // no Manager to notice it filling, so the Site default is the only thing that bounds it.
    {
      key: "defaultAddonQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
      label: label("defaultAddonQuota", "Default Add-on Space quota (bytes)"),
      description: label("defaultAddonQuotaHint", "Applies to each Add-on's own store. An Add-on Space has no owner to notice it filling, so a limit here is what bounds it."),
    },
    /*
     * The ceilings, which the API has always carried and this form never offered.
     *
     * A default and a ceiling are different instruments: the default is what an unsized Space gets, the
     * ceiling is what an override may not exceed. Delegated capacity without a ceiling is not delegated
     * capacity -- an actor who can raise their own allowance has none -- so an administrator who can set
     * the one and not the other is being shown half a policy.
     */
    {
      key: "maxUserQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
      label: label("maxUserQuota", "Maximum User Space quota (bytes)"),
      description: label("maxUserQuotaHint", "The ceiling an override may not exceed. Empty means no ceiling."),
    },
    {
      key: "maxGroupQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
      label: label("maxGroupQuota", "Maximum Group Space quota (bytes)"),
      description: label("maxGroupQuotaHint", "The ceiling a group Manager may not exceed for their own group. Empty means no ceiling."),
    },
    {
      key: "maxAddonQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.number,
      label: label("maxAddonQuota", "Maximum Add-on Space quota (bytes)"),
      description: label("maxAddonQuotaHint", "The ceiling an override may not exceed. Empty means no ceiling."),
    },
  ],
  layout: {
    columns: { compact: 1, medium: 1, wide: 1 },
    gap: { compact: "sm", medium: "base" },
    labelPlacement: "side",
    labelAlign: "start",
  },
};

async function loadLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiMediaSettingsPageLabels } = await import("./media-settings-labels");
  const labels = await getPhiMediaSettingsPageLabels({
    apiBaseUrl: context.runtime.phis.apiBaseUrl,
    internalToken: context.runtime.phis.internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    defaultUserQuota: labels.fields.defaultUserQuota,
    defaultUserQuotaHint: labels.fields.defaultUserQuotaHint,
    defaultGroupQuota: labels.fields.defaultGroupQuota,
    defaultGroupQuotaHint: labels.fields.defaultGroupQuotaHint,
    defaultAddonQuota: labels.fields.defaultAddonQuota,
    defaultAddonQuotaHint: labels.fields.defaultAddonQuotaHint,
    maxUserQuota: labels.fields.maxUserQuota,
    maxUserQuotaHint: labels.fields.maxUserQuotaHint,
    maxGroupQuota: labels.fields.maxGroupQuota,
    maxGroupQuotaHint: labels.fields.maxGroupQuotaHint,
    maxAddonQuota: labels.fields.maxAddonQuota,
    maxAddonQuotaHint: labels.fields.maxAddonQuotaHint,
  });
}

export const PHI_MEDIA_SETTINGS_RUNTIME_MODULE_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  formId: PHI_MEDIA_SETTINGS_FORM_IDS.general,
  version: 1,
  flags: 0,
  title: "Media settings",
  description: "Default Media Space quotas and per-Space ceilings for the current site.",
  category: "forms",
  tags: ["settings", "media", "admin"],
  descriptor: PHI_MEDIA_SETTINGS_FORM_DESCRIPTOR,
  submitHandlerKey: PHI_MEDIA_SETTINGS_FORM_HANDLER_KEYS.general,
  confirmHandlerKey: null,
  previewHandlerKey: null,
  defaultConfig: {},
  variant: "default",
  config: {},
  previewUpstreamPath: null,
  loadLabels,
});

export const PHI_MEDIA_SETTINGS_FORM_HANDLER_PROVIDER_DESCRIPTOR = {
  key: createPhiSharedFormProviderKey("handler", "asset-media-settings"),
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  title: "Admin media settings",
  phase: "submit",
  handlerKey: PHI_MEDIA_SETTINGS_FORM_HANDLER_KEYS.general,
  category: "site",
  transport: "relay",
  method: "PATCH",
  endpointKey: null,
  upstreamPath: "/api/site/admin/media",
  csrfPath: null,
  requiresCsrf: false,
  credentialPolicy: "site-session",
} satisfies PhiFormHandlerProviderDescriptor;
