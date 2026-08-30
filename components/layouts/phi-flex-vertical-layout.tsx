import {
  PhiFlexVerticalLayout as PhiFlexVerticalLayoutView,
  type PhiFlexVerticalLayoutProps,
} from "./clients/phi-flex-vertical-layout-client";

export type { PhiFlexVerticalLayoutProps } from "./clients/phi-flex-vertical-layout-client";

export function PhiFlexVerticalLayout(props: PhiFlexVerticalLayoutProps) {
  return <PhiFlexVerticalLayoutView {...props} />;
}
