import "server-only";

import { PhiRuntimeModuleRenderClientHost } from "../../../../../runtime-render-client";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";
import type { PhiBlockRuntime } from "../../../../../types";
import { PHI_CDN_UPLOAD_WIDGET_TYPE, type PhiCdnUploadWidgetConfig } from "./config";
import { getPhiCdnUploadWidgetLabels } from "./labels";

/** Handed to the Render Client by type, with its words read here in the page's language. */
export async function PhiCdnUploadWidget({
  config,
  runtime,
}: {
  config?: PhiCdnUploadWidgetConfig;
  runtime: PhiBlockRuntime;
}) {
  const labels = await getPhiCdnUploadWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PHI_CDN_UPLOAD_WIDGET_TYPE}
      componentProps={{ config, labels }}
    />
  );
}
