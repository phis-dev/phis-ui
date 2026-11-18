import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../../../types/cms-plugins";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../../types/collection-view-widget";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import type { PhiRenderableBlockRenderMode } from "../../../../../types/renderable-block";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS } from "../../../../../constants/media-library-provider-keys";
import { getPhiMediaWidgetLabels } from "../../../../../components/media/label-sets/media";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";
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
  runtime,
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

  /*
   * The Media collection's renderer says the Media Label Set's words (the toolbar, the flag filter, the
   * grid, the upload surface) and Core may not import the Asset Module to get them, so they are the
   * Foundation's and loaded here -- only for a Widget bound to that collection, so no other source pays.
   * `config.presentation.labels` still lays over them.
   */
  const labels = config?.source?.providerKey === PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection
    ? await getPhiMediaWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime))
    : undefined;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.CollectionView}
      componentProps={{ config, widgetId, renderMode, preview: false, labels }}
    />
  );
}
