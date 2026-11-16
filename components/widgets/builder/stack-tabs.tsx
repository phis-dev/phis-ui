"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../types";
import {
  PHI_TAB_BAR_WIDGET_DEFINITION,
  type PhiCmsTabBarWidgetConfig,
} from "../config/stack-tabs";
import { PhiTabBarWidgetClient } from "../client/stack-tabs";
import { PhiStaticOptionsToolButton } from "./phi-static-options-picker";

export const PHI_TAB_BAR_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsTabBarWidgetConfig> = {
  ...PHI_TAB_BAR_WIDGET_DEFINITION,
  renderEditor: ({ config }) => <PhiTabBarWidgetClient config={config} />,
  /*
   * Static options only where they are what is drawn: not while a provider answers for them, and not
   * while the tabs are the followed Stack's slots.
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
