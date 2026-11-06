import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiTableWidgetConfig } from "../../../../../types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiTableWidgetLabels } from "../../../../../components/widgets/label-types/table";
import type { PhiRenderableBlockRenderMode } from "../../../../../types/renderable-block";

export type PhiTableWidgetProps = {
  config: PhiTableWidgetConfig;
  labels: PhiTableWidgetLabels;
  renderMode: PhiRenderableBlockRenderMode;
};

export function PhiTableWidget({ config, labels, renderMode }: PhiTableWidgetProps) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Table}
      componentProps={{ config, labels, renderMode }}
    />
  );
}
