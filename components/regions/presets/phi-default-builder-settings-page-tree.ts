import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/builder/ids";
import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { getPhiBuilderSettingsPageLabels } from "./builder-settings-label-set";
import { buildPhiSettingsPageShellTree } from "./phi-settings-page-shell-tree";

const SYNTHETIC_BUILDER_SETTINGS_REGION_IDS = {
  regionContent: -583,
} as const;

const PHI_BUILDER_SETTINGS_AREA: PhiCmsAreaKey = "builder";

/**
 * The Builder area's General Settings page (SETTINGS.md section 5). The Builder base Module owns no
 * configuration of its own yet, so the page carries only the read-only Technical panel; further
 * panels are added here once Builder configuration exists. Modules contribute their own Settings
 * pages through the `settings` mount and are unaffected by this page's content.
 */
export async function buildPhiDefaultBuilderSettingsPageTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const labels = await getPhiBuilderSettingsPageLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  const tree = buildPhiSettingsPageShellTree({
    page,
    ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
    presetKey: "builder-settings-general-page",
    regionId: SYNTHETIC_BUILDER_SETTINGS_REGION_IDS.regionContent,
    label: labels.pageTitle,
    panels: [
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
              `${labels.fields.siteKey}: ${runtime.site.key}`,
              `${labels.fields.area}: ${PHI_BUILDER_SETTINGS_AREA}`,
              `${labels.fields.baseModule}: ${PHI_BUILDER_RUNTIME_MODULE_ID}`,
              `${labels.fields.settingsPath}: ${page.path}`,
            ],
          },
        }],
      },
    ],
  });

  return {
    ...tree,
    pageMeta: {
      title: { msgId: 0, source: "General", value: labels.pageTitle },
      description: null,
    },
  };
}
