import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiObservabilityLogDetailWidgetConfig } from "./config";
import { getPhiObservabilityLogsWidgetLabels } from "../../../../../components/widgets/label-sets/observability-logs";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiObservabilityLogDetailWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "locale" | "phis">;
  config: PhiObservabilityLogDetailWidgetConfig;
};

export async function PhiObservabilityLogDetailWidget({
  runtime,
  config,
}: PhiObservabilityLogDetailWidgetProps) {
  const labels = await getPhiObservabilityLogsWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.ObservabilityLogDetail}
      componentProps={{ config, labels }}
    />
  );
}
