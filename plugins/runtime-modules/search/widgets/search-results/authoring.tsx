"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";
import { PHI_SEARCH_RESULTS_WIDGET_DEFINITION, type PhiSearchResultsWidgetConfig } from "./config";

/**
 * What the Builder says about a list it cannot show: the hits are whatever a visitor's query matches at
 * the moment they ask, and the canvas has no query.
 */
export const PHI_SEARCH_RESULTS_WIDGET_BUILDER_PLUGIN =
  createPhiCmsBuilderWidgetPlugin<PhiSearchResultsWidgetConfig>(
    PHI_SEARCH_RESULTS_WIDGET_DEFINITION,
    ({ widget, config }) => (
      <PhiWidgetEditorPlaceholder
        widget={widget}
        pluginTitle={PHI_SEARCH_RESULTS_WIDGET_DEFINITION.title}
        summary={
          <>
            Up to {config?.limit ?? 20} pages matching the search in the page&apos;s address, best first, read
            from the Site&apos;s search index when a visitor arrives.
          </>
        }
      />
    ),
  );
