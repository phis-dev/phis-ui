"use client";

import { createElement } from "react";

import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { PhiAlertControl } from "../../controls/phi-alert-control";
import { PhiCollectionViewSkeletonControl } from "../../controls/phi-collection-view-control";
import { normalizePhiCssSize } from "../../layouts/phi-layout-contract";
import { usePhiConfig } from "../../root/phi-config-provider";
import { usePhiRuntimeModuleRenderClient } from "../../runtime/runtime-module-render-client-manifest";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../plugins/runtime-modules/core/widgets/collection-view/config";
import { createPhiSignalAddress } from "../../../types/signals";
import { usePhiControlSignalController } from "./shared/phi-control-signals";
import { usePhiCollectionViewBinding } from "./shared/phi-collection-view-binding";

export type PhiCollectionViewWidgetProps = {
  config?: PhiCmsCollectionViewWidgetConfig | null;
  widgetId?: PhiCmsInstanceId | null;
  labels?: unknown;
  preview?: boolean;
  skeletonActive?: boolean;
};

function PhiCollectionViewWidgetPreview({
  config,
  skeletonActive = true,
}: Pick<PhiCollectionViewWidgetProps, "config" | "skeletonActive">) {
  const { token } = usePhiConfig();
  const presentation = config?.presentation;
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
}: PhiCollectionViewWidgetProps) {
  const source = config?.source ?? null;
  const { resource, bindingError, binding } = usePhiCollectionViewBinding({
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
  if (!config || bindingError || !resource || !ItemRenderer) {
    return (
      <PhiAlertControl
        level="error"
        showIcon
        title={bindingError ??
          (rendererKey && !ItemRenderer
            ? `Item renderer "${rendererKey}" is not available from the active runtime modules.`
            : "Collection View configuration is unavailable.")}
      />
    );
  }
  // `createElement` rather than a JSX tag: the renderer is looked up, not written down, and a looked-up
  // component in tag position reads to React -- and to `react-hooks/static-components` -- as a new
  // component per render. This is the same call `PhiRuntimeModuleRenderClientHost` makes for a Widget.
  return createElement(ItemRenderer, { config, binding, labels, widgetId });
}

export function PhiCollectionViewWidget(props: PhiCollectionViewWidgetProps) {
  return props.preview
    ? <PhiCollectionViewWidgetPreview config={props.config} skeletonActive={props.skeletonActive} />
    : <PhiCollectionViewWidgetLive {...props} />;
}
