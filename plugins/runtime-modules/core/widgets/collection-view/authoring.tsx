"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../../types/collection-view-widget";
import { PHI_COLLECTION_VIEW_WIDGET_DEFINITION } from "./config";
import { PhiCollectionViewWidget } from "./client";

export const PHI_COLLECTION_VIEW_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsCollectionViewWidgetConfig> = {
  ...PHI_COLLECTION_VIEW_WIDGET_DEFINITION,
  renderEditor: ({ config }) => (
    <PhiCollectionViewWidget
      config={config}
      preview
      skeletonActive={false}
    />
  ),
};
