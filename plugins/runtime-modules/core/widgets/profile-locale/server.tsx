import type { PhiBlockRuntime } from "../../../../../types";
import { getPhiProfileLocaleWidgetLabels } from "../../../../../components/widgets/label-sets/profile";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiProfileLocaleWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area" | "phis">;
  config?: {
    padding?: number | string;
  };
};

export async function PhiProfileLocaleWidget({ runtime, config }: PhiProfileLocaleWidgetProps) {
  if (runtime.viewer.access !== "authenticated") {
    return null;
  }

  const labels = await getPhiProfileLocaleWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.ProfileLocale}
      componentProps={{ runtime, labels, config }}
    />
  );
}
