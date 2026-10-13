import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiThemeModeSwitchWidgetConfig } from "./config";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiThemeModeSwitchWidgetLabels } from "../../../../../components/widgets/label-sets/theme-mode-switch";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";

/** The labels are the button's accessible name, translated here because a Widget client has no translation. */
export async function PhiThemeModeSwitchWidgetServer({
  blockId,
  config,
  runtime,
  preview = false,
}: {
  blockId: string | number;
  config: PhiThemeModeSwitchWidgetConfig;
  runtime: PhiBlockRuntime;
  preview?: boolean;
}) {
  const labels = await getPhiThemeModeSwitchWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.ThemeModeSwitch}
      componentProps={{
        blockId,
        config,
        labels,
        /*
         * A preview may not change the Site it is previewing. `signalsEnabled: false` is what stops the
         * flip from reaching the Controller; the button still draws the mode, because that is read.
         */
        ...(preview ? { disabled: true, signalsEnabled: false } : {}),
      }}
    />
  );
}
