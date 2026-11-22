import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../../../types/cms-plugins";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../../types/collection-view-widget";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import type { PhiRenderableBlockRenderMode } from "../../../../../types/renderable-block";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY } from "../../../../../constants/media-library-provider-keys";
import { getPhiMediaWidgetLabels } from "../../../../../components/media/label-sets/media";
import { getPhiCollectionViewWidgetLabels } from "../../../../../components/widgets/label-sets/collection-view";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { readPhiCollectionViewDeclaredFailure } from "../../../../../components/widgets/shared/collection-source-failure";
import { PhiWidgetFailureServer } from "../../../../../components/widgets/shared/widget-failure.server";

export type PhiCollectionViewWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "locale">;
  /**
   * The Area's declarations: the preview judges the binding against them, and the live Widget reads the
   * bound resource's declaration there -- its renderer, `itemIdentityPath` and tools. Absent outside a
   * page render.
   */
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
   * The bound resource as the Area's Modules declare it: the renderer it names, the key path of its
   * items (what a reorder sends as `itemKeys`) and the actions, filters and panels its tools may offer.
   * The Provider's Client registration does not carry them, the declaration does, so the Server hands
   * it on and the renderer offers what the resource declares (`PhiCollectionProviderResourceDescriptor`).
   */
  const source = config?.source;
  const providerDescriptor = source ? registry?.dataProviderDescriptorsByKey.get(source.providerKey) : undefined;
  const resourceDescriptor = providerDescriptor?.kind === "collection"
    ? providerDescriptor.resources.find((resource) => resource.resourceKey === source?.resourceKey) ?? null
    : null;
  const rendererKey = config?.itemRendererKey ?? resourceDescriptor?.itemRendererKey ?? null;

  /*
   * The Media renderer says the Media Label Set's words (the toolbar, the flag filter, the grid, the
   * upload surface) and Core may not import the Asset Module to get them, so they are the Foundation's
   * and loaded here -- for a Widget whose items that renderer draws, whichever Provider it is bound to
   * (the Media library, a gallery of references), and for no other. `config.presentation.labels` still
   * lays over them.
   */
  const translatorOptions = buildPhiWidgetLabelTranslatorOptions(runtime);
  const [labels, reorderLabels] = await Promise.all([
    rendererKey === PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY ? getPhiMediaWidgetLabels(translatorOptions) : undefined,
    // The Widget's own words, only for one that offers reordering.
    config?.features.reorder?.enabled ? getPhiCollectionViewWidgetLabels(translatorOptions) : undefined,
  ]);

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.CollectionView}
      componentProps={{ config, widgetId, renderMode, preview: false, labels, reorderLabels, resourceDescriptor }}
    />
  );
}
