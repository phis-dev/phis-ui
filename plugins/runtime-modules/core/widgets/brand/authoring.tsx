"use client";

import type { PhiCmsBuilderWidgetPlugin, PhiCmsBuilderWidgetRenderArgs } from "../../../../../types";
import { PhiBrandLineControl } from "../../../../../components/controls/phi-brand-control";
import {
  usePhiSiteBrand,
  usePhiSiteWordmarkText,
} from "../../../../../components/root/phi-root-live-theme-provider";
import { PHI_BRAND_LINE_FALLBACK_ICONS, PhiBrandWidgetClient } from "./client";
import {
  PHI_BRAND_WIDGET_DEFINITION,
  isPhiBrandWidgetLineMode,
  type PhiBrandWidgetLineMode,
  type PhiCmsBrandWidgetConfig,
} from "./config";

/** What an unset line says instead of its sentence, which is also where to go and write one. */
const PHI_BRAND_LINE_UNSET_LABELS: Record<PhiBrandWidgetLineMode, string> = {
  slogan: "Slogan not set in the Theme",
  location: "Location not set in the Theme",
};

/**
 * The Brand as it will look, and for an unset line the shape it will take.
 *
 * A line the Theme has not written draws nothing, which is right on the page: the strip keeps its shape
 * and no slogan is invented for anybody's header. In the Builder it is not -- the slot is taken, so it
 * offers no `+` either, and a column of two invisible Widgets reads as broken rather than as unset.
 *
 * So the line is drawn as itself, with its own fallback icon in front, saying what is missing. Not a
 * generic placeholder card: what the author needs to see here is the shape the line will have and how
 * much room it takes beside its neighbours, which a card in its place would misreport.
 *
 * The mark modes need none of this. Their Wordmark falls back through `resolvePhiBrandWordmarkText` to
 * the Site's name and then its key, so there is always something to draw; a Logo mode with the Logo
 * explicitly set to none is somebody saying no, not somebody who has not answered yet.
 */
function PhiBrandWidgetEditor({ config }: PhiCmsBuilderWidgetRenderArgs<PhiCmsBrandWidgetConfig>) {
  const brand = usePhiSiteBrand();
  const wordmarkText = usePhiSiteWordmarkText();
  const mode = config.mode;

  if (isPhiBrandWidgetLineMode(mode)) {
    const line = mode === "location" ? brand?.location : brand?.slogan;
    if (!line?.label?.trim()) {
      return (
        <PhiBrandLineControl
          line={{ label: PHI_BRAND_LINE_UNSET_LABELS[mode] }}
          fallbackIcon={PHI_BRAND_LINE_FALLBACK_ICONS[mode]}
        />
      );
    }
  }

  /*
   * `mode` is passed on, which it was not before: a Widget set to a line, or to the Logo alone, drew the
   * full lockup here while it was being placed -- the editor disagreed with the page about the only
   * setting this Widget has.
   *
   * The Wordmark comes from the root and not from `runtime`, which on this canvas is a stub Site called
   * "Preview" -- and that is what the Wordmark said here, beside a Logo that was the Site's own.
   */
  return (
    <PhiBrandWidgetClient
      config={{ mode }}
      fallbackTitle={wordmarkText}
      interactive={false}
    />
  );
}

export const PHI_BRAND_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsBrandWidgetConfig> = {
  ...PHI_BRAND_WIDGET_DEFINITION,
  renderEditor: (args) => <PhiBrandWidgetEditor {...args} />,
};
