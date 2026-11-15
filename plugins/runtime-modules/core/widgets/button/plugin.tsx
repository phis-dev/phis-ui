import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PHI_BUTTON_WIDGET_DEFINITION, type PhiButtonWidgetConfig } from "./config";
import { getPhiCommonControlLabelsForRuntime } from "../../../../../components/widgets/label-sets/common-controls";
import { resolvePhiLinkHref } from "../../../../../helpers/link-target";
import { trBulkForLocale } from "../../../../../server-helpers/translate";
import { resolvePhiWidgetRecordField } from "../../../../../server-helpers/record-fields";
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
  translate: boolean,
): Promise<PhiButtonWidgetConfig> {
  if (!translate) return config;
  const entries = ([["label", config.label], ["tooltip", config.tooltip]] as const)
    .filter((entry): entry is readonly ["label" | "tooltip", string] => Boolean(entry[1]?.trim()));
  if (entries.length === 0) return config;
  const translated = await trBulkForLocale(runtime.locale.current, entries.map(([, text]) => text));
  return {
    ...config,
    ...Object.fromEntries(entries.map(([key, text], index) => [key, translated[index]?.trim() || text])),
  };
}

/**
 * The signal value from the page record, where the Button names a field for it: a Button on a template
 * sends what the record it stands beside is called, not a value frozen into the Page. A record without
 * the field leaves the Button without a value of its own to send, so it is not drawn.
 */
async function resolvePhiButtonRecordConfig(
  config: PhiButtonWidgetConfig,
  runtime: PhiBlockRuntime,
  registry: Parameters<typeof resolvePhiWidgetRecordField>[0]["registry"],
): Promise<PhiButtonWidgetConfig | null> {
  const recordField = await resolvePhiWidgetRecordField({ registry, runtime, key: config.valueRecordField, kinds: ["text"] });
  if (!recordField.bound) return config;
  return recordField.field?.value ? { ...config, value: recordField.field.value } : null;
}

export const PHI_BUTTON_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiButtonWidgetConfig> = {
  ...PHI_BUTTON_WIDGET_DEFINITION,
  /*
   * The target is resolved here and the address travels, not the reference. A Page reference means
   * nothing in a browser -- which address it answers on is the server's to know, and it resolved every
   * target on this page in one pass before anything drew.
   */
  render: async ({ widget, config: stored, runtime, links, registry }) => {
    const config = await resolvePhiButtonRecordConfig(stored, runtime, registry);
    return config ? (
      <PhiRuntimeModuleRenderClientHost
        type={PhiCmsWidgetType.Button}
        componentProps={{
          blockId: widget.id,
          config: await translatePhiButtonConfig(config, runtime, !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)),
          labels: await getPhiCommonControlLabelsForRuntime(runtime),
          link: resolvePhiLinkHref(config.linkTarget, links),
        }}
      />
    ) : null;
  },
  renderPreview: async ({ widget, config, runtime, links }) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Button}
      componentProps={{
        blockId: widget.id,
        config: await translatePhiButtonConfig(config, runtime, !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)),
        labels: await getPhiCommonControlLabelsForRuntime(runtime),
        link: resolvePhiLinkHref(config.linkTarget, links),
        disabled: true,
        signalsEnabled: false,
      }}
    />
  ),
};
