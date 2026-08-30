"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiMultiSelectWidget } from "./client";
import { PHI_MULTI_SELECT_WIDGET_DEFINITION, type PhiMultiSelectWidgetConfig } from "./config";
import { PhiStaticOptionsToolButton } from "../../../../../components/widgets/builder/phi-static-options-picker";

export const PHI_MULTI_SELECT_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiMultiSelectWidgetConfig> = {
  ...PHI_MULTI_SELECT_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiMultiSelectWidget blockId={widget.id} config={config} />
  ),
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig && !config.optionsProvider ? (
    <PhiStaticOptionsToolButton
      options={config.options}
      onApply={(options) => {
        const optionValues = new Set(options.map((option) => option.value));
        const selectedValues = config.value ?? [];
        const nextValue: string[] | number[] = config.allowCustom
          ? selectedValues
          : config.valueType === "number[]"
            ? (selectedValues as number[]).filter((value) => optionValues.has(String(value)))
            : (selectedValues as string[]).filter((value) => optionValues.has(value));
        authoring.updateConfig?.({ options, value: nextValue });
      }}
    />
  ) : null,
};
