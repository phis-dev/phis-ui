import {
  PhiFlexLayout as PhiFlexLayoutView,
  type PhiFlexLayoutProps,
} from "./clients/phi-flex-layout-client";

export type { PhiFlexLayoutProps } from "./clients/phi-flex-layout-client";

export function PhiFlexLayout(props: PhiFlexLayoutProps) {
  return <PhiFlexLayoutView {...props} />;
}
