"use client";

import { PhiTextControl } from "../../../../../controls";
import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";

import { PHI_SLOT_UPLOAD_WIDGET_DEFINITION, type PhiSlotUploadWidgetConfig } from "./config";
import { PhiSlotUploadWidgetClient } from "./client";

/**
 * What an author states: where the file goes. What it takes is not among the fields, because the slot
 * declares that and Core answers with it -- offering it here would be offering a way to disagree.
 */
export const PHI_SLOT_UPLOAD_WIDGET_BUILDER_PLUGIN:
PhiCmsBuilderWidgetPlugin<PhiSlotUploadWidgetConfig> = {
  ...PHI_SLOT_UPLOAD_WIDGET_DEFINITION,
  renderEditor: ({ config }) => <PhiSlotUploadWidgetClient config={config} />,
  renderEditorTools: ({ config, authoring }) => {
    const updateConfig = authoring?.updateConfig;
    if (!updateConfig) {
      return null;
    }
    return (
      <>
        <PhiTextControl
          label="Add-on"
          value={config.addon ?? ""}
          onChange={(addon) => updateConfig({ ...config, addon: addon ?? undefined })}
          allowClear
          placeholder="@scope/name"
        />
        <PhiTextControl
          label="Table"
          value={config.table ?? ""}
          onChange={(table) => updateConfig({ ...config, table: table ?? undefined })}
          allowClear
        />
        <PhiTextControl
          label="Slot"
          value={config.slot ?? ""}
          onChange={(slot) => updateConfig({ ...config, slot: slot ?? undefined })}
          allowClear
        />
      </>
    );
  },
};
