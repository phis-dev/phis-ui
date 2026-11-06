import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../../../types/cms-plugins";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../../types/collection-view-widget";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import type { PhiRenderableBlockRenderMode } from "../../../../../types/renderable-block";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { readPhiCollectionViewDeclaredFailure } from "../../../../../components/widgets/shared/collection-source-failure";
import { PhiWidgetFailureServer } from "../../../../../components/widgets/shared/widget-failure.server";

export type PhiCollectionViewWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "locale">;
  /** The Area's declarations, which the preview judges the binding against; absent outside a page render. */
  registry?: Pick<PhiCmsRuntimeRenderRegistry, "dataProviderDescriptorsByKey">;
  config?: PhiCmsCollectionViewWidgetConfig | null;
  widgetId?: PhiCmsInstanceId | null;
  renderMode: PhiRenderableBlockRenderMode;
  preview?: boolean;
};

export async function PhiCollectionViewWidgetServer({
  config,
  widgetId,
  registry,
  renderMode,
  preview = false,
}: PhiCollectionViewWidgetServerProps) {
  if (preview) {
    /*
     * The preview reads no data, so this is the one place its binding is judged: against the providers
     * the edited Area's Modules declare. The renderer a Site picked from another Module is not -- the
     * registry does not list renderers -- and is left to the editor canvas, which has them.
     */
    const declaredFailure = registry
      ? readPhiCollectionViewDeclaredFailure({
          source: config?.source,
          itemRendererKey: config?.itemRendererKey,
          dataProviderDescriptorsByKey: registry.dataProviderDescriptorsByKey,
          itemRendererKeys: null,
        })
      : null;
    if (declaredFailure) {
      return (
        <PhiWidgetFailureServer
          renderMode={renderMode}
          widgetType={PhiCmsWidgetType.CollectionView}
          widgetId={widgetId}
          title={declaredFailure}
        />
      );
    }
    return (
      <PhiRuntimeModuleRenderClientHost
        type={PhiCmsWidgetType.CollectionView}
        componentProps={{ config, widgetId, renderMode, preview: true }}
      />
    );
  }

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.CollectionView}
      componentProps={{ config, widgetId, renderMode, preview: false }}
    />
  );
}
