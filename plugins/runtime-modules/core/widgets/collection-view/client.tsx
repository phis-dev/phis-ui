"use client";

import { createElement } from "react";

import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import { PhiCollectionViewSkeletonControl } from "../../../../../components/controls/phi-collection-view-control";
import { normalizePhiCssSize } from "../../../../../components/layouts/phi-layout-contract";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { usePhiRuntimeModuleState } from "../../../../../components/runtime/runtime-module-context";
import { usePhiRuntimeModuleRenderClient } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { usePhiSignalIdentity } from "../../../../../components/runtime/runtime-signal-identity";
import { usePhiVisualAnchorParts } from "../../../../../components/runtime/runtime-visual-anchors";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../../types/collection-view-widget";
import { createPhiSignalAddress } from "../../../../../types/signals";
import type { PhiVisualAnchorAddress } from "../../../../../types/visual-anchors";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import { usePhiCollectionViewBinding } from "../../../../../components/widgets/client/shared/phi-collection-view-binding";
import {
  PhiCollectionSourceFailureText,
  readPhiCollectionViewDeclaredFailure,
} from "../../../../../components/widgets/shared/collection-source-failure";
import { PhiWidgetFailure } from "../../../../../components/widgets/shared/widget-failure-client";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiRenderableBlockRenderMode } from "../../../../../types/renderable-block";

/**
 * The parts of a Collection View a Tour can point at, as `cms:<instanceId>:<part>` (design/TOURS.md): the
 * filters and search, the toolbar, the items and the pagination. A part the view does not draw is simply
 * not found, and the step pointing at it does what its `ifMissing` says.
 */
const PHI_COLLECTION_VIEW_VISUAL_ANCHOR_PARTS = ["filters", "toolbar", "items", "pagination"] as const;

export type PhiCollectionViewWidgetProps = {
  config?: PhiCmsCollectionViewWidgetConfig | null;
  widgetId?: PhiCmsInstanceId | null;
  labels?: unknown;
  /** Where this draws; the parsed config does not carry it, so the plugin reads it off the node. */
  renderMode: PhiRenderableBlockRenderMode;
  preview?: boolean;
  skeletonActive?: boolean;
};

/**
 * The shape the items will take, since the Builder reads no data -- or the reason there will be none.
 *
 * A skeleton alone hid every misconfiguration from the one person who could fix it: the canvas looked
 * right and the live page was empty. What is plain from the declarations is said here -- in the editor
 * against the descriptors the Builder holds for the edited Area, in the server preview by the plugin,
 * which has that Area's registry. A read that would fail is not knowable without reading, and the
 * Builder does not read.
 */
function PhiCollectionViewWidgetPreview({
  config,
  widgetId,
  renderMode,
  skeletonActive = true,
}: Pick<PhiCollectionViewWidgetProps, "config" | "widgetId" | "renderMode" | "skeletonActive">) {
  const { token } = usePhiConfig();
  const { dataProviderDescriptorsByKey, collectionItemRendererKeys } = usePhiRuntimeModuleState();
  const presentation = config?.presentation;
  /*
   * Judged only in the editor: that is where the Builder mounts the edited Area's descriptors. Anywhere
   * else the context could be another Area's or none, and an empty one would claim every provider gone.
   */
  const declaredFailure = renderMode === "editor"
    ? readPhiCollectionViewDeclaredFailure({
        source: config?.source,
        itemRendererKey: config?.itemRendererKey,
        dataProviderDescriptorsByKey,
        itemRendererKeys: collectionItemRendererKeys,
      })
    : null;
  if (declaredFailure) {
    return (
      <PhiWidgetFailure
        renderMode={renderMode}
        widgetType={PhiCmsWidgetType.CollectionView}
        widgetId={widgetId}
        title={declaredFailure}
      />
    );
  }
  return (
    <PhiCollectionViewSkeletonControl
      mode={presentation?.mode ?? "grid"}
      gap={normalizePhiCssSize(presentation?.gap) ?? token.paddingSM}
      minColumnWidth={normalizePhiCssSize(presentation?.minColumnWidth) ?? 102}
      active={skeletonActive}
    />
  );
}

function PhiCollectionViewWidgetLive({
  config,
  labels,
  widgetId,
  renderMode,
}: PhiCollectionViewWidgetProps) {
  const signalIdentity = usePhiSignalIdentity();
  usePhiVisualAnchorParts(
    signalIdentity.receiver?.startsWith("cms:") ? signalIdentity.receiver as PhiVisualAnchorAddress : null,
    PHI_COLLECTION_VIEW_VISUAL_ANCHOR_PARTS,
  );
  const source = config?.source ?? null;
  const { resource, bindingError, queryError, binding } = usePhiCollectionViewBinding({
    source,
    initialQuery: config?.initialQuery,
    pageSize: config?.features.pagination?.pageSize,
  });
  // The provider ships a renderer with its resource; a Site may name another Module's instead. Both are
  // ordinary Render Clients, so neither side has to know the other exists.
  const rendererKey = config?.itemRendererKey ?? resource?.itemRendererKey ?? null;
  const ItemRenderer = usePhiRuntimeModuleRenderClient(rendererKey);
  usePhiControlSignalController<string>({
    key: "collectionReload",
    sender: widgetId == null ? null : createPhiSignalAddress("cms", widgetId),
    signalRoutes: config?.signalRoutes,
    typeKey: "collection-view-reload",
    onReceiveCapability: (capabilityId) => {
      if (capabilityId !== "reload") return false;
      binding.reload();
      return true;
    },
  });
  /*
   * The source's failures end the Widget here, before any renderer: the binding, the renderer and the
   * read. An action the Provider refused is not among them -- that lands in `binding.error` alone, and
   * the renderer says it to the person who acted.
   */
  const failure = !config
    ? "Collection View configuration is unavailable."
    : bindingError ??
      (!ItemRenderer && rendererKey ? PhiCollectionSourceFailureText.rendererUnavailable(rendererKey) : null) ??
      queryError;
  if (failure || !config || !resource || !ItemRenderer) {
    return (
      <PhiWidgetFailure
        renderMode={renderMode}
        widgetType={PhiCmsWidgetType.CollectionView}
        widgetId={widgetId}
        title={failure ?? "Collection View configuration is unavailable."}
      />
    );
  }
  // `createElement` rather than a JSX tag: the renderer is looked up, not written down, and a looked-up
  // component in tag position reads to React -- and to `react-hooks/static-components` -- as a new
  // component per render. This is the same call `PhiRuntimeModuleRenderClientHost` makes for a Widget.
  // `renderMode` goes along so a renderer's own configuration failures are said the same way.
  return createElement(ItemRenderer, { config, binding, labels, widgetId, renderMode });
}

export function PhiCollectionViewWidget(props: PhiCollectionViewWidgetProps) {
  return props.preview
    ? (
      <PhiCollectionViewWidgetPreview
        config={props.config}
        widgetId={props.widgetId}
        renderMode={props.renderMode}
        skeletonActive={props.skeletonActive}
      />
    )
    : <PhiCollectionViewWidgetLive {...props} />;
}
