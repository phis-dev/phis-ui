import {
  PhiContentLayout as PhiContentLayoutView,
  type PhiContentLayoutProps,
} from "./clients/phi-content-layout-client";

export type { PhiContentLayoutProps } from "./clients/phi-content-layout-client";

export function PhiContentLayout(props: PhiContentLayoutProps) {
  return <PhiContentLayoutView {...props} />;
}
