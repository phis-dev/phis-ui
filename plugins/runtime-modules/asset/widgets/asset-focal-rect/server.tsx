import type { PhiBlockRuntime } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsAssetFocalRectWidgetConfig } from "../../../../../types/media";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export function PhiAssetFocalRectWidgetServer({
  config,
}: {
  runtime: Pick<PhiBlockRuntime, "locale" | "site">;
  config?: PhiCmsAssetFocalRectWidgetConfig | null;
}) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.AssetFocalRect}
      componentProps={{ config }}
    />
  );
}
