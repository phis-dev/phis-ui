"use client";

import type { PhiBlockRuntime, PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiOtpWidget } from "./client";
import {
  PHI_OTP_WIDGET_DEFINITION,
  type PhiCmsOtpWidgetConfig,
} from "./config";

export const PHI_OTP_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsOtpWidgetConfig> = {
  ...PHI_OTP_WIDGET_DEFINITION,
  renderEditor: ({ widget, runtime, config }) => (
    <PhiOtpWidget
      blockId={widget.id}
      runtime={runtime as PhiBlockRuntime}
      config={config}
    />
  ),
};
