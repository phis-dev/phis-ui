"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";
import { describePhiContentEntryRecordBinding } from "../../../../../helpers/content-entry-record-binding";
import { PHI_ENTRY_HEADER_WIDGET_DEFINITION, type PhiEntryHeaderWidgetConfig } from "./config";

/**
 * What the Builder says about a header it must not fetch: which kind, and which address its binding
 * names -- on a detail route the address is the visitor's, filled in from the route when the Page is served.
 */
export const PHI_ENTRY_HEADER_WIDGET_BUILDER_PLUGIN =
  createPhiCmsBuilderWidgetPlugin<PhiEntryHeaderWidgetConfig>(
    PHI_ENTRY_HEADER_WIDGET_DEFINITION,
    ({ widget, config }) => {
      const { kind, slug } = describePhiContentEntryRecordBinding(config?.entry);
      return (
        <PhiWidgetEditorPlaceholder
          widget={widget}
          pluginTitle={PHI_ENTRY_HEADER_WIDGET_DEFINITION.title}
          summary={(
            <>
              The opening of the published {kind ?? "bound"} entry
              {slug ? <> at <code>{slug}</code></> : " this Page's address names"}, read when the
              page is drawn.
            </>
          )}
        />
      );
    },
  );
