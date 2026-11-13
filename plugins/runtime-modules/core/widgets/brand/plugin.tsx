import type { PhiBlockRuntime, PhiCmsContentWidgetNode, PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import { tr, trForLocale, trGlobal, trGlobalForLocale } from "../../../../../server-helpers/translate";
import { resolvePhiBrandWordmarkText } from "../../../../../helpers/brand-wordmark";
import { resolvePhiBrandWidgetHome } from "./home";
import { PhiBrandWidget } from "./server";
import {
  PHI_BRAND_WIDGET_DEFINITION,
  PHI_BRAND_WIDGET_PLUGIN_TYPE,
  type PhiCmsBrandWidgetConfig,
} from "./config";

/*
 * What the Widget says when the Theme's Wordmark says nothing: this Site's name, read at render.
 *
 * It is resolved here rather than written into a Preset, because a Preset is followed by every Site
 * that adopts it and a name written there is one Site's. Filling it in made the Widget carry whatever
 * the Site happened to be called the moment its Preset was taken over -- a name that then stayed put
 * while the Site's own changed underneath it. `resolvePhiBrandWordmarkText` is the same order the rest
 * of the frame reads it in: the Theme's Wordmark, then the Site's name, then its key.
 */
/** The Logo's default description: the platform's words, from the global store. */
const PHI_BRAND_LOGO_ALT_DEFAULT = "Brand logo";

/*
 * What a screen reader says for the Logo, in the page's language like every other word on it. The
 * Theme's own text is the Site's and is translated in the Site's store; where the Theme says nothing,
 * the default is the platform's. A Widget marked not to translate keeps the Theme's text as written.
 */
async function translatePhiBrandLogoAlt(
  runtime: Pick<PhiBlockRuntime, "site" | "locale">,
  widget: Pick<PhiCmsContentWidgetNode, "flags">,
): Promise<string | undefined> {
  const own = runtime.site.theme?.brand?.logoAlt?.trim();
  if (hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)) {
    return own || undefined;
  }
  const locale = runtime.locale.current;
  if (own) {
    return locale ? trForLocale(locale, own) : tr(own);
  }
  return locale ? trGlobalForLocale(locale, PHI_BRAND_LOGO_ALT_DEFAULT) : trGlobal(PHI_BRAND_LOGO_ALT_DEFAULT);
}

export const PHI_BRAND_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsBrandWidgetConfig> = {
  ...PHI_BRAND_WIDGET_DEFINITION,
  render: async ({ widget, config, runtime, links }) => (
    <PhiBrandWidget
      key={`widget-${widget.id}`}
      fallbackTitle={resolvePhiBrandWordmarkText(runtime)}
      home={resolvePhiBrandWidgetHome(runtime, links)}
      logoAlt={await translatePhiBrandLogoAlt(runtime, widget)}
      mode={config.mode}
      fontFamily={config.fontFamily}
      fontSize={config.fontSize}
    />
  ),
  renderPreview: async ({ widget, config, runtime, links }) => (
    <PhiBrandWidget
      key={`widget-${widget.id}`}
      fallbackTitle={resolvePhiBrandWordmarkText(runtime)}
      home={resolvePhiBrandWidgetHome(runtime, links)}
      logoAlt={await translatePhiBrandLogoAlt(runtime, widget)}
      mode={config.mode}
      fontFamily={config.fontFamily}
      fontSize={config.fontSize}
      interactive={false}
    />
  ),
};

export { PHI_BRAND_WIDGET_PLUGIN_TYPE };
