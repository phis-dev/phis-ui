import { PHI_ADMIN_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/admin/ids";
import { PHI_ADMIN_SETTINGS_FORM_IDS } from "../../../plugins/runtime-modules/admin/forms";
import { getResolvedSiteAdminSettings } from "../../../gateway/site-settings";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { getPhiAdminSettingsWidgetLabels } from "../../widgets/label-sets/admin-settings";
import { getPhiAdminSettingsPageLabels } from "./admin-settings-label-set";
import { buildPhiSettingsPageShellTree } from "./phi-settings-page-shell-tree";

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
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  };
  const [pageLabels, labels, settings] = await Promise.all([
    getPhiAdminSettingsPageLabels(labelOptions),
    getPhiAdminSettingsWidgetLabels(labelOptions),
    getResolvedSiteAdminSettings({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
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
          submitLabel: labels.submitLabel,
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
            asideItems: [
              `${labels.fields.siteKey}: ${settings.key}`,
              `${labels.fields.mailFrom}: ${settings.mailFrom || "—"}`,
              `${labels.fields.mailFromName}: ${settings.mailFromName || "—"}`,
              `${labels.fields.contactRecipient}: ${settings.contactRecipient || "—"}`,
            ],
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
