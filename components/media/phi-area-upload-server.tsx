import type { PhiBlockRuntime } from "../../types";
import type { PhiCmsAreaUploadWidgetConfig } from "../../plugins/runtime-modules/asset/widgets/area-upload/config";
import { getPhiMediaWidgetLabels } from "./label-sets/media";
import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";

export type PhiAreaUploadWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "phis" | "locale">;
  config?: PhiCmsAreaUploadWidgetConfig | null;
};

export async function PhiAreaUploadWidgetServer({
  runtime,
  config,
}: PhiAreaUploadWidgetServerProps) {
  const labels = await getPhiMediaWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.AreaUpload}
      componentProps={{ labels: labels.upload, config }}
    />
  );
}
