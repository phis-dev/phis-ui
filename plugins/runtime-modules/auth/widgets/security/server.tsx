import type { PhiBlockRuntime } from "../../../../../types";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiAuthSecurityWidgetLabels } from "../../../../../components/widgets/label-sets/security";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";

export type PhiAuthSecurityWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer">;
  config?: { padding?: number | string };
};

export async function PhiAuthSecurityWidget({ runtime, config }: PhiAuthSecurityWidgetProps) {
  const rt = phiRuntime(runtime);
  const labels = await getPhiAuthSecurityWidgetLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.AuthSecurity}
      componentProps={{ runtime, config, labels, apiPath: "/api/auth/account/security" }}
    />
  );
}
