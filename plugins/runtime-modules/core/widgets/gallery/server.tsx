import "server-only";

import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiGalleryWidgetLabels } from "../../../../../components/widgets/label-sets/gallery";
import { PhiWidgetFailureServer } from "../../../../../components/widgets/shared/widget-failure.server";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";
import { resolvePhiRecordSource } from "../../../../../server-helpers/record-source";
import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../../../types/cms-plugins";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import type { PhiPublicMediaAssetReference } from "../../../../../types/media";
import { readPhiRuntimeTreeRenderMode } from "../../../render-mode";
import type { PhiCmsGalleryWidgetConfig } from "./config";

export type PhiGalleryWidgetServerProps = {
  runtime: PhiBlockRuntime;
  /** Where the record binding is answered; absent outside a page render, where nothing is bound. */
  registry?: Pick<PhiCmsRuntimeRenderRegistry, "recordProviderLoadersByKey">;
  config: PhiCmsGalleryWidgetConfig;
  widgetId?: PhiCmsInstanceId | null;
};

function isPublicAssetReference(value: unknown): value is PhiPublicMediaAssetReference {
  return typeof value === "object" && value !== null &&
    typeof (value as { id?: unknown }).id === "number" &&
    typeof (value as { deliveryUrl?: unknown }).deliveryUrl === "string";
}

/**
 * The pictures come from the record the binding names -- a Folder, read while the page is drawn -- so
 * they are in the HTML and the window knows what to load before anything is on screen. A record of
 * another shape is somebody else's Provider bound here by mistake. Either failure is the author's to
 * read and is nothing on a live page, rather than an empty gallery anywhere.
 */
export async function PhiGalleryWidgetServer({ runtime, registry, config, widgetId }: PhiGalleryWidgetServerProps) {
  const labels = await getPhiGalleryWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });
  const renderMode = readPhiRuntimeTreeRenderMode(config);
  const result = registry && config.source
    ? await resolvePhiRecordSource({ registry, runtime, binding: config.source })
    : { status: "missing" as const };
  if (result.status === "unavailable") {
    return (
      <PhiWidgetFailureServer
        renderMode={renderMode}
        widgetType={PhiCmsWidgetType.Gallery}
        widgetId={widgetId}
        title={labels.unavailable}
        description={result.reason}
      />
    );
  }
  const images = result.status === "ok" && Array.isArray(result.record)
    ? result.record.filter(isPublicAssetReference)
    : null;
  if (result.status === "ok" && images == null) {
    return (
      <PhiWidgetFailureServer
        renderMode={renderMode}
        widgetType={PhiCmsWidgetType.Gallery}
        widgetId={widgetId}
        title={labels.unavailable}
        description={`The record bound from "${config.source?.providerKey ?? ""}" is not a list of images.`}
      />
    );
  }
  if (!images || images.length === 0) {
    return null;
  }
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Gallery}
      componentProps={{ config, images, labels }}
    />
  );
}
