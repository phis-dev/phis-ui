"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiSelectBoxWidget } from "./client";
import { PHI_SELECT_BOX_WIDGET_DEFINITION, type PhiSelectBoxWidgetConfig } from "./config";
import { PhiStaticOptionsToolButton } from "../../../../../components/widgets/builder/phi-static-options-picker";

export const PHI_SELECT_BOX_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiSelectBoxWidgetConfig> = {
  ...PHI_SELECT_BOX_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiSelectBoxWidget blockId={widget.id} config={config} />
  ),
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig && !config.optionsProvider ? (
    <PhiStaticOptionsToolButton
      options={config.options}
      onApply={(options) => {
        const optionValues = new Set(options.map((option) => option.value));
        const selectedValue = config.value?.trim();
        authoring.updateConfig?.({
          options,
          ...(
            config.allowCustom || !selectedValue || optionValues.has(selectedValue)
              ? {}
              : { value: options[0]?.value }
          ),
        });
      }}
    />
  ) : null,
};
