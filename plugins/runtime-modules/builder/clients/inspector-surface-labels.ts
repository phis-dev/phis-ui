import type { PhiSurfaceControlLabels } from "../../../../components/controls/phi-surface-control";
import type { PhiInspectorWidgetLabels } from "../../../../components/widgets/label-types/inspector";

/** The words a Surface section needs: its own title, and the headings of its three parts. */
export type PhiInspectorSurfaceLabels = {
  section: string;
  parts: PhiSurfaceControlLabels;
};

export function resolvePhiInspectorSurfaceLabels(labels: PhiInspectorWidgetLabels): PhiInspectorSurfaceLabels {
  return {
    section: labels.sections.surface,
    parts: {
      background: labels.sections.background,
      border: labels.sections.border,
      shadow: labels.sections.shadow,
    },
  };
}
