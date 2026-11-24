"use client";

import { createElement, useCallback, useMemo, useState } from "react";

import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import { PhiCollectionViewSkeletonControl } from "../../../../../components/controls/phi-collection-view-control";
import { PhiCollectionReorderContext } from "../../../../../components/controls/phi-collection-reorder-context";
import { usePhiCollectionReorderBinding } from "../../../../../components/widgets/client/shared/phi-collection-reorder";
import { usePhiApplicationFeedback } from "../../../../../components/runtime/use-phi-application-feedback";
import {
  PHI_COLLECTION_VIEW_WIDGET_DEFAULT_LABELS,
  type PhiCollectionViewWidgetLabels,
} from "../../../../../components/widgets/label-types/collection-view";
import { normalizePhiCssSize } from "../../../../../components/layouts/phi-layout-contract";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { usePhiRuntimeModuleState } from "../../../../../components/runtime/runtime-module-context";
import { usePhiRuntimeModuleRenderClient } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { usePhiSignalIdentity } from "../../../../../components/runtime/runtime-signal-identity";
import { usePhiVisualAnchorParts } from "../../../../../components/runtime/runtime-visual-anchors";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../../types/collection-view-widget";
import type { PhiCollectionProviderResourceDescriptor } from "../../../../../types/collection-provider";
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
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { findPhiSignalListenRoute, resolvePhiSignalListenFilter } from "../../../../../helpers/signal-listen-routes";
import { readPhiTableBindingParamsSignalValue } from "../../../../../types/table-signal-values";
import { layPhiCollectionBindingParams } from "../../../../../components/widgets/client/shared/phi-collection-binding-params";
import { isPhiRecord } from "../../../../../helpers/is-record";
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
  /** The Widget's own words (the reorder handle and refusal), loaded where `features.reorder` is on. */
  reorderLabels?: PhiCollectionViewWidgetLabels;
  /**
   * The bound resource as the Area's Modules declare it, read by the Server from the Area's registry:
   * its item key path (what a reorder sends) and the actions, filters and panels its renderer's tools may
   * offer. Handed on to the renderer as `resource`. `null` where the Area declares no such resource.
   */
  resourceDescriptor?: PhiCollectionProviderResourceDescriptor | null;
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
  reorderLabels,
  resourceDescriptor,
  widgetId,
  renderMode,
}: PhiCollectionViewWidgetProps) {
  const signalIdentity = usePhiSignalIdentity();
  usePhiVisualAnchorParts(
    signalIdentity.receiver?.startsWith("cms:") ? signalIdentity.receiver as PhiVisualAnchorAddress : null,
    PHI_COLLECTION_VIEW_VISUAL_ANCHOR_PARTS,
  );
  /*
   * The binding params, as the Table takes them (`bindingParamsChange`): the configured `source.params`
   * until a received `{ params }` is laid over them, and handed to the Provider as `source.params`. A
   * new set starts the list over -- first page, the initial query, nothing of the old answer shown
   * (`usePhiCollectionViewBinding`). The chosen set is tagged with the configuration it was laid over, so
   * a Builder edit of the configured params is a new starting point.
   */
  const configuredSource = config?.source ?? null;
  const configuredBindingParams = useMemo<Record<string, unknown>>(
    () => isPhiRecord(configuredSource?.params) ? configuredSource.params : {},
    [configuredSource],
  );
  const bindingParamsSeed = JSON.stringify(configuredBindingParams);
  const [chosenBindingParams, setChosenBindingParams] =
    useState<{ seed: string; params: Record<string, unknown> } | null>(null);
  const bindingParams = chosenBindingParams?.seed === bindingParamsSeed
    ? chosenBindingParams.params
    : configuredBindingParams;
  const source = useMemo(
    () => configuredSource ? { ...configuredSource, params: bindingParams } : null,
    [bindingParams, configuredSource],
  );
  // What the renderer reads of the binding is the source the Provider is asked with.
  const resolvedConfig = useMemo(() => config ? { ...config, source } : config, [config, source]);
  const listenRoutes = useMemo(() => config?.signalRoutes?.listens ?? [], [config?.signalRoutes?.listens]);
  usePhiSignalListener(useCallback((signal) => {
    const route = findPhiSignalListenRoute(listenRoutes, signal, signalIdentity.receiver);
    if (route?.capabilityId !== "bindingParamsChange") return;
    const next = readPhiTableBindingParamsSignalValue(signal.value);
    // The same set again is no change: nothing starts over, nothing is asked again.
    const params = next ? layPhiCollectionBindingParams(bindingParams, next.params) : null;
    if (params) setChosenBindingParams({ seed: bindingParamsSeed, params });
  }, [bindingParams, bindingParamsSeed, listenRoutes, signalIdentity.receiver]), useMemo(() => resolvePhiSignalListenFilter(listenRoutes), [listenRoutes]), signalIdentity.receiver);
  const { resource, bindingError, queryError, binding } = usePhiCollectionViewBinding({
    source,
    initialQuery: config?.initialQuery,
    pageSize: config?.features.pagination?.pageSize,
  });
  // The provider ships a renderer with its resource; a Site may name another Module's instead. Both are
  // ordinary Render Clients, so neither side has to know the other exists.
  const rendererKey = config?.itemRendererKey ?? resource?.itemRendererKey ?? null;
  /*
   * Drag reordering (`features.reorder`) goes around whatever the renderer draws: the renderer gets the
   * binding with the items in the dropped order while the Provider writes it, and its Collection Control
   * puts the handles on (`PhiCollectionReorderContext`). The Widget keeps no order of its own.
   */
  const { showMessage } = usePhiApplicationFeedback();
  const { binding: presentedBinding, reorder } = usePhiCollectionReorderBinding({
    config: resolvedConfig,
    binding,
    itemIdentityPath: resourceDescriptor?.itemIdentityPath ?? null,
    labels: reorderLabels ?? PHI_COLLECTION_VIEW_WIDGET_DEFAULT_LABELS,
    showMessage,
  });
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
  // `renderMode` goes along so a renderer's own configuration failures are said the same way, and the
  // resource's declaration so its tools follow what the resource offers (`resource`, null where none).
  return (
    <PhiCollectionReorderContext.Provider value={reorder}>
      {createElement(ItemRenderer, {
        config: resolvedConfig ?? config,
        binding: presentedBinding,
        labels,
        widgetId,
        renderMode,
        resource: resourceDescriptor ?? null,
      })}
    </PhiCollectionReorderContext.Provider>
  );
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
