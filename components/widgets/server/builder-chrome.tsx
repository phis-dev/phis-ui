import type { PhiBlockRuntime } from "../../../types";
import { getPhiBuilderChromeWidgetLabels } from "../label-sets/builder-chrome";
import { PhiRuntimeRenderClientType } from "../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../runtime/runtime-module-render-client-manifest";

export type PhiBuilderChromeWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "locale" | "phis">;
  disabled?: boolean;
};

async function getLabels(runtime: PhiBuilderChromeWidgetProps["runtime"]) {
  return getPhiBuilderChromeWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
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

export async function PhiDeveloperBuilderDraftStatusWidget({
  runtime,
}: PhiBuilderChromeWidgetProps) {
  const labels = await getLabels(runtime);
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.BuilderDraftStatus}
      componentProps={{ labels }}
    />
  );
}
