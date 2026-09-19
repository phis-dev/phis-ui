import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiRecordWidgetLabels } from "../../../../../components/widgets/label-types/record";
import type { PhiRecordWidgetConfig } from "../../../../../types/record-widget";

export type PhiRecordWidgetProps = {
  config: PhiRecordWidgetConfig;
  labels: PhiRecordWidgetLabels;
};

export function PhiRecordWidget({ config, labels }: PhiRecordWidgetProps) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Record}
      componentProps={{ config, labels }}
    />
  );
}
