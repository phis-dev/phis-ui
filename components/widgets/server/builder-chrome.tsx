import type { PhiBlockRuntime } from "../../../types";
import { getPhiBuilderChromeWidgetLabels } from "../label-sets/builder-chrome";
import { PhiRuntimeRenderClientType } from "../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../runtime/runtime-module-render-client-manifest";
import { buildPhiWidgetLabelTranslatorOptions } from "../label-sets/runtime-options";

export type PhiBuilderChromeWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "locale">;
  disabled?: boolean;
};

async function getLabels(runtime: PhiBuilderChromeWidgetProps["runtime"]) {
  return getPhiBuilderChromeWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
}

export async function PhiBuilderModeSwitchWidget({
  runtime,
  disabled,
}: PhiBuilderChromeWidgetProps) {
  const labels = await getLabels(runtime);
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.BuilderModeSwitch}
      componentProps={{ disabled, labels }}
    />
  );
}
