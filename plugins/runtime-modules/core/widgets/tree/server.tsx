import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiTreeWidgetConfig } from "../../../../../types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiTreeWidgetLabels } from "../../../../../components/widgets/label-types/tree";
import type { PhiRenderableBlockRenderMode } from "../../../../../types/renderable-block";

export function PhiTreeWidget({ config, labels, renderMode }: {
  config: PhiTreeWidgetConfig;
  labels: PhiTreeWidgetLabels;
  renderMode: PhiRenderableBlockRenderMode;
}) {
  return <PhiRuntimeModuleRenderClientHost type={PhiCmsWidgetType.Tree} componentProps={{ config, labels, renderMode }} />;
}
