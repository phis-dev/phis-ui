import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiRecordWidgetLabels } from "../../../../../components/widgets/label-types/record";
import type { PhiRecordWidgetConfig } from "../../../../../types/record-widget";
import type { PhiRenderableBlockRenderMode } from "../../../../../types/renderable-block";

export type PhiRecordWidgetProps = {
  config: PhiRecordWidgetConfig;
  labels: PhiRecordWidgetLabels;
  renderMode: PhiRenderableBlockRenderMode;
};

export function PhiRecordWidget({ config, labels, renderMode }: PhiRecordWidgetProps) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Record}
      componentProps={{ config, labels, renderMode }}
    />
  );
}
