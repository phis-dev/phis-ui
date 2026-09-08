import type { CSSProperties } from "react";

import { PhiContentLayout, type PhiContentLayoutProps } from "./phi-content-layout-client";

/**
 * How wide a form's labels are when it says nothing: a third, as the media inspector's sections use.
 *
 * Wide enough for a phrase, narrow enough that the Control beside it stays the larger half, and the
 * same figure in both places so two forms in one Site do not sit at different widths for no reason.
 */
const PHI_FORM_LAYOUT_DEFAULT_LABEL_WIDTH = "33.333333%";

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
