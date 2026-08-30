import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiTreeWidgetConfig } from "../../../../../types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiTreeWidgetLabels } from "../../../../../components/widgets/label-types/tree";

export function PhiTreeWidget({ config, labels }: { config: PhiTreeWidgetConfig; labels: PhiTreeWidgetLabels }) {
  return <PhiRuntimeModuleRenderClientHost type={PhiCmsWidgetType.Tree} componentProps={{ config, labels }} />;
}
