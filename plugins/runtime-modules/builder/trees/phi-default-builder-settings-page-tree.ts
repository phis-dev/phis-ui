import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../ids";
import type { PhiCmsAreaKey } from "../../../../constants/cms-areas";
import type { PhiCmsPageNode, PhiResolvedCmsPageTree } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { getPhiBuilderSettingsPageLabels } from "./builder-settings-label-set";
import { buildPhiSettingsPageShellTree } from "../../../../components/regions/presets/phi-settings-page-shell-tree";
import { readPhiServerApiCredentials } from "../../../../helpers/phis-server-credentials";

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
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
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
            // The words and the values apart: the words come from the label set, the values never pass a translator.
            asideItems: [
              { text: `${labels.fields.siteKey}: %1`, values: [runtime.site.key] },
              { text: `${labels.fields.area}: %1`, values: [PHI_BUILDER_SETTINGS_AREA] },
              { text: `${labels.fields.baseModule}: %1`, values: [PHI_BUILDER_RUNTIME_MODULE_ID] },
              { text: `${labels.fields.settingsPath}: %1`, values: [page.path] },
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
      title: { msgId: 0, source: "General", value: labels.pageTitle },
      description: null,
    },
  };
}
