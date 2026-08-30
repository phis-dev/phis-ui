import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiTableWidgetConfig } from "../../../../../types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiTableWidgetLabels } from "../../../../../components/widgets/label-types/table";

export type PhiTableWidgetProps = {
  config: PhiTableWidgetConfig;
  labels: PhiTableWidgetLabels;
};

export function PhiTableWidget({ config, labels }: PhiTableWidgetProps) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Table}
      componentProps={{ config, labels }}
    />
  );
}
