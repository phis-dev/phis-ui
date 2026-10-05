import {
  PhiFlexLayout as PhiFlexLayoutView,
  type PhiFlexLayoutProps,
} from "./clients/phi-flex-layout-client";

/** The Flex Layout in a column: gap and anchor, none of the row's distribution, wrapping or separators. */
export type PhiFlexVerticalLayoutProps = Omit<
  PhiFlexLayoutProps,
  "distribution" | "wrap" | "verticalSeparators" | "separatorBeforeFirst" | "separatorSpan"
>;

export function PhiFlexVerticalLayout(props: PhiFlexVerticalLayoutProps) {
  return <PhiFlexLayoutView {...props} layoutKind="verticalflex" />;
}
