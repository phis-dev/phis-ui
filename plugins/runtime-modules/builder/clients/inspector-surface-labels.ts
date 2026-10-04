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
      style: labels.surfaceStyle.title,
      styles: {
        none: labels.surfaceStyle.none,
        card: labels.surfaceStyle.card,
        wash: labels.surfaceStyle.wash,
        custom: labels.surfaceStyle.custom,
      },
      background: labels.sections.background,
      border: labels.sections.border,
      shadow: labels.sections.shadow,
      tone: labels.tone.title,
      tones: {
        inherit: labels.tone.inherit,
        light: labels.tone.light,
        dark: labels.tone.dark,
        inverse: labels.tone.inverse,
      },
    },
  };
}
