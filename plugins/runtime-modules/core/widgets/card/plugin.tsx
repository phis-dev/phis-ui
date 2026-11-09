import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import { translatePhiSearchWidgetTexts } from "../../../../../server-helpers/search-text";
import type { PhiCmsServerWidgetPlugin, PhiCmsWidgetPluginRenderArgs } from "../../../../../types";
import type { PhiCmsCardWidgetConfig } from "./config";
import { PhiCardWidget } from "./server";
import { PHI_CARD_WIDGET_DEFINITION, PHI_CARD_WIDGET_PLUGIN_TYPE } from "./config";

function renderPhiCard(
  { widget, config, runtime, links }: PhiCmsWidgetPluginRenderArgs<PhiCmsCardWidgetConfig>,
  preview: boolean,
) {
  return (
    <PhiCardWidget
      key={`widget-${widget.id}`}
      labels={{
        eyebrow: config.eyebrow,
        title: config.title,
        description: config.description,
        meta: config.meta,
        actionLabel: config.actionLabel,
      }}
      config={config}
      runtime={runtime}
      links={links}
      translate={!hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)}
      preview={preview}
    />
  );
}

export const PHI_CARD_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsCardWidgetConfig> = {
  ...PHI_CARD_WIDGET_DEFINITION,
  /*
   * The card's words as the render draws them (SEARCH.md): the texts it translates, translated the same
   * way; the figure and the prices as written, which the render never translates either.
   */
  searchText: async ({ widget, config, runtime }) => {
    const plan = config.body === "plan";
    const translated = await translatePhiSearchWidgetTexts(
      runtime,
      [
        config.eyebrow,
        config.title,
        config.description,
        config.meta,
        config.badge,
        config.actionEnabled ? config.actionLabel : undefined,
        ...(plan ? (config.features ?? []).map((entry) => entry.text) : []),
      ],
      { translate: !hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate) },
    );
    return [...translated, config.value ?? "", ...(plan ? [config.price ?? "", config.priceYearly ?? ""] : [])];
  },
  /*
   * Not the passive renderers' preview: that one is inert, and an inert card answers no pointer, so its
   * hover effect could not be seen where it is chosen. The card's own preview leads nowhere instead.
   */
  render: (args) => renderPhiCard(args, false),
  renderPreview: (args) => renderPhiCard(args, true),
};

export { PHI_CARD_WIDGET_PLUGIN_TYPE };
