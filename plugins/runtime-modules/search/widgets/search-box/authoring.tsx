"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/search";
import { PhiSearchBoxWidgetClient } from "./client";
import { PHI_SEARCH_BOX_WIDGET_DEFINITION, type PhiSearchBoxWidgetConfig } from "./config";

/**
 * The box as a visitor sees it -- the field, or the magnifier -- in the size and words its author chose,
 * but inert: a submit on the canvas would leave the Builder for the results Page, so the field takes no
 * input and the magnifier does not open.
 */
export const PHI_SEARCH_BOX_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiSearchBoxWidgetConfig> = {
  ...PHI_SEARCH_BOX_WIDGET_DEFINITION,
  renderEditor: ({ config }) => (
    <PhiSearchBoxWidgetClient
      labels={PHI_SEARCH_WIDGET_DEFAULT_LABELS}
      config={{
        // The author's words as stored; the canvas does not translate them.
        placeholder: config?.placeholder ?? "",
        initialQuery: "",
        interactive: false,
        ...(config?.controlSize ? { size: config.controlSize } : {}),
        ...(config?.variant ? { variant: config.variant } : {}),
      }}
    />
  ),
};
