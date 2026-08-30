"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PhiLocaleSwitch } from "../../../../../components/shell/phi-locale-switch";
import { PHI_LOCALE_WIDGET_DEFINITION } from "./config";

export const PHI_LOCALE_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<Record<string, never>> = {
  ...PHI_LOCALE_WIDGET_DEFINITION,
  renderEditor: ({ runtime }) => (
    <PhiLocaleSwitch
      currentLocale={runtime.locale.current}
      localeOptions={[
        { code: runtime.locale.current, label: runtime.locale.current.toUpperCase() },
        { code: "de", label: "Deutsch" },
      ]}
      mode="compact-pill"
      showText={false}
      interactive={false}
    />
  ),
};
