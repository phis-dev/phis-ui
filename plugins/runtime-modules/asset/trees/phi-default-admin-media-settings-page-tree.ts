import { PHI_ASSET_RUNTIME_MODULE_ID } from "../ids";
import { PHI_MEDIA_SETTINGS_FORM_IDS } from "../settings-forms";
import { getPhiMediaSettingsPageLabels } from "../../../../components/media/media-settings-labels";
import { getResolvedSiteMediaSettings } from "../../../../gateway/site-media-settings";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { buildPhiSettingsPageShellTree } from "../../../../components/regions/presets/phi-settings-page-shell-tree";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import { PHI_STORAGE_SIZE_UNIT_LABEL, phiBytesToStorageSize } from "../../../../components/forms/storage-size";

function formatMegabytes(bytes: number | null | undefined) {
  const size = phiBytesToStorageSize(bytes);
  return size == null ? "—" : `${size} ${PHI_STORAGE_SIZE_UNIT_LABEL}`;
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
    getPhiMediaSettingsPageLabels({
      apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
      internalToken: readPhiServerApiCredentials().internalToken,
      locale: runtime.locale.current,
    }),
    getResolvedSiteMediaSettings({
      apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
      internalToken: readPhiServerApiCredentials().internalToken,
      siteKey: runtime.site.key,
    }),
  ]);

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
