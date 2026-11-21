import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../../../types/cms-plugins";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../../types/collection-view-widget";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import type { PhiRenderableBlockRenderMode } from "../../../../../types/renderable-block";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS } from "../../../../../constants/media-library-provider-keys";
import { getPhiMediaWidgetLabels } from "../../../../../components/media/label-sets/media";
import { getPhiCollectionViewWidgetLabels } from "../../../../../components/widgets/label-sets/collection-view";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { readPhiCollectionViewDeclaredFailure } from "../../../../../components/widgets/shared/collection-source-failure";
import { PhiWidgetFailureServer } from "../../../../../components/widgets/shared/widget-failure.server";

export type PhiCollectionViewWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "locale">;
  /**
   * The Area's declarations: the preview judges the binding against them, and a Widget that offers
   * reordering reads the bound resource's `itemIdentityPath` there. Absent outside a page render.
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
   * The Media collection's renderer says the Media Label Set's words (the toolbar, the flag filter, the
   * grid, the upload surface) and Core may not import the Asset Module to get them, so they are the
   * Foundation's and loaded here -- only for a Widget bound to that collection, so no other source pays.
   * `config.presentation.labels` still lays over them.
   */
  const translatorOptions = buildPhiWidgetLabelTranslatorOptions(runtime);
  const [labels, reorderLabels] = await Promise.all([
    config?.source?.providerKey === PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection
      ? getPhiMediaWidgetLabels(translatorOptions)
      : undefined,
    // The Widget's own words, only for one that offers reordering.
    config?.features.reorder?.enabled ? getPhiCollectionViewWidgetLabels(translatorOptions) : undefined,
  ]);
  /*
   * Which field of an item is its key, as the bound resource declares it: what a reorder sends as
   * `itemKeys`. The Provider's Client registration does not carry it, the declaration does.
   */
  const source = config?.source;
  const providerDescriptor = source ? registry?.dataProviderDescriptorsByKey.get(source.providerKey) : undefined;
  const itemIdentityPath = config?.features.reorder?.enabled && providerDescriptor?.kind === "collection"
    ? providerDescriptor.resources.find((resource) => resource.resourceKey === source?.resourceKey)?.itemIdentityPath ?? null
    : null;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.CollectionView}
      componentProps={{ config, widgetId, renderMode, preview: false, labels, reorderLabels, itemIdentityPath }}
    />
  );
}
