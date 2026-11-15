import "server-only";

import { PhiRuntimeModuleRenderClientHost } from "../../../../../runtime-render-client";
import { getPhiSlotUploadWidgetLabels } from "../../../../../components/widgets/label-sets/slot-upload";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";
import { trBulk, trBulkForLocale } from "../../../../../server-helpers/translate";
import type { PhiBlockRuntime } from "../../../../../types";

import { PHI_SLOT_UPLOAD_WIDGET_TYPE, type PhiSlotUploadWidgetConfig } from "./config";

/**
 * Handed to the Render Client by type: what a slot holds depends on who is asking and on which row a
 * surface is about, and neither is knowable where a page is rendered for a cache. Its texts are read
 * here, in the page's language, and travel with it: the field's own captions from its Label Set, the
 * label somebody wrote into the config through the Site's translation unless the node says not to.
 */
export async function PhiSlotUploadWidget({
  config,
  runtime,
  translate = true,
}: {
  config?: PhiSlotUploadWidgetConfig;
  runtime: PhiBlockRuntime;
  translate?: boolean;
}) {
  const label = config?.label?.trim();
  const [labels, translatedLabel] = await Promise.all([
    getPhiSlotUploadWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime)),
    translate && label
      ? (runtime.locale.current ? trBulkForLocale(runtime.locale.current, [label]) : trBulk([label]))
        .then(([text]) => text?.trim() || label)
      : Promise.resolve(label),
  ]);
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PHI_SLOT_UPLOAD_WIDGET_TYPE}
      componentProps={{ config: config && translatedLabel ? { ...config, label: translatedLabel } : config, labels }}
    />
  );
}
