import "server-only";

import { PhiRuntimeModuleRenderClientHost } from "../../../../../runtime-render-client";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";
import { resolvePhiFormDefinition, resolvePhiFormLabels } from "../../../../../components/forms/form-resolution";
import type { PhiBlockRuntime } from "../../../../../types";
import { PHI_CDN_UPLOAD_FORM } from "../../forms";
import { PHI_CDN_UPLOAD_WIDGET_TYPE, type PhiCdnUploadWidgetConfig } from "./config";
import { getPhiCdnUploadWidgetLabels } from "./labels";
import { getPhiMediaUploadLabels } from "../../../../../components/media/label-sets/media-upload";

/**
 * Handed to the Render Client by type, with its words read here in the page's language: the upload
 * Form's descriptor and labels (`forms.ts`), which draw the fields, and the widget's own for the rest.
 */
export async function PhiCdnUploadWidget({
  config,
  runtime,
}: {
  config?: PhiCdnUploadWidgetConfig;
  runtime: PhiBlockRuntime;
}) {
  const translator = buildPhiWidgetLabelTranslatorOptions(runtime);
  // The Media upload surface's own words (drop area, progress, refusals) and the CDN's for its fields.
  const [labels, { upload: uploadLabels }, formLabels] = await Promise.all([
    getPhiCdnUploadWidgetLabels(translator),
    getPhiMediaUploadLabels(translator),
    resolvePhiFormLabels({ runtime, resolvedForm: resolvePhiFormDefinition({ presetDefinition: PHI_CDN_UPLOAD_FORM }) }),
  ]);
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PHI_CDN_UPLOAD_WIDGET_TYPE}
      componentProps={{
        config,
        labels,
        uploadLabels,
        form: { descriptor: PHI_CDN_UPLOAD_FORM.descriptor, labels: formLabels },
      }}
    />
  );
}
