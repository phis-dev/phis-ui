import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import { translatePhiSearchWidgetTexts } from "../../../../../server-helpers/search-text";
import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiDescriptionWidget } from "./server";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import {
  PHI_DESCRIPTION_WIDGET_DEFINITION,
  PHI_DESCRIPTION_WIDGET_PLUGIN_TYPE,
  type PhiCmsDescriptionWidgetConfig,
} from "./config";

export const PHI_DESCRIPTION_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsDescriptionWidgetConfig> = {
  ...PHI_DESCRIPTION_WIDGET_DEFINITION,
  // Every sentence the render draws, translated the way it translates them: a Preset's globally, an author's for the Site.
  searchText: ({ widget, config, runtime }) => translatePhiSearchWidgetTexts(
    runtime,
    [
      config.eyebrow,
      config.title,
      config.description,
      config.asideTitle,
      ...(config.asideItems ?? []).map((item) => item.text),
      config.footer,
    ],
    { translate: !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate), textSource: config.textSource },
  ),
  render: ({ widget, config, runtime }) => (
    <PhiDescriptionWidget
      key={`widget-${widget.id}`}
      labels={{
        eyebrow: config.eyebrow,
        title: config.title,
        description: config.description,
        asideTitle: config.asideTitle,
        asideItems: config.asideItems,
        footer: config.footer,
      }}
      config={config}
      translate={!hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)}
      runtime={runtime}
    />
  ),
  renderPreview: ({ widget, config }) => (
    <PhiRuntimeModuleRenderClientHost
      key={`widget-preview-${widget.id}`}
      type={PhiCmsWidgetType.Description}
      componentProps={{
        labels: {
          eyebrow: config.eyebrow,
          title: config.title,
          description: config.description,
          asideTitle: config.asideTitle,
          asideItems: config.asideItems,
          footer: config.footer,
        },
        config: { tone: config.tone, asideList: config.asideList },
      }}
    />
  ),
};

export { PHI_DESCRIPTION_WIDGET_PLUGIN_TYPE };
