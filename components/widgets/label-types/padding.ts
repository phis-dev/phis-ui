import { PHI_SPACING_SCALE_DEFAULT_LABELS, type PhiSpacingScaleLabels } from "./spacing-scale";

export type PhiPaddingWidgetLabels = {
  title: string;
  description: string;
  fields: {
    top: string;
    gap: string;
    left: string;
    right: string;
    bottom: string;
  };
  placeholders: {
    value: string;
  };
  /** The gap select's choice for a Layout that takes the Theme's Layout gap. */
  gapTheme: string;
  /** The steps of the spacing scale, as the select box in each cell of the grid names them. */
  scaleSizes: PhiSpacingScaleLabels;
};

export const PHI_PADDING_WIDGET_DEFAULT_LABELS: PhiPaddingWidgetLabels = {
  title: "Padding",
  description: "Configure top, gap, left, right, and bottom spacing separately.",
  fields: {
    top: "Top",
    gap: "Gap",
    left: "Left",
    right: "Right",
    bottom: "Bottom",
  },
  placeholders: {
    value: "none",
  },
  gapTheme: "Theme",
  scaleSizes: { ...PHI_SPACING_SCALE_DEFAULT_LABELS },
};
