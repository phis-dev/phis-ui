import { PHI_ASSET_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/asset/ids";
import { PHI_MEDIA_SETTINGS_FORM_IDS } from "../../media/media-settings-forms";
import { getPhiMediaSettingsPageLabels } from "../../media/media-settings-labels";
import { getResolvedSiteMediaSettings } from "../../../gateway/site-media-settings";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { buildPhiSettingsPageShellTree } from "./phi-settings-page-shell-tree";

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
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      locale: runtime.locale.current,
    }),
    getResolvedSiteMediaSettings({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
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
          submitLabel: labels.submitLabel,
          initialValues: {
            defaultUserQuotaBytes: settings.defaultUserQuotaBytes,
            defaultGroupQuotaBytes: settings.defaultGroupQuotaBytes,
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
            asideItems: [
              // Reported, not offered: availability follows from the Modules this Site activates.
              `${labels.fields.userSpacesEnabled}: ${settings.userSpacesEnabled ? labels.availability.available : labels.availability.unavailable}`,
              `${labels.fields.groupSpacesEnabled}: ${settings.groupSpacesEnabled ? labels.availability.available : labels.availability.unavailable}`,
              `${labels.fields.maxObjectBytes}: ${settings.maxObjectBytes}`,
            ],
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
