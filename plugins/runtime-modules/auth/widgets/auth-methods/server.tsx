import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { fetchPhiPublicAuthManifest } from "../../../../../gateway/auth-public-manifest";
import { getPhiAuthMethodsLabels } from "../../../../../components/widgets/label-sets/account";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import type { PhiBlockRuntime } from "../../../../../types";

export type PhiAuthMethodsWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale">;
};

/**
 * Read here rather than after hydration, for the reason the Login form was moved here before it.
 *
 * Nothing about these buttons depends on the viewer -- they are what the Site was configured with -- so
 * a visitor who has to wait for them is waiting for a round trip that the server had already made. A
 * failure is said out loud instead of leaving an empty space: a Site whose only sign-in is an external
 * provider would otherwise offer a page with nothing on it and no explanation.
 */
export async function PhiAuthMethodsWidget({ runtime }: PhiAuthMethodsWidgetProps) {
  const rt = phiRuntime(runtime);
  const labels = await getPhiAuthMethodsLabels({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    locale: runtime.locale.current,
  });

  let manifest;
  try {
    manifest = await fetchPhiPublicAuthManifest({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
    });
  } catch {
    return <PhiAlertControl level="warning" showIcon title={labels.unavailable} />;
  }

  const primary = manifest.methods.filter((method) => method.stage === "primary");
  const external = primary.filter((method) => method.methodKey !== "password");

  if (external.length === 0) {
    return null;
  }

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.AuthMethods}
      componentProps={{
        methods: external,
        withSeparator: primary.some((method) => method.methodKey === "password"),
        labels,
      }}
    />
  );
}
