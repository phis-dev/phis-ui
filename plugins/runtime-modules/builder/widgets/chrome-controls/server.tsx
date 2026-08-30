import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiBuilderChromeControlsWidgetConfig = {
  editorPreviewDisabled?: boolean;
  actionsDisabled?: boolean;
  debugDisabled?: boolean;
};

export function PhiBuilderChromeControlsWidget({
  config,
}: {
  config?: PhiBuilderChromeControlsWidgetConfig | null;
}) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.BuilderChromeControls}
      componentProps={{ config }}
    />
  );
}
