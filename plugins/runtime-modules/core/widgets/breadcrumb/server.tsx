import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiBreadcrumbWidgetProps } from "./client";

export type {
  PhiBreadcrumbWidgetConfig,
  PhiBreadcrumbWidgetLabels,
  PhiBreadcrumbWidgetProps,
} from "./client";

export function PhiBreadcrumbWidget(props: PhiBreadcrumbWidgetProps) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Breadcrumb}
      componentProps={{ ...props }}
    />
  );
}
