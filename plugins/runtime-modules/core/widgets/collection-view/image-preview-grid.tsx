import type { PhiCmsAssetPreviewGridWidgetConfig } from "./config";
import type { PhiAssetPreviewGridWidgetLabels, PhiAssetWidgetLabels } from "../../../../../components/media/media-widget-labels";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "../../../../../components/media/media-widget-labels";
import { PHI_ASSET_COLLECTION_DATA_SOURCE } from "../../../../../components/media/asset-collection-runtime";
import type { PhiRenderableBlockRenderMode } from "../../../../../types/renderable-block";
import { PhiCollectionViewWidget } from "./client";

export type PhiAssetPreviewGridWidgetProps = {
  config?: PhiCmsAssetPreviewGridWidgetConfig | null;
  labels: PhiAssetPreviewGridWidgetLabels;
  /**
   * The Media Label Set in full (`getPhiMediaWidgetLabels`), for a caller that has it. It replaces the
   * English defaults the widget spreads around `labels`, so the toolbar, upload and picker words are
   * the reader's language too; `labels` is still the grid's own.
   */
  mediaLabels?: PhiAssetWidgetLabels;
  /** Who reads a failure of the asset source: the author outside "live", the log on a live page. */
  renderMode: PhiRenderableBlockRenderMode;
};

export function PhiAssetPreviewGridWidget({ config, labels, mediaLabels, renderMode }: PhiAssetPreviewGridWidgetProps) {
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
      labels={{ ...(mediaLabels ?? PHI_MEDIA_WIDGET_DEFAULT_LABELS), grid: labels }}
      renderMode={renderMode}
    />
  );
}
