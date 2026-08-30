"use client";

import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { PhiAlertControl } from "../../controls/phi-alert-control";
import { PhiCollectionViewSkeletonControl } from "../../controls/phi-collection-view-control";
import { normalizePhiCssSize } from "../../layouts/phi-layout-contract";
import { usePhiConfig } from "../../root/phi-config-provider";
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
  if (!config || bindingError || !resource) {
    return (
      <PhiAlertControl
        level="error"
        showIcon
        title={bindingError ?? "Collection View configuration is unavailable."}
      />
    );
  }
  const ResourceView = resource.View;
  return <ResourceView config={config} binding={binding} labels={labels} widgetId={widgetId} />;
}

export function PhiCollectionViewWidget(props: PhiCollectionViewWidgetProps) {
  return props.preview
    ? <PhiCollectionViewWidgetPreview config={props.config} skeletonActive={props.skeletonActive} />
    : <PhiCollectionViewWidgetLive {...props} />;
}
