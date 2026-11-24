import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS, PHI_ASSET_RUNTIME_MODULE_ID } from "../ids";
import { PHI_MEDIA_SETTINGS_FORM_IDS } from "../settings-forms";
import { getPhiMediaSettingsPageLabels } from "../../../../components/media/media-settings-labels";
import { getResolvedSiteMediaSettings } from "../../../../gateway/site-media-settings";
import type { PhiSiteMediaStorageSettings } from "../../../../gateway/site-media-storage-reader";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { buildPhiSettingsPageShellTree } from "../../../../components/regions/presets/phi-settings-page-shell-tree";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import { PHI_STORAGE_SIZE_UNIT_LABEL, phiBytesToStorageSize } from "../../../../components/forms/storage-size";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../components/widgets/label-sets/runtime-options";

function formatMegabytes(bytes: number | null | undefined) {
  const size = phiBytesToStorageSize(bytes);
  return size == null ? "—" : `${size} ${PHI_STORAGE_SIZE_UNIT_LABEL}`;
}

function readDefaultChoice(id: number | null, storage: PhiSiteMediaStorageSettings) {
  const chosen = id ?? storage.profiles.find((profile) => profile.local)?.id;
  return chosen == null ? null : String(chosen);
}

const SYNTHETIC_MEDIA_SETTINGS_REGION_IDS = {
  regionContent: -473,
} as const;

export async function buildPhiDefaultAdminMediaSettingsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const [labels, settings] = await Promise.all([
    getPhiMediaSettingsPageLabels(buildPhiWidgetLabelTranslatorOptions(runtime)),
    getResolvedSiteMediaSettings({
      apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
      internalToken: readPhiServerApiCredentials().internalToken,
      siteKey: runtime.site.key,
    }),
  ]);

  /*
   * The Spaces that exist, per kind, with the Profile each writes to and its own quota. The Profiles are
   * this Site's, so their names and the choices of the profile cell are set here (`valueMap`,
   * `editor.options`) rather than in the resource, which is the same on every Site. Offered only for a kind
   * the Site's Modules activate, and only among the offered Profiles where the Site restricts them.
   */
  const offered = settings.storage.allowedProfileIds.length > 0
    ? settings.storage.profiles.filter((profile) => settings.storage.allowedProfileIds.includes(profile.id))
    : settings.storage.profiles;
  const profileNames = Object.fromEntries(
    settings.storage.profiles.map((profile) => [String(profile.id), `${profile.key} (${profile.providerId})`]),
  );
  const profileChoices = offered.map((profile) => ({ value: String(profile.id), label: profileNames[String(profile.id)]! }));
  const buildSpacesTable = (nodeKey: string, resourceKey: string, label: string, withEmail: boolean) => ({
    nodeKey,
    typeKey: "table",
    label,
    config: {
      source: { providerKey: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaStorageSpaces, resourceKey },
      presentation: {
        controlSize: "small",
        borders: true,
        layout: { mode: "auto", overflowX: "auto" },
        columns: [
          { key: "owner", fieldKey: "owner", title: labels.spaces.owner, sizing: { mode: "fill", minWidth: 180 } },
          ...(withEmail ? [{ key: "email", fieldKey: "email", title: labels.spaces.email, sizing: { mode: "content" } }] : []),
          {
            key: "storageProfileId",
            fieldKey: "storageProfileId",
            title: labels.spaces.profile,
            valueMap: profileNames,
            editor: { control: "select", options: profileChoices },
            sizing: { mode: "content" },
          },
          {
            key: "quotaMegabytes",
            fieldKey: "quotaMegabytes",
            title: labels.spaces.quota,
            description: labels.spaces.quotaHint,
            editor: { prefix: PHI_STORAGE_SIZE_UNIT_LABEL },
            sizing: { mode: "content" },
            align: "right",
          },
          { key: "effectiveQuotaMegabytes", fieldKey: "effectiveQuotaMegabytes", title: labels.spaces.effective, sizing: { mode: "content" }, align: "right" },
          { key: "usedMegabytes", fieldKey: "usedMegabytes", title: labels.spaces.used, sizing: { mode: "content" }, align: "right" },
        ],
        emptyState: { title: labels.spaces.empty },
        footer: {
          template: labels.spaces.footer,
          values: [{ key: "spaces", value: { source: "core", fieldKey: "totalRows" } }],
          align: "start",
        },
      },
      features: {
        search: { enabled: true, placeholder: labels.spaces.search, debounceMs: 250 },
        pagination: { enabled: true, pageSize: 25, pageSizes: [25, 50, 100] },
        sorting: { mode: "none" },
        editing: { mode: "cell" },
        tools: { mode: "self-contained", reset: false, reload: true },
      },
    },
  });

  const spaceTables = [
    ...(settings.userSpacesEnabled ? [buildSpacesTable("widgetUserSpacesTable", "userSpaces", labels.spaces.userTable, true)] : []),
    ...(settings.groupSpacesEnabled ? [buildSpacesTable("widgetGroupSpacesTable", "groupSpaces", labels.spaces.groupTable, false)] : []),
  ];

  const tree = buildPhiSettingsPageShellTree({
    page,
    ownerModuleId: PHI_ASSET_RUNTIME_MODULE_ID,
    presetKey: "admin-media-settings-page",
    regionId: SYNTHETIC_MEDIA_SETTINGS_REGION_IDS.regionContent,
    label: labels.pageTitle,
    panels: [
      {
        nodeKey: "panelMedia",
        title: labels.intro.title,
        description: labels.intro.description,
        sections: [{
          kind: "form",
          nodeKey: "widgetMediaForm",
          formId: PHI_MEDIA_SETTINGS_FORM_IDS.general,
          label: labels.intro.title,
          initialValues: {
            defaultUserQuotaBytes: settings.defaultUserQuotaBytes,
            defaultGroupQuotaBytes: settings.defaultGroupQuotaBytes,
            defaultAddonQuotaBytes: settings.defaultAddonQuotaBytes,
            maxUserQuotaBytes: settings.maxUserQuotaBytes,
            maxGroupQuotaBytes: settings.maxGroupQuotaBytes,
            maxAddonQuotaBytes: settings.maxAddonQuotaBytes,
            maxObjectBytes: settings.maxObjectBytes,
          },
        }],
      },
      {
        nodeKey: "panelStorage",
        title: labels.storage.title,
        description: labels.storage.description,
        sections: [{
          kind: "form",
          nodeKey: "widgetStorageForm",
          formId: PHI_MEDIA_SETTINGS_FORM_IDS.storage,
          label: labels.storage.title,
          /*
           * As the choices carry them: a Profile id as text. An unset default is the Site's Local Profile,
           * which is itself one of the choices -- so it is shown as that choice rather than as an empty
           * field, and choosing it again is a choice like any other instead of a clear the form drops.
           */
          initialValues: {
            siteSpaceProfileId: String(settings.storage.siteSpaceProfileId),
            defaultUserProfileId: readDefaultChoice(settings.storage.defaultUserProfileId, settings.storage),
            defaultGroupProfileId: readDefaultChoice(settings.storage.defaultGroupProfileId, settings.storage),
            allowedProfileIds: settings.storage.allowedProfileIds.map(String),
            disabledProfileIds: settings.storage.profiles.filter((profile) => profile.disabled).map((profile) => String(profile.id)),
          },
        }],
      },
      // Only where the Site's Modules activate a delegated kind: otherwise there is no Space to list.
      ...(spaceTables.length > 0 ? [{
        nodeKey: "panelSpaces",
        title: labels.spaces.title,
        description: labels.spaces.description,
        sections: spaceTables,
      }] : []),
      {
        nodeKey: "panelTechnical",
        title: labels.technical.title,
        description: labels.technical.description,
        sections: [{
          nodeKey: "widgetTechnical",
          typeKey: "description",
          label: labels.technical.title,
          config: {
            /*
             * The words and the values apart: the words come from the label set, the values never pass a
             * translator. Sizes in megabytes, as the quota fields above state them.
             */
            asideItems: [
              // Reported, not offered: availability follows from the Modules this Site activates.
              {
                text: `${labels.fields.userSpacesEnabled}: %1`,
                values: [settings.userSpacesEnabled ? labels.availability.available : labels.availability.unavailable],
              },
              {
                text: `${labels.fields.groupSpacesEnabled}: %1`,
                values: [settings.groupSpacesEnabled ? labels.availability.available : labels.availability.unavailable],
              },
              /*
               * The Add-on stores, named so they can be sized, one entry each below their heading.
               *
               * An Add-on Space appears in no Space listing and belongs to nobody, so this is the only
               * place an administrator learns one exists and what it costs. The id is here because it is
               * the address the per-Space route takes: the Site default is set above, and departing from
               * it for one Add-on needs a Space to point at.
               */
              settings.addonSpaces.length === 0
                ? { text: `${labels.addonSpaces.title}: %1`, values: [labels.addonSpaces.empty] }
                : { text: labels.addonSpaces.title },
              ...settings.addonSpaces.map((space) => ({
                text: "%1 (#%2): %3 / %4",
                level: 2,
                values: [space.addonId, String(space.spaceId), formatMegabytes(space.usedBytes), formatMegabytes(space.quotaBytes)],
              })),
            ],
            // Facts in a panel, not cards on a page: bare entries on the panel's own ground.
            asideList: { itemSurface: null },
          },
        }],
      },
    ],
  });

  return {
    ...tree,
    pageMeta: {
      title: { msgId: 0, source: "Media", value: labels.pageTitle },
      description: {
        msgId: 0,
        source: "Configure Media Space availability and default quotas for this site.",
        value: labels.pageDescription,
      },
    },
  };
}
