import type { PhiBlockRuntime } from "../../../../../types";
import { getPhiAvatarWidgetLabels } from "../../../../../components/widgets/label-sets/avatar";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiAccountAvatarPickerWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area" | "phis">;
  config?: {
    padding?: number | string;
  };
};

export async function PhiAccountAvatarPickerWidget({ runtime, config }: PhiAccountAvatarPickerWidgetProps) {
  // Nobody who is not signed in has an avatar to show or change.
  if (runtime.viewer.access !== "authenticated") {
    return null;
  }

  const labels = await getPhiAvatarWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.AccountAvatarPicker}
      componentProps={{ runtime, labels, config }}
    />
  );
}
