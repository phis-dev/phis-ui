import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiWidgetInertPreview } from "../../../../../components/widgets/built-in/widget-preview";
import { resolveMarkdownRenderData } from "../../../../../components/widgets/shared/markdown-render";
import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { PhiRecordMarkdownFlag } from "../../../../../constants/record-field-kinds";
import { hasPhiFlag } from "../../../../../helpers/flags";
import { readPhiMarkdownSearchText, translatePhiSearchWidgetTexts } from "../../../../../server-helpers/search-text";
import { resolvePhiWidgetRecordField } from "../../../../../server-helpers/record-fields";
import { PhiMarkdownWidget } from "./server";
import { createPhiMarkdownTableEmbedResolver } from "./table-embeds.server";
import { readPhiRuntimeTreeRenderMode } from "../../../render-mode";
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
     * A field of the page record takes the text's place, inline, and nothing where the record does not have
     * it. A `text` is in the page's language already. A `markdown` says its language: source text is
     * translated from it paragraph by paragraph, as any Markdown is, and a person's translation
     * (`Translated`) is drawn as written -- so is any text where the node says `NoTranslate`.
     */
    const recordField = await resolvePhiWidgetRecordField({ registry, runtime, key: config.recordField, kinds: ["markdown", "text"] });
    if (recordField.bound) {
      const field = recordField.field;
      const source = field?.kind === "markdown"
        ? {
          markdown: field.value.text,
          sourceLocale: field.value.sourceLocale,
          translate: !hasPhiFlag(field.value.flags, PhiRecordMarkdownFlag.Translated) && !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate),
        }
        : { markdown: field?.value ?? "", translate: false };
      return source.markdown.trim()
        ? (
          <PhiMarkdownWidget
            key={`widget-${widget.id}`}
            config={{ ...config, widgetId: widget.id, sourceMode: "inline", resolvedContent: null, ...source }}
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
        tableEmbeds={registry && createPhiMarkdownTableEmbedResolver({ registry, runtime, renderMode: readPhiRuntimeTreeRenderMode(widget.config) })}
      />
    );
  },
  renderPreview: ({ widget, config, runtime, registry }) => (
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
        tableEmbeds={registry && createPhiMarkdownTableEmbedResolver({ registry, runtime, renderMode: "preview" })}
      />
    </PhiWidgetInertPreview>
  ),
};

export { PHI_MARKDOWN_WIDGET_PLUGIN_TYPE };
