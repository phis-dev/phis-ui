import type { PhiBlockRuntime } from "../../../../../types";
import { getPhiProfilePasswordWidgetLabels } from "../../../../../components/widgets/label-sets/profile";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiProfilePasswordWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area" | "phis">;
  config?: {
    padding?: number | string;
  };
};

export async function PhiProfilePasswordWidget({ runtime, config }: PhiProfilePasswordWidgetProps) {
  if (runtime.viewer.access !== "authenticated") {
    return null;
  }

  const labels = await getPhiProfilePasswordWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.ProfilePassword}
      componentProps={{ runtime, labels, config }}
    />
  );
}
