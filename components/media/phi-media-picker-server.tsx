import type { PhiBlockRuntime } from "../../types";
import type { PhiCmsMediaPickerWidgetConfig } from "../../types/media";
import { getPhiSearchWidgetLabels } from "../widgets/label-sets/search";
import { getPhiMediaWidgetLabels } from "./label-sets/media";
import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";
import { buildPhiWidgetLabelTranslatorOptions } from "../widgets/label-sets/runtime-options";

export type PhiMediaPickerWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "locale">;
  config?: PhiCmsMediaPickerWidgetConfig | null;
};

export async function PhiMediaPickerWidgetServer({
  runtime,
  config,
}: PhiMediaPickerWidgetServerProps) {
  const labels = await getPhiMediaWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
  const searchLabels = await getPhiSearchWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime));

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.MediaPicker}
      componentProps={{ labels, searchLabels, config }}
    />
  );
}
