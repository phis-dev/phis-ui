"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_HELLO_WORLD_WIDGET_DEFINITION, type PhiCmsHelloWorldWidgetConfig } from "./config";
import { PhiHelloWorldWidget } from "./client";

export const PHI_HELLO_WORLD_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsHelloWorldWidgetConfig> = {
  ...PHI_HELLO_WORLD_WIDGET_DEFINITION,
  renderEditor: ({ widget, runtime, tree, config }) => (
    <PhiHelloWorldWidget
      key={`widget-${widget.id}`}
      labels={{ title: "Hello World" }}
      config={config}
      runtime={runtime}
      items={[
        { key: "locale", label: "Locale", value: runtime.locale.current },
        { key: "site", label: "Site", value: runtime.site.name ?? runtime.site.key },
        { key: "path", label: "Path", value: tree.page?.path || "/" },
        { key: "area", label: "Area", value: runtime.area },
      ]}
    />
  ),
};
