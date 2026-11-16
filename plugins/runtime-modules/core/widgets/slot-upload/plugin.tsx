import type { PhiCmsServerWidgetPlugin } from "../../../../../types";

import { PHI_SLOT_UPLOAD_WIDGET_DEFINITION, type PhiSlotUploadWidgetConfig } from "./config";
import { PhiSlotUploadWidget } from "./server";

export const PHI_SLOT_UPLOAD_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiSlotUploadWidgetConfig> = {
  ...PHI_SLOT_UPLOAD_WIDGET_DEFINITION,
  render: ({ config, runtime }) => <PhiSlotUploadWidget config={config} runtime={runtime} />,
  renderPreview: ({ config, runtime }) => (
    <PhiSlotUploadWidget config={{ ...config, renderMode: "preview" }} runtime={runtime} />
  ),
};
