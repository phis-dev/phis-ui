import type { PhiBlockRuntime } from "../../../../../types";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiAuthSecurityWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer">;
  config?: { padding?: number | string };
};

export async function PhiAuthSecurityWidget({ runtime, config }: PhiAuthSecurityWidgetProps) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.AuthSecurity}
      componentProps={{ runtime, config, apiPath: "/api/auth/account/security" }}
    />
  );
}
