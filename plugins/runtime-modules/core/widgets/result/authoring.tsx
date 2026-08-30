"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_RESULT_WIDGET_DEFINITION, type PhiCmsResultWidgetConfig } from "./config";
import { PhiResultWidgetBody } from "../../../../../components/widgets/shared/result-body";

export const PHI_RESULT_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsResultWidgetConfig> = {
  ...PHI_RESULT_WIDGET_DEFINITION,
  renderEditor: ({ widget, config }) => (
    <PhiResultWidgetBody
      key={`widget-editor-${widget.id}`}
      config={config}
      code={config.code}
      title={config.title}
      subTitle={config.subTitle}
    />
  ),
};
