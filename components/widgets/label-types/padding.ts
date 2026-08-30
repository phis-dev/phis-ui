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
};
