import type { PhiBlockRuntime } from "../../../../../types";
import { getPhiProfileOverviewWidgetLabels } from "../../../../../components/widgets/label-sets/profile";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";

export type PhiProfileOverviewWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area">;
};

export async function PhiProfileOverviewWidget({ runtime }: PhiProfileOverviewWidgetProps) {
  if (runtime.viewer.access !== "authenticated") {
    return null;
  }

  const labels = await getPhiProfileOverviewWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.ProfileOverview}
      componentProps={{ runtime, labels }}
    />
  );
}
