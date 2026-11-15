import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import { translatePhiSearchWidgetTexts } from "../../../../../server-helpers/search-text";
import { formatPhiRecordFieldText, PHI_RECORD_TEXT_FIELD_KINDS } from "../../../../../helpers/record-fields";
import { resolvePhiWidgetRecordField } from "../../../../../server-helpers/record-fields";
import { PhiSimpleTextWidget } from "./server";
import {
  PHI_SIMPLE_TEXT_WIDGET_DEFINITION,
  PHI_SIMPLE_TEXT_WIDGET_PLUGIN_TYPE,
  resolvePhiSimpleTextWidgetText,
  type PhiCmsSimpleTextWidgetConfig,
} from "./config";

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
  render: async ({ widget, config, runtime, registry }) => {
    const noTranslate = hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate);
    // A record's text is already translated; only the Widget's own still has to be.
    const hasResolvedText = Boolean(widget.resolvedContent?.textFields.text);
    /*
     * A field of the page record takes the text's place, in the page's language already. A record
     * without the field leaves nothing to show; a Page about no record shows the Widget's own text.
     */
    const recordField = await resolvePhiWidgetRecordField({ registry, runtime, key: config.recordField, kinds: PHI_RECORD_TEXT_FIELD_KINDS });
    if (recordField.bound) {
      const text = recordField.field ? formatPhiRecordFieldText(recordField.field, runtime.locale.current) : "";
      return text
        ? <PhiSimpleTextWidget blockId={widget.id} key={`widget-${widget.id}`} translate={false} labels={{ text }} config={config} runtime={runtime} />
        : null;
    }

    return (
      <PhiSimpleTextWidget
        blockId={widget.id}
        key={`widget-${widget.id}`}
        translate={!noTranslate && !hasResolvedText}
        textSource={config.textSource}
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
  renderPreview: ({ widget, config, runtime }) => (
    <PhiSimpleTextWidget
      blockId={widget.id}
      key={`widget-preview-${widget.id}`}
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
