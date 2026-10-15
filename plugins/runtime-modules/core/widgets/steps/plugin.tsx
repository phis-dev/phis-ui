import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import type { PhiBlockRuntime, PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { trBulkForLocale } from "../../../../../server-helpers/translate";
import { PHI_STEPS_WIDGET_DEFINITION, type PhiStepsWidgetConfig } from "./config";

/**
 * The steps' own words in the reader's language: each title and the line under it. The values stay as
 * they are -- they are what the steps send. Steps that follow a Stack take their titles from its slots
 * at runtime, and those are the Stack's to translate.
 */
async function translatePhiStepsConfig(
  config: PhiStepsWidgetConfig,
  runtime: PhiBlockRuntime,
  translate: boolean,
): Promise<PhiStepsWidgetConfig> {
  if (!translate || config.options.length === 0) return config;
  const texts = config.options.flatMap((option) => [option.label, option.description ?? ""]);
  const translated = await trBulkForLocale(runtime.locale.current, texts);
  return {
    ...config,
    options: config.options.map((option, index) => ({
      ...option,
      label: translated[index * 2]?.trim() || option.label,
      ...(option.description ? { description: translated[index * 2 + 1]?.trim() || option.description } : {}),
    })),
  };
}

export const PHI_STEPS_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiStepsWidgetConfig> = {
  ...PHI_STEPS_WIDGET_DEFINITION,
  render: async ({ widget, config, runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Steps}
      componentProps={{
        blockId: widget.id,
        config: await translatePhiStepsConfig(config, runtime, !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)),
      }}
    />
  ),
  renderPreview: async ({ widget, config, runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Steps}
      componentProps={{
        blockId: widget.id,
        config: await translatePhiStepsConfig(config, runtime, !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)),
        signalsEnabled: false,
      }}
    />
  ),
};
