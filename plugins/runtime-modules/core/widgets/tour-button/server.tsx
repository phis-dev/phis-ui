import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiTourButtonWidgetConfig } from "./config";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiTourWidgetLabels } from "../../../../../components/widgets/label-sets/tour";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";

/** The label is the button's accessible name, translated here because a Widget client has no translation. */
export async function PhiTourButtonWidgetServer({
  config,
  runtime,
  preview = false,
}: {
  config: PhiTourButtonWidgetConfig;
  runtime: PhiBlockRuntime;
  preview?: boolean;
}) {
  const labels = await getPhiTourWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.TourButton}
      componentProps={{ config, labels, ...(preview ? { signalsEnabled: false } : {}) }}
    />
  );
}
