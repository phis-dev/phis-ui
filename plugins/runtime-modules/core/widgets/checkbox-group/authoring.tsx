"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiCheckboxGroupWidget } from "./client";
import {
  PHI_CHECKBOX_GROUP_WIDGET_DEFINITION,
  PHI_CHECKBOX_GROUP_WIDGET_PLUGIN_TYPE,
  type PhiCheckboxGroupWidgetConfig,
} from "./config";
import { PhiStaticOptionsToolButton } from "../../../../../components/widgets/builder/phi-static-options-picker";

export const PHI_CHECKBOX_GROUP_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCheckboxGroupWidgetConfig> = {
  ...PHI_CHECKBOX_GROUP_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiCheckboxGroupWidget blockId={widget.id} config={config} />
  ),
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig && !config.optionsProvider ? (
    <PhiStaticOptionsToolButton
      options={config.options}
      onApply={(options) => {
        const optionValues = new Set(options.map((option) => option.value));
        authoring.updateConfig?.({
          options,
          value: (config.value ?? []).filter((value) => optionValues.has(value)),
        });
      }}
    />
  ) : null,
};

export { PHI_CHECKBOX_GROUP_WIDGET_PLUGIN_TYPE };
