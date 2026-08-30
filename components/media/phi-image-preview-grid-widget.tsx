import type { PhiCmsAssetPreviewGridWidgetConfig } from "../../plugins/runtime-modules/core/widgets/collection-view/config";
import type { PhiAssetPreviewGridWidgetLabels } from "./media-widget-labels";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "./media-widget-labels";
import { PHI_ASSET_COLLECTION_DATA_SOURCE } from "./asset-collection-runtime";
import { PhiCollectionViewWidget } from "../widgets/client/collection-view-widget";

export type PhiAssetPreviewGridWidgetProps = {
  config?: PhiCmsAssetPreviewGridWidgetConfig | null;
  labels: PhiAssetPreviewGridWidgetLabels;
};

export function PhiAssetPreviewGridWidget({ config, labels }: PhiAssetPreviewGridWidgetProps) {
  return (
    <PhiCollectionViewWidget
      config={{
        presentation: {
          mode: "grid",
          minColumnWidth: 102,
          emptyDescription: config?.emptyDescription,
          controlSize: "small",
        },
        features: { tools: { mode: "external" }, pagination: { enabled: false } },
        source: PHI_ASSET_COLLECTION_DATA_SOURCE,
      }}
      labels={{ ...PHI_MEDIA_WIDGET_DEFAULT_LABELS, grid: labels }}
    />
  );
}
