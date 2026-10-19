import { PHI_ADMIN_RUNTIME_MODULE_ID } from "../ids";
import { PHI_ADMIN_SETTINGS_FORM_IDS } from "../forms";
import { getResolvedSiteAdminSettings } from "../../../../gateway/site-settings";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { getPhiAdminSettingsWidgetLabels } from "../../../../components/widgets/label-sets/admin-settings";
import { getPhiAdminSettingsPageLabels } from "./admin-settings-label-set";
import { buildPhiSettingsPageShellTree } from "../../../../components/regions/presets/phi-settings-page-shell-tree";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";
import { PHI_SURFACE_CARD } from "../../../../helpers/surface-presets";

const SYNTHETIC_ADMIN_SETTINGS_REGION_IDS = {
  regionContent: -471,
} as const;

export async function buildPhiDefaultAdminSettingsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labelOptions = {
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  };
  const [pageLabels, labels, settings] = await Promise.all([
    getPhiAdminSettingsPageLabels(labelOptions),
    getPhiAdminSettingsWidgetLabels(labelOptions),
    getResolvedSiteAdminSettings({
      apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
      internalToken: readPhiServerApiCredentials().internalToken,
      siteKey: runtime.site.key,
    }),
  ]);

  const tree = buildPhiSettingsPageShellTree({
    page,
    ownerModuleId: PHI_ADMIN_RUNTIME_MODULE_ID,
    presetKey: "admin-settings-general-page",
    regionId: SYNTHETIC_ADMIN_SETTINGS_REGION_IDS.regionContent,
    label: pageLabels.pageTitle,
    panels: [
      {
        nodeKey: "panelGeneral",
        title: labels.title,
        description: labels.description,
        sections: [{
          kind: "form",
          nodeKey: "widgetGeneralForm",
          formId: PHI_ADMIN_SETTINGS_FORM_IDS.general,
          label: labels.title,
          initialValues: {
            name: settings.name,
            hostname: settings.hostname,
            publicBaseUrl: settings.publicBaseUrl,
            supportEmail: settings.supportEmail,
          },
        }],
      },
      {
        nodeKey: "panelTechnical",
        title: labels.sections.technical.title,
        description: labels.sections.technical.description,
        sections: [{
          nodeKey: "widgetTechnical",
          typeKey: "description",
          label: labels.sections.technical.title,
          config: {
            // The words and the Site's values apart: the words come from the label set, the values never pass a translator.
            asideItems: [
              { text: `${labels.fields.siteKey}: %1`, values: [settings.key] },
              { text: `${labels.fields.mailFrom}: %1`, values: [settings.mailFrom || "—"] },
              { text: `${labels.fields.mailFromName}: %1`, values: [settings.mailFromName || "—"] },
              { text: `${labels.fields.contactRecipient}: %1`, values: [settings.contactRecipient || "—"] },
            ],
            asideList: { itemSurface: PHI_SURFACE_CARD },
          },
        }],
      },
    ],
  });

  return {
    ...tree,
    pageMeta: {
      title: { msgId: 0, source: "General", value: pageLabels.pageTitle },
      description: {
        msgId: 0,
        source: "Manage site identity and contact details for this site.",
        value: pageLabels.pageDescription,
      },
    },
  };
}
