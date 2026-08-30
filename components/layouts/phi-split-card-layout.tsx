import {
  PhiSplitCardLayout as PhiSplitCardLayoutView,
  type PhiSplitCardLayoutProps,
} from "./clients/phi-split-card-layout-client";

export type { PhiSplitCardLayoutProps } from "./clients/phi-split-card-layout-client";

export function PhiSplitCardLayout(props: PhiSplitCardLayoutProps) {
  return <PhiSplitCardLayoutView {...props} />;
}
