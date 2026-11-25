import "server-only";

import { PhiRuntimeModuleRenderClientHost } from "../../../../../runtime-render-client";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";
import type { PhiBlockRuntime } from "../../../../../types";
import { PHI_CDN_UPLOAD_WIDGET_TYPE, type PhiCdnUploadWidgetConfig } from "./config";
import { getPhiCdnUploadWidgetLabels } from "./labels";
import { getPhiMediaUploadLabels } from "../../../../../components/media/label-sets/media-upload";

/** Handed to the Render Client by type, with its words read here in the page's language. */
export async function PhiCdnUploadWidget({
  config,
  runtime,
}: {
  config?: PhiCdnUploadWidgetConfig;
  runtime: PhiBlockRuntime;
}) {
  const translator = buildPhiWidgetLabelTranslatorOptions(runtime);
  // The Media upload surface's own words (drop area, progress, refusals) and the CDN's for its fields.
  const [labels, { upload: uploadLabels }] = await Promise.all([
    getPhiCdnUploadWidgetLabels(translator),
    getPhiMediaUploadLabels(translator),
  ]);
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PHI_CDN_UPLOAD_WIDGET_TYPE}
      componentProps={{ config, labels, uploadLabels }}
    />
  );
}
