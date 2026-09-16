import dynamic from "next/dynamic";
import {
  definePhiRuntimeModuleRenderClient,
  type PhiRuntimeModuleRenderClient,
} from "../../../components/runtime/runtime-module-render-client-manifest";
import { PhiRuntimeRenderClientType } from "../../../constants/runtime-render-client-types";

export const PHI_AUTH_RUNTIME_MODULE_RENDER_CLIENT_LOADERS = [
  [
    PhiRuntimeRenderClientType.AuthLogout,
    definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../auth/widgets/logout/client").then((module) => module.PhiAuthLogoutWidgetClient)),
      ),
  ],
  [
    PhiRuntimeRenderClientType.AuthWorkflow,
    definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../auth/widgets/auth-workflow/client").then((module) => module.PhiAuthWorkflowWidgetClient)),
      ),
  ],
  [
    PhiRuntimeRenderClientType.AuthMethods,
    definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../auth/widgets/auth-methods/client").then((module) => module.PhiAuthMethodsWidgetClient)),
      ),
  ],
] as const satisfies ReadonlyArray<readonly [string, PhiRuntimeModuleRenderClient]>;

export const PHI_AUTH_SECURITY_RENDER_CLIENT_LOADER = [
  PhiRuntimeRenderClientType.AuthSecurity,
  definePhiRuntimeModuleRenderClient(
        dynamic(() => import("../auth/widgets/security/client").then((module) => module.PhiAuthSecurityWidgetClient)),
      ),
] as const satisfies readonly [string, PhiRuntimeModuleRenderClient];
