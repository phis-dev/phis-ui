import type { PhiBlockRuntime } from "../../types";
import type { PhiCmsAreaUploadWidgetConfig } from "../../plugins/runtime-modules/asset/widgets/area-upload/config";
import { getPhiMediaWidgetLabels } from "./label-sets/media";
import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";
import { readPhiServerApiCredentials } from "../../helpers/phis-server-credentials";

export type PhiAreaUploadWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "locale">;
  config?: PhiCmsAreaUploadWidgetConfig | null;
};

export async function PhiAreaUploadWidgetServer({
  runtime,
  config,
}: PhiAreaUploadWidgetServerProps) {
  const labels = await getPhiMediaWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.AreaUpload}
      componentProps={{ labels: labels.upload, config }}
    />
  );
}
