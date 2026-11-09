import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiCmsAssetInspectorWidgetConfig } from "../../../../../types/media";
import { getPhiMediaWidgetLabels } from "../../../../../components/media/label-sets/media";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";

export type PhiAssetConfigWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "locale" | "site">;
  config?: PhiCmsAssetInspectorWidgetConfig | null;
};

export async function PhiAssetConfigWidgetServer({
  runtime,
  config,
}: PhiAssetConfigWidgetServerProps) {
  const labels = await getPhiMediaWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime));

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
