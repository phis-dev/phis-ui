"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiStepsWidget } from "./client";
import { PHI_STEPS_WIDGET_DEFINITION, type PhiStepsWidgetConfig } from "./config";
import { PhiStaticOptionsToolButton } from "../../../../../components/widgets/builder/phi-static-options-picker";

export const PHI_STEPS_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiStepsWidgetConfig> = {
  ...PHI_STEPS_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiStepsWidget blockId={widget.id} config={config} />
  ),
  /*
   * Static options only where they are what is drawn: not while a provider answers for them, and not
   * while the options are the followed Stack's slots.
   */
  renderEditorTools: ({ config, authoring }) =>
    authoring?.updateConfig && !config.optionsProvider && config.valueMode !== "stack-slot-index" ? (
      <PhiStaticOptionsToolButton
        options={config.options}
        onApply={(options) => {
          const selectedValue = config.value?.trim();
          authoring.updateConfig?.({
            options,
            ...(!selectedValue || options.some((option) => option.value === selectedValue)
              ? {}
              : { value: options[0]?.value }),
          });
        }}
      />
    ) : null,
};
