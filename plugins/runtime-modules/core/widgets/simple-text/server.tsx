import type { PhiCmsInstanceId, PhiRenderableBlockBase, PhiServerBlockBaseProps } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiSimpleTextWidgetClientConfig } from "./client";

export type PhiSimpleTextWidgetLabels = {
  text: string;
};

export type PhiSimpleTextWidgetConfig = PhiSimpleTextWidgetClientConfig &
  PhiRenderableBlockBase;

export type PhiSimpleTextWidgetProps = PhiServerBlockBaseProps<
  PhiSimpleTextWidgetLabels,
  PhiSimpleTextWidgetConfig
> & {
  blockId: PhiCmsInstanceId;
};

export function PhiSimpleTextWidget({
  blockId,
  labels,
  config,
}: PhiSimpleTextWidgetProps) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.SimpleText}
      componentProps={{
        blockId,
        labels: { text: labels.text },
        config: config satisfies PhiSimpleTextWidgetClientConfig | undefined,
      }}
    />
  );
}
