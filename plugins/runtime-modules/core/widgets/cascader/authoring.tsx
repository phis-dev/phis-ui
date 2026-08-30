"use client";

import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiCascaderWidget } from "./client";
import {
  PHI_CASCADER_WIDGET_DEFINITION,
  type PhiCascaderWidgetConfig,
} from "./config";
import { PhiStaticOptionsToolButton } from "../../../../../components/widgets/builder/phi-static-options-picker";

export const PHI_CASCADER_WIDGET_BUILDER_PLUGIN = {
  ...createPhiCmsBuilderWidgetPlugin<PhiCascaderWidgetConfig>(
    PHI_CASCADER_WIDGET_DEFINITION,
    ({ config }) => <PhiCascaderWidget config={config} />,
  ),
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig && !config.optionsProvider ? (
    <PhiStaticOptionsToolButton
      options={config.options}
      onApply={(options) => authoring.updateConfig?.({ options })}
    />
  ) : null,
} satisfies PhiCmsBuilderWidgetPlugin<PhiCascaderWidgetConfig>;
