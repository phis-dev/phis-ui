import type { PhiBlockRuntime } from "../../../../../types";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiAuthLogoutWidgetLabels } from "../../../../../components/widgets/label-sets/logout";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";

export async function PhiAuthLogoutWidget({
  runtime,
  config,
}: {
  runtime: Pick<PhiBlockRuntime, "site" | "locale">;
  config?: { padding?: number | string };
}) {
  const rt = phiRuntime(runtime);
  const labels = await getPhiAuthLogoutWidgetLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.AuthLogout}
      componentProps={{ runtime, config, labels }}
    />
  );
}
