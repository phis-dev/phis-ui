import type { PhiBlockRuntime } from "../../../../../types";
import { getPhiProfileEmailWidgetLabels } from "../../../../../components/widgets/label-sets/profile";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";

export type PhiProfileEmailWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area">;
  config?: {
    padding?: number | string;
  };
};

export async function PhiProfileEmailWidget({ runtime, config }: PhiProfileEmailWidgetProps) {
  if (runtime.viewer.access !== "authenticated") {
    return null;
  }

  const labels = await getPhiProfileEmailWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.ProfileEmail}
      componentProps={{ runtime, labels, config }}
    />
  );
}
