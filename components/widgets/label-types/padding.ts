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
  /** The steps of the spacing scale, as the select box in each cell of the grid names them. */
  scaleSizes: {
    none: string;
    xxs: string;
    xs: string;
    sm: string;
    base: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
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
  scaleSizes: {
    none: "None",
    xxs: "XXS",
    xs: "XS",
    sm: "SM",
    base: "Base",
    md: "MD",
    lg: "LG",
    xl: "XL",
    xxl: "XXL",
  },
};
