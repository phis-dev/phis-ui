import { PhiCmsFlags } from "../../../../../constants/phi-cms";
import { hasPhiFlag } from "../../../../../helpers/flags";
import type { PhiCmsServerWidgetPlugin } from "../../../../../types";

import { PHI_SLOT_UPLOAD_WIDGET_DEFINITION, type PhiSlotUploadWidgetConfig } from "./config";
import { PhiSlotUploadWidget } from "./server";

export const PHI_SLOT_UPLOAD_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiSlotUploadWidgetConfig> = {
  ...PHI_SLOT_UPLOAD_WIDGET_DEFINITION,
  render: ({ widget, config, runtime }) => (
    <PhiSlotUploadWidget
      config={config}
      runtime={runtime}
      translate={!hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)}
    />
  ),
  renderPreview: ({ widget, config, runtime }) => (
    <PhiSlotUploadWidget
      config={{ ...config, renderMode: "preview" }}
      runtime={runtime}
      translate={!hasPhiFlag(widget.flags, PhiCmsFlags.NoTranslate)}
    />
  ),
};
