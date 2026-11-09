import type { PhiBlockRuntime } from "../../../../../types";
import { getPhiAvatarWidgetLabels } from "../../labels";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";

export type PhiAccountAvatarPickerWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area">;
  config?: {
    padding?: number | string;
  };
};

export async function PhiAccountAvatarPickerWidget({ runtime, config }: PhiAccountAvatarPickerWidgetProps) {
  // Nobody who is not signed in has an avatar to show or change.
  if (runtime.viewer.access !== "authenticated") {
    return null;
  }

  const labels = await getPhiAvatarWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime));

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.AccountAvatarPicker}
      componentProps={{ runtime, labels, config }}
    />
  );
}
