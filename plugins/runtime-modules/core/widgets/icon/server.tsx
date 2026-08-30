import type { PhiCmsInstanceId, PhiNoLabels, PhiRenderableBlockBase, PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiIconWidgetClientConfig } from "./client";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiIconWidgetLabels = PhiNoLabels;

export type PhiIconWidgetConfig = PhiIconWidgetClientConfig &
  PhiRenderableBlockBase;

export type PhiIconWidgetProps = PhiServerBlockBaseProps<
  PhiIconWidgetLabels,
  PhiIconWidgetConfig
> & {
  blockId: PhiCmsInstanceId;
};

export function PhiIconWidget({
  blockId,
  config,
}: PhiIconWidgetProps) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Icon}
      componentProps={{
        blockId,
        config: config satisfies PhiIconWidgetClientConfig | undefined,
      }}
    />
  );
}
