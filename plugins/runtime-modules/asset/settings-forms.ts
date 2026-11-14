import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS, PHI_ASSET_RUNTIME_MODULE_ID } from "./ids";
import type {
  PhiFormDescriptor,
  PhiFormHandlerProviderDescriptor,
} from "../../../types";
import { createPhiFormId } from "../../../types/form-id";
import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { PHI_FORM_GRID_LAST_LINE } from "../../../components/forms/form-descriptor-contract";
import { flattenPhiFormLabels } from "../../../components/forms/form-labels";
import {
  PHI_FORM_FIELD_PROVIDER_KEYS,
  PHI_FORM_VALIDATION_PROVIDER_KEYS,
  createPhiSharedFormProviderKey,
} from "../../../components/forms/form-provider-contract";
import { definePhiRuntimeModuleForm } from "../../../components/forms/form-registry";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";
import { phiFormLabel as label } from "../../../components/forms/form-descriptor-text";

export const PHI_MEDIA_SETTINGS_FORM_IDS = {
  general: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "asset/media-settings"),
  storage: createPhiFormId(PHI_SHARED_PACKAGE_NAME, "asset/media-storage-settings"),
} as const;

const PHI_MEDIA_SETTINGS_FORM_HANDLER_KEYS = {
  general: "site.admin.media-settings",
  storage: "site.admin.media-storage-settings",
} as const;

const LABEL_SET_KEY = "@phis/ui/modules/asset/labels/settings" as const;

const PHI_MEDIA_SETTINGS_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_MEDIA_SETTINGS_FORM_IDS.general,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    // Availability is deliberately absent: which Space kinds exist follows from the Modules the Site
    // activates, so it is reported next to the technical values rather than switched here.
    /*
     * The limit that actually stops an upload, and so the first thing this page states.
     *
     * A quota is how much a Space may hold in total; this is how much one file may weigh, and it is the
     * one an author meets -- the upload route refuses the file against it before any quota is consulted.
     * Reporting it beside the read-only runtime values said it was derived from something. It is not:
     * it is capacity, decided here, like every other figure on this page.
     *
     * It alone cannot be emptied. An empty quota means no limit, which is a coherent thing for a Space
     * to say; a Site that accepts files of no maximum size has said nothing, and the schema refuses it.
     * That is the second reason it stands first: of the seven figures here it is the only one that has
     * to be answered, and the six below it may all be left open.
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
    {
      key: "defaultUserQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
      label: label("defaultUserQuota", "Default User Space quota"),
      description: label("defaultUserQuotaHint", "Applies to User Spaces without an override. Empty means no limit, zero means no room at all."),
      placeholder: label("unlimited", "Unlimited"),
    },
    {
      key: "defaultGroupQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
      label: label("defaultGroupQuota", "Default Group Space quota"),
      description: label("defaultGroupQuotaHint", "Applies to Group Spaces without an override. Empty means no limit, zero means no room at all."),
      placeholder: label("unlimited", "Unlimited"),
    },
    // The fourth kind, on the same rails. An Add-on Space has no owner: no page showing the figure and
    // no Manager to notice it filling, so the Site default is the only thing that bounds it.
    {
      key: "defaultAddonQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
      label: label("defaultAddonQuota", "Default Add-on Space quota"),
      description: label("defaultAddonQuotaHint", "Applies to each Add-on's own store. An Add-on Space has no owner to notice it filling, so a limit here is what bounds it. Empty means no limit, zero means no room at all."),
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
      description: label("maxUserQuotaHint", "The ceiling an override may not exceed. Empty means no ceiling, zero holds every Space at nothing."),
      placeholder: label("unlimited", "Unlimited"),
    },
    {
      key: "maxGroupQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
      label: label("maxGroupQuota", "Maximum Group Space quota"),
      description: label("maxGroupQuotaHint", "The ceiling a group Manager may not exceed for their own group. Empty means no ceiling, zero holds every group at nothing."),
      placeholder: label("unlimited", "Unlimited"),
    },
    {
      key: "maxAddonQuotaBytes",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.storageSize,
      label: label("maxAddonQuota", "Maximum Add-on Space quota"),
      description: label("maxAddonQuotaHint", "The ceiling an override may not exceed. Empty means no ceiling, zero holds every Space at nothing."),
      placeholder: label("unlimited", "Unlimited"),
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

const profileChoices = { providerKey: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaStorageProfiles };

/**
 * Where the Site's Spaces write, among the Storage Profiles the operator created with `phis storage add`.
 *
 * Every choice is a Profile id; an emptied default is the Site's Local Profile, an emptied list offers
 * every Profile, and the paused list is the whole set -- a Profile left out of it takes uploads again.
 * The server refuses what does not fit (a Space pointed at a Profile outside the offered list, or newly at
 * a paused one, or a Provider one serving Instance lacks) and says why.
 */
const PHI_MEDIA_STORAGE_SETTINGS_FORM_DESCRIPTOR: PhiFormDescriptor = {
  schemaVersion: 1,
  key: PHI_MEDIA_SETTINGS_FORM_IDS.storage,
  labelSetKey: LABEL_SET_KEY,
  fields: [
    {
      key: "siteSpaceProfileId",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("storageSiteSpace", "Site Space"),
      description: label("storageSiteSpaceHint", "Where uploads into the site's own media go."),
      optionsProvider: profileChoices,
      validation: [{
        providerKey: PHI_FORM_VALIDATION_PROVIDER_KEYS.required,
        message: label("storageSiteSpaceRequired", "Choose where the site's own media is stored."),
      }],
    },
    {
      key: "defaultUserProfileId",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("storageDefaultUser", "New User Spaces"),
      description: label("storageDefaultUserHint", "Where a User Space created from now on writes. Existing User Spaces keep theirs."),
      placeholder: label("storageLocal", "Local storage"),
      optionsProvider: profileChoices,
    },
    {
      key: "defaultGroupProfileId",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: label("storageDefaultGroup", "New Group Spaces"),
      description: label("storageDefaultGroupHint", "Where a Group Space created from now on writes. Existing Group Spaces keep theirs."),
      placeholder: label("storageLocal", "Local storage"),
      optionsProvider: profileChoices,
    },
    {
      key: "allowedProfileIds",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
      label: label("storageAllowed", "Offered profiles"),
      description: label("storageAllowedHint", "The storage profiles a Space may be pointed at. Empty offers every profile."),
      placeholder: label("storageAll", "All profiles"),
      optionsProvider: profileChoices,
    },
    {
      key: "disabledProfileIds",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.multiSelect,
      label: label("storageDisabled", "Paused profiles"),
      description: label("storageDisabledHint", "A paused profile still delivers what it holds but takes no new uploads."),
      placeholder: label("storageNone", "None"),
      optionsProvider: profileChoices,
    },
  ],
  layout: PHI_MEDIA_SETTINGS_FORM_DESCRIPTOR.layout,
};

async function loadLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiMediaSettingsPageLabels } = await import("../../../components/media/media-settings-labels");
  const labels = await getPhiMediaSettingsPageLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    actions: { submitLabel: labels.submitLabel },
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

async function loadStorageLabels(
  context: Parameters<NonNullable<ReturnType<typeof definePhiRuntimeModuleForm>["loadLabels"]>>[0],
) {
  const { getPhiMediaSettingsPageLabels } = await import("../../../components/media/media-settings-labels");
  const labels = await getPhiMediaSettingsPageLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: context.runtime.locale.current,
  });
  return flattenPhiFormLabels({
    actions: { submitLabel: labels.submitLabel },
    storageSiteSpace: labels.storage.siteSpace,
    storageSiteSpaceHint: labels.storage.siteSpaceHint,
    storageSiteSpaceRequired: labels.storage.siteSpaceRequired,
    storageDefaultUser: labels.storage.defaultUser,
    storageDefaultUserHint: labels.storage.defaultUserHint,
    storageDefaultGroup: labels.storage.defaultGroup,
    storageDefaultGroupHint: labels.storage.defaultGroupHint,
    storageLocal: labels.storage.local,
    storageAllowed: labels.storage.allowed,
    storageAllowedHint: labels.storage.allowedHint,
    storageAll: labels.storage.all,
    storageDisabled: labels.storage.disabled,
    storageDisabledHint: labels.storage.disabledHint,
    storageNone: labels.storage.none,
  });
}

export const PHI_MEDIA_STORAGE_SETTINGS_RUNTIME_MODULE_FORM = definePhiRuntimeModuleForm({
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  areas: ["admin"],
  formId: PHI_MEDIA_SETTINGS_FORM_IDS.storage,
  version: 1,
  flags: 0,
  title: "Media storage settings",
  description: "Which storage profile the site's Spaces write to, which are offered, and which are paused.",
  category: "forms",
  tags: ["settings", "media", "storage", "admin"],
  descriptor: PHI_MEDIA_STORAGE_SETTINGS_FORM_DESCRIPTOR,
  submitHandlerKey: PHI_MEDIA_SETTINGS_FORM_HANDLER_KEYS.storage,
  loadLabels: loadStorageLabels,
});

export const PHI_MEDIA_STORAGE_SETTINGS_FORM_HANDLER_PROVIDER_DESCRIPTOR = {
  key: createPhiSharedFormProviderKey("handler", "asset-media-storage-settings"),
  ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
  title: "Admin media storage settings",
  phase: "submit",
  handlerKey: PHI_MEDIA_SETTINGS_FORM_HANDLER_KEYS.storage,
  category: "site",
  transport: "relay",
  method: "PATCH",
  endpointKey: null,
  upstreamPath: "/api/site/admin/media/storage",
  csrfPath: null,
  requiresCsrf: false,
  credentialPolicy: "site-session",
} satisfies PhiFormHandlerProviderDescriptor;

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
