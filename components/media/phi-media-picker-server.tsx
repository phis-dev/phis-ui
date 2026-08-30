import type { PhiBlockRuntime } from "../../types";
import type { PhiCmsMediaPickerWidgetConfig } from "../../plugins/runtime-modules/asset/widgets/media-picker/config";
import { getPhiSearchWidgetLabels } from "../widgets/label-sets/search";
import { getPhiMediaWidgetLabels } from "./label-sets/media";
import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";

export type PhiMediaPickerWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "phis" | "locale">;
  config?: PhiCmsMediaPickerWidgetConfig | null;
};

export async function PhiMediaPickerWidgetServer({
  runtime,
  config,
}: PhiMediaPickerWidgetServerProps) {
  const labels = await getPhiMediaWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });
  const searchLabels = await getPhiSearchWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.MediaPicker}
      componentProps={{ labels, searchLabels, config }}
    />
  );
}
