"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { resolvePhiBrandWordmarkText } from "../../../../../helpers/brand-wordmark";
import { PhiBrandWidgetClient } from "./client";
import { PHI_BRAND_WIDGET_DEFINITION, type PhiCmsBrandWidgetConfig } from "./config";

/*
 * The editor shows what the page will show, which it did not before.
 *
 * `mode` was the one thing this preview did not pass on, so a Widget set to a line or to the Logo alone
 * still drew the full lockup while it was being placed -- the Builder disagreed with the Site about the
 * only setting this Widget has. The fallback reads through the same resolver as the server half for the
 * same reason: `site.name` skips a Wordmark the Theme has already set.
 */
export const PHI_BRAND_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsBrandWidgetConfig> = {
  ...PHI_BRAND_WIDGET_DEFINITION,
  renderEditor: ({ runtime, config }) => (
    <PhiBrandWidgetClient
      config={{ mode: config.mode }}
      fallbackTitle={resolvePhiBrandWordmarkText(runtime)}
      interactive={false}
    />
  ),
};
