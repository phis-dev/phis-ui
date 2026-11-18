import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import { translatePhiSearchWidgetTexts } from "../../../../../server-helpers/search-text";
import { formatPhiRecordFieldText, PHI_RECORD_TEXT_FIELD_KINDS } from "../../../../../helpers/record-fields";
import { resolvePhiWidgetRecordField } from "../../../../../server-helpers/record-fields";
import { isPhiExternalHref } from "../../../../../helpers/external-href";
import { resolvePhiLinkHref } from "../../../../../helpers/link-target";
import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiResolvedLinkTargets } from "../../../../../types/references";
import type { PhiSimpleTextWidgetLink } from "./client";
import { PhiSimpleTextWidget } from "./server";
import {
  PHI_SIMPLE_TEXT_WIDGET_DEFINITION,
  PHI_SIMPLE_TEXT_WIDGET_PLUGIN_TYPE,
  resolvePhiSimpleTextWidgetText,
  type PhiCmsSimpleTextWidgetConfig,
} from "./config";

/**
 * Where the text leads, resolved here so the address travels and not the reference.
 *
 * A link field of the page record wins over the stored target, as on the Button. Where the record lacks
 * that field the text stays and leads nowhere: unlike a Button, a text without its link still has its
 * words to show. A Page target that did not resolve -- deleted, unpublished, its Module off -- is no
 * link either (`REFERENCES.md`).
 */
export async function resolvePhiSimpleTextLink(
  config: Pick<PhiCmsSimpleTextWidgetConfig, "linkTarget" | "linkRecordField">,
  runtime: PhiBlockRuntime,
  registry: Parameters<typeof resolvePhiWidgetRecordField>[0]["registry"],
  links: PhiResolvedLinkTargets | null | undefined,
): Promise<PhiSimpleTextWidgetLink | null> {
  const linkField = await resolvePhiWidgetRecordField({ registry, runtime, key: config.linkRecordField, kinds: ["link"] });
  if (linkField.bound) {
    const href = linkField.field?.value.href;
    return href ? { href, newTab: false, external: isPhiExternalHref(href) } : null;
  }
  return resolvePhiLinkHref(config.linkTarget, links);
}

export const PHI_SIMPLE_TEXT_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsSimpleTextWidgetConfig> = {
  ...PHI_SIMPLE_TEXT_WIDGET_DEFINITION,
  // The text as the render shows it: a record's already in the page's language, the Widget's own translated here.
  searchText: ({ widget, config, runtime }) => {
    const noTranslate = hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate);
    const hasResolvedText = Boolean(widget.resolvedContent?.textFields.text);
    const text = resolvePhiSimpleTextWidgetText(
      { ...config, resolvedContent: widget.resolvedContent ?? null },
      { preferSource: noTranslate },
      "",
    );
    return translatePhiSearchWidgetTexts(runtime, [text], {
      translate: !noTranslate && !hasResolvedText,
      textSource: config.textSource,
    });
  },
  render: async ({ widget, config, runtime, registry, links }) => {
    const link = await resolvePhiSimpleTextLink(config, runtime, registry, links);
    const noTranslate = hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate);
    // A record's text is already translated; only the Widget's own still has to be.
    const hasResolvedText = Boolean(widget.resolvedContent?.textFields.text);
    /*
     * A field of the page record takes the text's place, in the page's language already. A record
     * without the field leaves nothing to show; a Page about no record shows the Widget's own text.
     */
    const recordField = await resolvePhiWidgetRecordField({ registry, runtime, key: config.recordField, kinds: PHI_RECORD_TEXT_FIELD_KINDS });
    if (recordField.bound) {
      const text = recordField.field ? formatPhiRecordFieldText(recordField.field, runtime.locale.current, runtime.site.timeZone) : "";
      return text
        ? <PhiSimpleTextWidget blockId={widget.id} key={`widget-${widget.id}`} translate={false} labels={{ text }} config={config} link={link} runtime={runtime} />
        : null;
    }

    return (
      <PhiSimpleTextWidget
        blockId={widget.id}
        key={`widget-${widget.id}`}
        translate={!noTranslate && !hasResolvedText}
        textSource={config.textSource}
        link={link}
        labels={{
          text: resolvePhiSimpleTextWidgetText(
            {
              ...config,
              label: widget.label ?? undefined,
              resolvedContent: widget.resolvedContent ?? null,
            },
            {
              preferSource: noTranslate,
              preferConfigText: config.renderMode === "preview" || config.renderMode === "editor",
            },
            "Text",
          ),
        }}
        config={config}
        runtime={runtime}
      />
    );
  },
  renderPreview: async ({ widget, config, runtime, registry, links }) => (
    <PhiSimpleTextWidget
      blockId={widget.id}
      key={`widget-preview-${widget.id}`}
      link={await resolvePhiSimpleTextLink(config, runtime, registry, links)}
      labels={{
        text: resolvePhiSimpleTextWidgetText(
          {
            ...config,
            label: widget.label ?? undefined,
            resolvedContent: widget.resolvedContent ?? null,
          },
          {
            preferConfigText: true,
          },
          "Text",
        ),
      }}
      config={{
        ...config,
        renderMode: "preview",
      }}
      runtime={runtime}
    />
  ),
};
export { PHI_SIMPLE_TEXT_WIDGET_PLUGIN_TYPE };
