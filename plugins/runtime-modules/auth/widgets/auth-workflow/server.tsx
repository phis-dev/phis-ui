import type { PhiBlockRuntime } from "../../../../../types";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiAuthWorkflowBodyLabels } from "../../../../../components/widgets/label-sets/auth-workflow";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import type { PhiSignalRouteSet } from "../../../../../types/signals";

/**
 * The second factor's server half, which exists for one reason: its words.
 *
 * This Widget rendered straight to its Client, so there was nowhere to resolve a Label Set and the body
 * it draws said everything in hard-coded English. A sentence a visitor reads is resolved on the server
 * in this package, once per render, in the locale the page is in -- the same shape the account security
 * Widget beside it already had.
 */
export type PhiAuthWorkflowWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale">;
  signalRoutes?: PhiSignalRouteSet | null;
};

export async function PhiAuthWorkflowWidget({ runtime, signalRoutes }: PhiAuthWorkflowWidgetProps) {
  const rt = phiRuntime(runtime);
  const labels = await getPhiAuthWorkflowBodyLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.AuthWorkflow}
      componentProps={{ signalRoutes, labels }}
    />
  );
}
