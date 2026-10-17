"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";
import {
  PHI_NEWS_LIST_DEFAULT_LIMIT,
  PHI_NEWS_LIST_WIDGET_DEFINITION,
  type PhiNewsListWidgetConfig,
} from "./config";

/**
 * What the Builder says about a list whose entries it must not fetch.
 *
 * The canvas is not where a read should leave for Core, and the entries are not the Site's to arrange
 * here anyway: what appears is whatever is published and unexpired at the moment a visitor arrives. So
 * the editor states the settings it does own, and points at where the entries are written.
 */
function PhiNewsListWidgetEditorSummary({ config }: { config: PhiNewsListWidgetConfig | undefined }) {
  const limit = config?.limit ?? PHI_NEWS_LIST_DEFAULT_LIMIT;
  const omitted = [
    config?.showTags === false ? "tags" : null,
    config?.showLinks === false ? "links" : null,
  ].filter((entry): entry is string => entry !== null);

  return (
    <>
      The {limit} most recent published news entries, read when the page is drawn
      {omitted.length > 0 ? <> — without {omitted.join(" or ")}</> : null}. Entries are written in the
      Editor; what a visitor sees is whatever is published and has not expired.
    </>
  );
}

export const PHI_NEWS_LIST_WIDGET_BUILDER_PLUGIN =
  createPhiCmsBuilderWidgetPlugin<PhiNewsListWidgetConfig>(
    PHI_NEWS_LIST_WIDGET_DEFINITION,
    ({ widget, config }) => (
      <PhiWidgetEditorPlaceholder
        widget={widget}
        pluginTitle={PHI_NEWS_LIST_WIDGET_DEFINITION.title}
        summary={<PhiNewsListWidgetEditorSummary config={config ?? undefined} />}
      />
    ),
  );
