import { localizeAreaPath } from "../../../../../helpers/locale";
import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import type { PhiAccountWidgetConfig } from "./client";
import { PHI_ACCOUNT_WIDGET_DEFINITION, PHI_ACCOUNT_WIDGET_PLUGIN_TYPE } from "./config";
import { PhiAccountWidget } from "./server";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

function readFirstName(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.split(/\s+/)[0] || normalized;
}

export const PHI_ACCOUNT_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiAccountWidgetConfig> = {
  ...PHI_ACCOUNT_WIDGET_DEFINITION,
  render: ({ widget, runtime }) => (
    <PhiAccountWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      config={widget.config}
      state={
        runtime.viewer.access === "authenticated"
            ? {
                kind: "authenticated",
                displayName: readFirstName(runtime.viewer.userName) ?? runtime.viewer.userEmail ?? undefined,
              }
          : {
              kind: "guest",
              registerHref: localizeAreaPath(runtime.locale.current, runtime.area, "/register"),
              forgotPasswordHref: localizeAreaPath(runtime.locale.current, runtime.area, "/reset-password"),
            }
      }
    />
  ),
  renderPreview: () => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.AccountPreview}
      componentProps={{}}
    />
  ),
};
export { PHI_ACCOUNT_WIDGET_PLUGIN_TYPE };
