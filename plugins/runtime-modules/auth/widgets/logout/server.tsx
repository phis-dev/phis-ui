import type { PhiBlockRuntime } from "../../../../../types";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export function PhiAuthLogoutWidget({
  runtime,
  config,
}: {
  runtime: Pick<PhiBlockRuntime, "site" | "locale">;
  config?: { padding?: number | string };
}) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.AuthLogout}
      componentProps={{ runtime, config }}
    />
  );
}
