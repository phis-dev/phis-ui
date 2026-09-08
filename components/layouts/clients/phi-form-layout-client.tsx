import type { CSSProperties } from "react";

import { PhiContentLayout, type PhiContentLayoutProps } from "./phi-content-layout-client";

/**
 * How wide a form's labels are when it says nothing: six of twenty-four columns, label to input 6/18.
 *
 * The ratio forms are usually built at -- wide enough for a phrase, and it leaves the input the larger
 * three quarters. One figure for every row, which is the whole point: the inputs line up because their
 * labels stand in one column, not because each row happened to need the same width.
 */
const PHI_FORM_LAYOUT_DEFAULT_LABEL_WIDTH = "25%";

export type PhiFormLayoutProps = PhiContentLayoutProps & {
  labelWidth?: string | number;
};

export function PhiFormLayout({
  layoutKind = "form",
  labelWidth,
  style,
  ...props
}: PhiFormLayoutProps) {
  return (
    <PhiContentLayout
      layoutKind={layoutKind}
      style={{
        "--phi-labeled-control-width": "100%",
        "--phi-labeled-control-label-width":
          labelWidth === undefined
            ? PHI_FORM_LAYOUT_DEFAULT_LABEL_WIDTH
            : typeof labelWidth === "number" ? `${labelWidth}px` : labelWidth,
        ...style,
      } as CSSProperties}
      {...props}
    />
  );
}
