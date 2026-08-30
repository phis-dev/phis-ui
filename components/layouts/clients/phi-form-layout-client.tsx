import { PhiContentLayout, type PhiContentLayoutProps } from "./phi-content-layout-client";

export type PhiFormLayoutProps = PhiContentLayoutProps;

export function PhiFormLayout({
  layoutKind = "form",
  ...props
}: PhiFormLayoutProps) {
  return <PhiContentLayout layoutKind={layoutKind} {...props} />;
}
