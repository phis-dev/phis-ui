import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiWidgetInertPreview } from "../../../../../components/widgets/built-in/widget-preview";
import { resolveMarkdownRenderData } from "../../../../../components/widgets/shared/markdown-render";
import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import { readPhiMarkdownSearchText, translatePhiSearchWidgetTexts } from "../../../../../server-helpers/search-text";
import { resolvePhiWidgetRecordField } from "../../../../../server-helpers/record-fields";
import { PhiMarkdownWidget } from "./server";
import {
  PHI_MARKDOWN_WIDGET_DEFINITION,
  PHI_MARKDOWN_WIDGET_PLUGIN_TYPE,
  type PhiCmsMarkdownWidgetConfig,
} from "./config";

export const PHI_MARKDOWN_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsMarkdownWidgetConfig> = {
  ...PHI_MARKDOWN_WIDGET_DEFINITION,
  /*
   * The document as the render would draw it -- inline, from its record, or fetched from its address --
   * translated for the index's language, read back as lines (SEARCH.md). A source that cannot be read
   * contributes nothing rather than failing the Page: the render shows the error in its place.
   */
  searchText: async ({ widget, config, runtime }) => {
    const data = await resolveMarkdownRenderData({
      ...config,
      widgetId: widget.id,
      resolvedContent: widget.resolvedContent ?? null,
      translate: !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate),
    }, runtime);
    if ("error" in data) return [];
    const eyebrow = await translatePhiSearchWidgetTexts(runtime, [config.eyebrow], {
      translate: !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate),
    });
    return [...eyebrow, ...readPhiMarkdownSearchText(data.blocks)];
  },
  render: async ({ widget, config, runtime, registry }) => {
    /*
     * A field of the page record takes the text's place: inline, in the page's language already, and
     * nothing where the record does not have it.
     */
    const recordField = await resolvePhiWidgetRecordField({ registry, runtime, key: config.recordField, kinds: ["markdown", "text"] });
    if (recordField.bound) {
      return recordField.field?.value.trim()
        ? (
          <PhiMarkdownWidget
            key={`widget-${widget.id}`}
            config={{ ...config, widgetId: widget.id, sourceMode: "inline", markdown: recordField.field.value, resolvedContent: null, translate: false }}
            runtime={runtime}
          />
        )
        : null;
    }
    return (
      <PhiMarkdownWidget
        key={`widget-${widget.id}`}
        config={{
          ...config,
          widgetId: widget.id,
          resolvedContent: widget.resolvedContent ?? null,
          translate: !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate),
        }}
        runtime={runtime}
      />
    );
  },
  renderPreview: ({ widget, config, runtime }) => (
    <PhiWidgetInertPreview>
      <PhiMarkdownWidget
        key={`widget-preview-${widget.id}`}
        config={{
          ...config,
          widgetId: widget.id,
          resolvedContent: widget.resolvedContent ?? null,
          renderMode: "preview",
        }}
        runtime={runtime}
      />
    </PhiWidgetInertPreview>
  ),
};

export { PHI_MARKDOWN_WIDGET_PLUGIN_TYPE };
