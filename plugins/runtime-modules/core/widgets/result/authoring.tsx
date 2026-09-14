"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import {
  PHI_RESULT_HOME_LINK_SOURCE_LABEL,
  PHI_RESULT_WIDGET_DEFINITION,
  type PhiCmsResultWidgetConfig,
} from "./config";
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
      // No href on the Canvas: the target is the Area the result renders in, and the Canvas is not it.
      // The label still shows, because an author sets it here and has to see what they set.
      homeLinkLabel={config.homeLinkLabel?.trim() || PHI_RESULT_HOME_LINK_SOURCE_LABEL}
    />
  ),
};
