import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../types";
import type { PhiCmsTabBarWidgetConfig } from "../config/stack-tabs";
import { PhiCmsWidgetType } from "../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../runtime/runtime-module-render-client-manifest";

export type PhiTabBarWidgetProps = PhiServerBlockBaseProps<
  PhiNoLabels,
  PhiCmsTabBarWidgetConfig
>;

export function PhiTabBarWidget({
  config,
  signalsEnabled = true,
}: PhiTabBarWidgetProps & {
  signalsEnabled?: boolean;
}) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.TabBar}
      componentProps={{ config, signalsEnabled }}
    />
  );
}
