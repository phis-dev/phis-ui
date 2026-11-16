import "server-only";

import { PhiRuntimeModuleRenderClientHost } from "../../../../../runtime-render-client";
import { getPhiSlotUploadWidgetLabels } from "../../../../../components/widgets/label-sets/slot-upload";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";
import type { PhiBlockRuntime } from "../../../../../types";

import { PHI_SLOT_UPLOAD_WIDGET_TYPE, type PhiSlotUploadWidgetConfig } from "./config";

/**
 * Handed to the Render Client by type: what a slot holds depends on who is asking and on which row a
 * surface is about, and neither is knowable where a page is rendered for a cache. Its texts are read
 * here, in the page's language, and travel with it: the field's own captions from its Label Set; the
 * label somebody wrote into the config arrives translated (server-helpers/cms-widget-texts.ts).
 */
export async function PhiSlotUploadWidget({
  config,
  runtime,
}: {
  config?: PhiSlotUploadWidgetConfig;
  runtime: PhiBlockRuntime;
}) {
  const labels = await getPhiSlotUploadWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime));
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PHI_SLOT_UPLOAD_WIDGET_TYPE}
      componentProps={{ config, labels }}
    />
  );
}
