"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PhiWidgetEditorPlaceholder } from "../../../../../components/widgets/builder/widget-editor-placeholder";
import {
  PHI_GALLERY_WIDGET_DEFINITION,
  type PhiCmsGalleryWidgetConfig,
} from "./config";

/**
 * What the Builder says about pictures it must not fetch.
 *
 * The Folder is read when the page is drawn, and what is in it then is what a visitor sees; the canvas
 * states the binding and leaves the reading to the page.
 */
function PhiGalleryWidgetEditorSummary({ config }: { config: PhiCmsGalleryWidgetConfig | undefined }) {
  const folderId = config?.source?.params?.folderId;
  return folderId == null || folderId === ""
    ? <>No folder chosen yet. Pick one in the inspector; its public pictures are read when the page is drawn.</>
    : <>The public pictures of the chosen media folder, read when the page is drawn.</>;
}

export const PHI_GALLERY_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiCmsGalleryWidgetConfig>(
  PHI_GALLERY_WIDGET_DEFINITION,
  ({ widget, config }) => (
    <PhiWidgetEditorPlaceholder
      widget={widget}
      pluginTitle={PHI_GALLERY_WIDGET_DEFINITION.title}
      summary={<PhiGalleryWidgetEditorSummary config={config ?? undefined} />}
    />
  ),
);
