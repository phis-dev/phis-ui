"use client";

import type { PhiCmsAssetInspectorWidgetConfig } from "../../plugins/runtime-modules/asset/widgets/image-inspector/config";
import { normalizePhiImagePreviewSelectionAsset } from "./phi-image-preview-data";
import { PhiAssetInspectorSection } from "./phi-asset-inspector-section";
import { setPhiImagePreviewSelection, usePhiImagePreviewStore } from "./phi-image-preview-store";
import type { PhiAssetInspectorWidgetLabels, PhiAssetWidgetLabels } from "./media-widget-labels";
import { PHI_ASSET_CONTROLLER_STORE_KEY } from "./phi-media-scope-controller";
import { normalizeMediaFocalRect } from "./focal-rect";
import { usePhiControlSignalController } from "../widgets/client/shared/phi-control-signals";

export type PhiAssetConfigWidgetProps = {
  config?: PhiCmsAssetInspectorWidgetConfig | null;
  labels: {
    inspector: PhiAssetInspectorWidgetLabels;
    editor: PhiAssetWidgetLabels["editor"];
  };
  sitePublicUrl?: string | null;
  locale: string;
};

export function PhiAssetConfigWidget({ config, labels, sitePublicUrl }: PhiAssetConfigWidgetProps) {
  const state = usePhiImagePreviewStore(PHI_ASSET_CONTROLLER_STORE_KEY);
  const selectedAssetTile = state.selectedAsset ?? state.assets.find((asset) => asset.id === state.selectedAssetId) ?? null;
  const selectedAsset = selectedAssetTile ? normalizePhiImagePreviewSelectionAsset(selectedAssetTile) : null;
  const focalRectSignals = usePhiControlSignalController({
    key: "focalRect",
    signalRoutes: config?.signalRoutes,
    valueType: "none",
    typeKey: "image-inspector-focal-rect",
  });

  return selectedAsset ? (
        <PhiAssetInspectorSection
          section={config?.section ?? "preview"}
          asset={selectedAsset}
          selectedVariantKey={state.selectedVariantKey}
          sitePublicUrl={sitePublicUrl}
          labels={labels}
          focalRect={normalizeMediaFocalRect(selectedAsset.meta?.focalRect)}
          onVariantKeyChange={(nextVariantKey) => {
            setPhiImagePreviewSelection(PHI_ASSET_CONTROLLER_STORE_KEY, selectedAsset.id, nextVariantKey ?? null, selectedAssetTile);
          }}
          onFocalRectOpen={() => focalRectSignals.emitCapability("focalRectOpen", null)}
        />
  ) : null;
}
