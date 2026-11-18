import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiCmsAreaUploadWidgetConfig } from "../../../../../types/media";
import { getPhiMediaUploadLabels } from "../../../../../components/media/label-sets/media-upload";
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
  const { upload } = await getPhiMediaUploadLabels(buildPhiWidgetLabelTranslatorOptions(runtime));

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.AreaUpload}
      componentProps={{ labels: upload, config }}
    />
  );
}
