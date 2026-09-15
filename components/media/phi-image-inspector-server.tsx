import type { PhiBlockRuntime } from "../../types";
import type { PhiCmsAssetInspectorWidgetConfig } from "../../plugins/runtime-modules/asset/widgets/image-inspector/config";
import { getPhiMediaWidgetLabels } from "./label-sets/media";
import { PhiCmsWidgetType } from "../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";
import { readPhiServerApiCredentials } from "../../helpers/phis-server-credentials";

export type PhiAssetConfigWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "locale" | "site">;
  config?: PhiCmsAssetInspectorWidgetConfig | null;
};

export async function PhiAssetConfigWidgetServer({
  runtime,
  config,
}: PhiAssetConfigWidgetServerProps) {
  const labels = await getPhiMediaWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.ImageInspector}
      componentProps={{
        labels: { inspector: labels.inspector, editor: labels.editor },
        config,
        sitePublicUrl: runtime.site.publicUrl ?? null,
        locale: runtime.locale.current,
      }}
    />
  );
}
