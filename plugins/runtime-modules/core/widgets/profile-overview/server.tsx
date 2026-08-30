import type { PhiBlockRuntime } from "../../../../../types";
import { getPhiProfileOverviewWidgetLabels } from "../../../../../components/widgets/label-sets/profile";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiProfileOverviewWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area" | "phis">;
};

export async function PhiProfileOverviewWidget({ runtime }: PhiProfileOverviewWidgetProps) {
  if (runtime.viewer.access !== "authenticated") {
    return null;
  }

  const labels = await getPhiProfileOverviewWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.ProfileOverview}
      componentProps={{ runtime, labels }}
    />
  );
}
