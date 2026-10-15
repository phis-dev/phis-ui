import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import type { PhiBlockRuntime, PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { trBulkForLocale } from "../../../../../server-helpers/translate";
import { PHI_TIMELINE_WIDGET_DEFINITION, type PhiTimelineWidgetConfig } from "./config";

const PHI_TIMELINE_TRANSLATED_FIELDS = ["time", "title", "content"] as const;

/**
 * The entries' own words in the reader's language. The time is among them: an author writes "Yesterday"
 * or "Spring 2026" as often as a date, and a date that needs no translation comes back as it went.
 */
async function translatePhiTimelineConfig(
  config: PhiTimelineWidgetConfig,
  runtime: PhiBlockRuntime,
  translate: boolean,
): Promise<PhiTimelineWidgetConfig> {
  if (!translate || config.entries.length === 0) return config;
  const texts = config.entries.flatMap((entry) => PHI_TIMELINE_TRANSLATED_FIELDS.map((field) => entry[field] ?? ""));
  const translated = await trBulkForLocale(runtime.locale.current, texts);
  const width = PHI_TIMELINE_TRANSLATED_FIELDS.length;
  return {
    ...config,
    entries: config.entries.map((entry, index) => {
      const next = { ...entry };
      PHI_TIMELINE_TRANSLATED_FIELDS.forEach((field, offset) => {
        const source = entry[field];
        if (source) next[field] = translated[index * width + offset]?.trim() || source;
      });
      return next;
    }),
  };
}

export const PHI_TIMELINE_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiTimelineWidgetConfig> = {
  ...PHI_TIMELINE_WIDGET_DEFINITION,
  render: async ({ widget, config, runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Timeline}
      componentProps={{
        blockId: widget.id,
        config: await translatePhiTimelineConfig(config, runtime, !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)),
      }}
    />
  ),
  renderPreview: async ({ widget, config, runtime }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Timeline}
      componentProps={{
        blockId: widget.id,
        config: await translatePhiTimelineConfig(config, runtime, !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)),
      }}
    />
  ),
};
