import type { PhiBlockRuntime } from "../../../../../types";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiAuthSecurityWidgetLabels } from "../../../../../components/widgets/label-sets/security";
import { getPhiAuthWorkflowBodyLabels } from "../../../../../components/widgets/label-sets/auth-workflow";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";

export type PhiAuthSecurityWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer">;
  config?: { padding?: number | string };
};

export async function PhiAuthSecurityWidget({ runtime, config }: PhiAuthSecurityWidgetProps) {
  const rt = phiRuntime(runtime);
  /* Two sets: this surface's own, and the body's, because adding a device is drawn by the shared one. */
  const [labels, workflowLabels] = await Promise.all([
    getPhiAuthSecurityWidgetLabels({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      locale: runtime.locale.current,
    }),
    getPhiAuthWorkflowBodyLabels({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      locale: runtime.locale.current,
    }),
  ]);

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.AuthSecurity}
      componentProps={{ runtime, config, labels, workflowLabels, apiPath: "/api/auth/account/security" }}
    />
  );
}
