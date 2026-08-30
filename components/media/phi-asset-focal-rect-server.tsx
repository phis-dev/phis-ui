import type { PhiBlockRuntime } from "../../types";
import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import type { PhiCmsAssetFocalRectWidgetConfig } from "../../plugins/runtime-modules/asset/widgets/asset-focal-rect/config";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";

export function PhiAssetFocalRectWidgetServer({
  config,
}: {
  runtime: Pick<PhiBlockRuntime, "phis" | "locale" | "site">;
  config?: PhiCmsAssetFocalRectWidgetConfig | null;
}) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.AssetFocalRect}
      componentProps={{ config }}
    />
  );
}
