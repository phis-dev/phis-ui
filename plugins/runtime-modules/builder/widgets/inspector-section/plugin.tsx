import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiBuilderInspectorSectionWidget } from "../../../../../plugins/runtime-modules/builder/inspector-section-widget";
import type { PhiBuilderChromeWidgetConfig, PhiBuilderInspectorSectionWidgetSpec } from "../chrome/config";

export function createPhiBuilderInspectorSectionWidgetPlugin(
  definition: Omit<PhiCmsWidgetPlugin<PhiBuilderChromeWidgetConfig>, "render" | "renderPreview">,
  spec: PhiBuilderInspectorSectionWidgetSpec,
): PhiCmsWidgetPlugin<PhiBuilderChromeWidgetConfig> {
  return {
    ...definition,
    render: ({ runtime, registry, config }) => {
      if (!registry) {
        throw new Error(`${spec.title} Inspector requires the resolved runtime registry.`);
      }
      return (
        <PhiBuilderInspectorSectionWidget
          runtime={runtime}
          registry={registry}
          view={spec.view}
          section={spec.section}
          signalRoutes={config.signalRoutes}
        />
      );
    },
    renderPreview: () => null,
  };
}
