import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiCmsCollectionViewWidgetConfig } from "./config";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiCollectionViewWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "phis" | "locale">;
  config?: PhiCmsCollectionViewWidgetConfig | null;
  widgetId?: PhiCmsInstanceId | null;
  preview?: boolean;
};

export async function PhiCollectionViewWidgetServer({
  config,
  widgetId,
  preview = false,
}: PhiCollectionViewWidgetServerProps) {
  if (preview) {
    return (
      <PhiRuntimeModuleRenderClientHost
        type={PhiCmsWidgetType.CollectionView}
        componentProps={{ config, widgetId, preview: true }}
      />
    );
  }

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.CollectionView}
      componentProps={{ config, widgetId, preview: false }}
    />
  );
}
