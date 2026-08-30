import type { PhiBlockRuntime } from "../../../../../types";
import { getPhiProfileNameWidgetLabels } from "../../../../../components/widgets/label-sets/profile";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiProfileNameWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area" | "phis">;
  config?: {
    padding?: number | string;
  };
};

export async function PhiProfileNameWidget({ runtime, config }: PhiProfileNameWidgetProps) {
  if (runtime.viewer.access !== "authenticated") {
    return null;
  }

  const labels = await getPhiProfileNameWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.ProfileName}
      componentProps={{ runtime, labels, config }}
    />
  );
}
