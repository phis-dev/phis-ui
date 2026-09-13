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
  /*
   * The parsed config, not the Widget node's own.
   *
   * The renderer hands every Widget its config already read through `parseConfig`; this one reached
   * past it for `widget.config`, the raw object that also travels with the node. The same object in
   * two places of one payload is serialized once and referred to the second time, and the reference is
   * filled in after the element holding it exists -- whose props React freezes in development. The
   * write threw, and the Widget that did not render was the account menu on every staff shell.
   *
   * Reading the parsed config is also what the Widget was supposed to do: `parseConfig` is where the
   * three presentation options are checked, and bypassing it trusted whatever the node carried.
   */
  render: ({ widget, runtime, config }) => (
    <PhiAccountWidget
      key={`widget-${widget.id}`}
      runtime={runtime}
      config={config}
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
