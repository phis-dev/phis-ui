"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiSegmentedWidget } from "./client";
import { PHI_SEGMENTED_WIDGET_DEFINITION, type PhiSegmentedWidgetConfig } from "./config";
import { PhiStaticOptionsToolButton } from "../../../../../components/widgets/builder/phi-static-options-picker";
import { usePhiAuthoringToolsLabels } from "../../../../../components/widgets/client/shared/phi-authoring-tools-labels";

/* In the Builder a Stack mode without a Stack says so, rather than drawing nothing nobody can select. */
function PhiSegmentedWidgetEditor({ blockId, config }: { blockId: string | number; config: PhiSegmentedWidgetConfig }) {
  const labels = usePhiAuthoringToolsLabels();
  return (
    <PhiSegmentedWidget
      blockId={blockId}
      config={config}
      emptyHint={config.valueMode === "stack-slot-index" ? labels.stackChoice.noStack : undefined}
    />
  );
}

export const PHI_SEGMENTED_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiSegmentedWidgetConfig> = {
  ...PHI_SEGMENTED_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => <PhiSegmentedWidgetEditor blockId={widget.id} config={config} />,
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
