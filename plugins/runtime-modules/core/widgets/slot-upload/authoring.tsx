"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";

import { PHI_SLOT_UPLOAD_WIDGET_DEFINITION, type PhiSlotUploadWidgetConfig } from "./config";
import { PhiSlotUploadWidgetClient } from "./client";
import { PHI_SLOT_UPLOAD_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/slot-upload";

/**
 * What an author states -- Add-on, table and slot -- is an Inspector field of the definition. What it takes is not among the fields, because the slot
 * declares that and Core answers with it -- offering it here would be offering a way to disagree.
 */
export const PHI_SLOT_UPLOAD_WIDGET_BUILDER_PLUGIN:
PhiCmsBuilderWidgetPlugin<PhiSlotUploadWidgetConfig> = {
  ...PHI_SLOT_UPLOAD_WIDGET_DEFINITION,
  renderEditor: ({ config }) => (
    <PhiSlotUploadWidgetClient config={config} labels={PHI_SLOT_UPLOAD_WIDGET_DEFAULT_LABELS} />
  ),
};
