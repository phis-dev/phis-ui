import { PHI_ASSET_RUNTIME_MODULE_ID } from "../../plugins/runtime-modules/asset/ids";
import type {
  PhiFormDescriptor,
  PhiFormHandlerProviderDescriptor,
} from "../../types";
import { createPhiFormId } from "../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../types/signals";
import { PHI_FORM_GRID_LAST_LINE } from "../forms/form-descriptor-contract";
import { flattenPhiFormLabels } from "../forms/form-labels";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../forms/form-registry";
import { readPhiServerApiCredentials } from "../../helpers/phis-server-credentials";

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
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
      label: label("defaultUserQuota", "Default User Space quota"),
      description: label("defaultUserQuotaHint", "Applies to User Spaces without an override. Empty means no limit."),
      placeholder: label("unlimited", "Unlimited"),
    },
    {
      key: "defaultGroupQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
      label: label("defaultGroupQuota", "Default Group Space quota"),
      description: label("defaultGroupQuotaHint", "Applies to Group Spaces without an override. Empty means no limit."),
      placeholder: label("unlimited", "Unlimited"),
    },
    // The fourth kind, on the same rails. An Add-on Space has no owner: no page showing the figure and
    // no Manager to notice it filling, so the Site default is the only thing that bounds it.
    {
      key: "defaultAddonQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
      label: label("defaultAddonQuota", "Default Add-on Space quota"),
      description: label("defaultAddonQuotaHint", "Applies to each Add-on's own store. An Add-on Space has no owner to notice it filling, so a limit here is what bounds it."),
      placeholder: label("unlimited", "Unlimited"),
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
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
      label: label("maxUserQuota", "Maximum User Space quota"),
      description: label("maxUserQuotaHint", "The ceiling an override may not exceed. Empty means no ceiling."),
      placeholder: label("unlimited", "Unlimited"),
    },
    {
      key: "maxGroupQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
      label: label("maxGroupQuota", "Maximum Group Space quota"),
      description: label("maxGroupQuotaHint", "The ceiling a group Manager may not exceed for their own group. Empty means no ceiling."),
      placeholder: label("unlimited", "Unlimited"),
    },
    {
      key: "maxAddonQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
      label: label("maxAddonQuota", "Maximum Add-on Space quota"),
      description: label("maxAddonQuotaHint", "The ceiling an override may not exceed. Empty means no ceiling."),
      placeholder: label("unlimited", "Unlimited"),
    },
    /*
     * The limit that actually stops an upload, which this page used to only report.
     *
     * A quota is how much a Space may hold in total; this is how much one file may weigh, and it is the
     * one an author meets -- the upload route refuses the file against it before any quota is consulted.
     * Reporting it beside the read-only runtime values said it was derived from something. It is not:
     * it is capacity, decided here, like every other figure on this page.
     *
     * It alone cannot be emptied. An empty quota means no limit, which is a coherent thing for a Space
     * to say; a Site that accepts files of no maximum size has said nothing, and the schema refuses it.
     */
    {
      key: "maxObjectBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
      label: label("maxObjectSize", "Maximum file size"),
      description: label("maxObjectSizeHint", "The largest single file this site accepts. Every upload is refused against it, whatever the Space still has room for."),
      validation: [{
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
        message: label("maxObjectSizeRequired", "A maximum file size is required."),
      }],
    },
  ],
  /*
   * Wide labels, narrow fields, against the house third.
   *
   * Every label here is a sentence naming a Space kind and which of the two instruments it is --
   * "Maximum Add-on Space quota" -- and the shared third wraps all six onto two lines. What stands
   * opposite is a storage size: four or five characters, which needs a third of the width far less
   * than the label needs two thirds. Line 17 of 24 is where that lands.
   */
  layout: {
    gap: { compact: "sm", medium: "base" },
    label: {
      compact: { start: 1, end: PHI_FORM_GRID_LAST_LINE },
      medium: { start: 1, end: 17 },
      wide: { start: 1, end: 17 },
    },
    control: {
      compact: { start: 1, end: PHI_FORM_GRID_LAST_LINE },
      medium: { start: 17, end: PHI_FORM_GRID_LAST_LINE },
      wide: { start: 17, end: PHI_FORM_GRID_LAST_LINE },
    },
  },
};

async function loadLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiMediaSettingsPageLabels } = await import("./media-settings-labels");
  const labels = await getPhiMediaSettingsPageLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
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
    maxObjectSize: labels.fields.maxObjectSize,
    maxObjectSizeHint: labels.fields.maxObjectSizeHint,
    maxObjectSizeRequired: labels.fields.maxObjectSizeRequired,
    unlimited: labels.fields.unlimited,
  });
}

export const PHI_MEDIA_SETTINGS_RUNTIME_MODULE_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  areas: ["admin"],
  formId: PHI_MEDIA_SETTINGS_FORM_IDS.general,
  version: 1,
  flags: 0,
  title: "Media settings",
  description: "Default Media Space quotas, per-Space ceilings, and the largest file the site accepts.",
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
