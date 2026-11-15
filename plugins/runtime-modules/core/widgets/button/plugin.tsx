import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PHI_BUTTON_WIDGET_DEFINITION, type PhiButtonWidgetConfig } from "./config";
import { getPhiCommonControlLabelsForRuntime } from "../../../../../components/widgets/label-sets/common-controls";
import { isPhiExternalHref } from "../../../../../helpers/external-href";
import { resolvePhiLinkHref } from "../../../../../helpers/link-target";
import { trBulkForLocale } from "../../../../../server-helpers/translate";
import { resolvePhiWidgetRecordField } from "../../../../../server-helpers/record-fields";
import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiRecordLink } from "../../../../../types/record-provider";

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
 * What the page record says of the Button, where it names a field for its value or its link: a Button on
 * a template sends what the record it stands beside is called and leads where that record leads, not a
 * value or a target frozen into the Page. A record without a field the Button names leaves it without
 * that part of its own, so it is not drawn.
 */
async function resolvePhiButtonRecordConfig(
  config: PhiButtonWidgetConfig,
  runtime: PhiBlockRuntime,
  registry: Parameters<typeof resolvePhiWidgetRecordField>[0]["registry"],
): Promise<{ config: PhiButtonWidgetConfig; link: PhiRecordLink | null } | null> {
  const valueField = await resolvePhiWidgetRecordField({ registry, runtime, key: config.valueRecordField, kinds: ["text"] });
  const linkField = await resolvePhiWidgetRecordField({ registry, runtime, key: config.linkRecordField, kinds: ["link"] });
  if (valueField.bound && !valueField.field?.value) return null;
  if (linkField.bound && !linkField.field) return null;
  return {
    config: valueField.bound && valueField.field ? { ...config, value: valueField.field.value } : config,
    link: linkField.bound && linkField.field ? linkField.field.value : null,
  };
}

export const PHI_BUTTON_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiButtonWidgetConfig> = {
  ...PHI_BUTTON_WIDGET_DEFINITION,
  /*
   * The target is resolved here and the address travels, not the reference. A Page reference means
   * nothing in a browser -- which address it answers on is the server's to know, and it resolved every
   * target on this page in one pass before anything drew.
   */
  render: async ({ widget, config: stored, runtime, links, registry }) => {
    const bound = await resolvePhiButtonRecordConfig(stored, runtime, registry);
    if (!bound) return null;
    const { link: recordLink } = bound;
    const translated = await translatePhiButtonConfig(bound.config, runtime, !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate));
    /* The record's words stand in for an empty label only, and are the record's own: not translated. */
    const config = recordLink?.label && !translated.label?.trim() ? { ...translated, label: recordLink.label } : translated;
    return (
      <PhiRuntimeModuleRenderClientHost
        type={PhiCmsWidgetType.Button}
        componentProps={{
          blockId: widget.id,
          config,
          labels: await getPhiCommonControlLabelsForRuntime(runtime),
          link: recordLink
            ? { href: recordLink.href, newTab: false, external: isPhiExternalHref(recordLink.href) }
            : resolvePhiLinkHref(bound.config.linkTarget, links),
        }}
      />
    );
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
