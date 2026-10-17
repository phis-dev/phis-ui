"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";
import { PHI_ENTRY_DETAIL_WIDGET_DEFINITION, type PhiEntryDetailWidgetConfig } from "./config";

/**
 * What the Builder says about an entry it must not fetch: which kind, and which address -- on a detail
 * route the address is the visitor's, filled in from the route when the Page is served.
 */
export const PHI_ENTRY_DETAIL_WIDGET_BUILDER_PLUGIN =
  createPhiCmsBuilderWidgetPlugin<PhiEntryDetailWidgetConfig>(
    PHI_ENTRY_DETAIL_WIDGET_DEFINITION,
    ({ widget, config }) => (
      <PhiWidgetEditorPlaceholder
        widget={widget}
        pluginTitle={PHI_ENTRY_DETAIL_WIDGET_DEFINITION.title}
        summary={(
          <>
            The published {config?.kind ?? "news"} entry
            {config?.slug ? <> at <code>{config.slug}</code></> : " this Page's address names"}, read when the
            page is drawn.
          </>
        )}
      />
    ),
  );
