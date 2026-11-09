"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";
import { PHI_SEARCH_BOX_WIDGET_DEFINITION, type PhiSearchBoxWidgetConfig } from "./config";

/**
 * What the Builder says about a box that is a form the browser submits: where it leads, not a field to
 * type into on the canvas -- a submit there would leave the Builder for the results Page.
 */
export const PHI_SEARCH_BOX_WIDGET_BUILDER_PLUGIN =
  createPhiCmsBuilderWidgetPlugin<PhiSearchBoxWidgetConfig>(
    PHI_SEARCH_BOX_WIDGET_DEFINITION,
    ({ widget, config }) => (
      <PhiWidgetEditorPlaceholder
        widget={widget}
        pluginTitle={PHI_SEARCH_BOX_WIDGET_DEFINITION.title}
        summary={
          <>
            A search field that sends what a visitor types to {config?.linkTarget ? "the chosen results page" : "this Area's search page"}
            {config?.placeholder ? <>; it reads “{config.placeholder}” while empty</> : null}.
          </>
        }
      />
    ),
  );
