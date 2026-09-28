import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PHI_BUTTON_WIDGET_DEFINITION, type PhiButtonWidgetConfig } from "./config";
import { getPhiCommonControlLabelsForRuntime } from "../../../../../components/widgets/label-sets/common-controls";
import { resolvePhiLinkHref } from "../../../../../helpers/link-target";
import { trBulkForLocale } from "../../../../../server-helpers/translate";
import type { PhiBlockRuntime } from "../../../../../types";

/**
 * The Button's own words in the reader's language.
 *
 * Every Widget translates the text written into it itself; nothing does it for them on the way in. The
 * common control labels beside it are a global label set and arrive translated already.
 */
async function translatePhiButtonConfig(
  config: PhiButtonWidgetConfig,
  runtime: PhiBlockRuntime,
): Promise<PhiButtonWidgetConfig> {
  if (config.translate === false) return config;
  const entries = ([["label", config.label], ["tooltip", config.tooltip]] as const)
    .filter((entry): entry is readonly ["label" | "tooltip", string] => Boolean(entry[1]?.trim()));
  if (entries.length === 0) return config;
  const translated = await trBulkForLocale(runtime.locale.current, entries.map(([, text]) => text));
  return {
    ...config,
    ...Object.fromEntries(entries.map(([key, text], index) => [key, translated[index]?.trim() || text])),
  };
}

export const PHI_BUTTON_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiButtonWidgetConfig> = {
  ...PHI_BUTTON_WIDGET_DEFINITION,
  /*
   * The target is resolved here and the address travels, not the reference. A Page reference means
   * nothing in a browser -- which address it answers on is the server's to know, and it resolved every
   * target on this page in one pass before anything drew.
   */
  render: async ({ widget, config, runtime, links }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Button}
      componentProps={{
        blockId: widget.id,
        config: await translatePhiButtonConfig(config, runtime),
        labels: await getPhiCommonControlLabelsForRuntime(runtime),
        link: resolvePhiLinkHref(config.linkTarget, links),
      }}
    />
  ),
  renderPreview: async ({ widget, config, runtime, links }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Button}
      componentProps={{
        blockId: widget.id,
        config: await translatePhiButtonConfig(config, runtime),
        labels: await getPhiCommonControlLabelsForRuntime(runtime),
        link: resolvePhiLinkHref(config.linkTarget, links),
        disabled: true,
        signalsEnabled: false,
      }}
    />
  ),
};
