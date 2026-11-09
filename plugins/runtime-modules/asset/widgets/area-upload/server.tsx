import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiCmsAreaUploadWidgetConfig } from "../../../../../types/media";
import { getPhiMediaWidgetLabels } from "../../../../../components/media/label-sets/media";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";

export type PhiAreaUploadWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "locale">;
  config?: PhiCmsAreaUploadWidgetConfig | null;
};

export async function PhiAreaUploadWidgetServer({
  runtime,
  config,
}: PhiAreaUploadWidgetServerProps) {
  const labels = await getPhiMediaWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime));

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.AreaUpload}
      componentProps={{ labels: labels.upload, config }}
    />
  );
}
