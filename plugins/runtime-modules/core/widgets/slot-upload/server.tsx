import { PhiRuntimeModuleRenderClientHost } from "../../../../../runtime-render-client";

import { PHI_SLOT_UPLOAD_WIDGET_TYPE, type PhiSlotUploadWidgetConfig } from "./config";

/**
 * Handed to the Render Client by type: what a slot holds depends on who is asking and on which row a
 * surface is about, and neither is knowable where a page is rendered for a cache.
 */
export function PhiSlotUploadWidget({ config }: { config?: PhiSlotUploadWidgetConfig }) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PHI_SLOT_UPLOAD_WIDGET_TYPE}
      componentProps={{ config }}
    />
  );
}
