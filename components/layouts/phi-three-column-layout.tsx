import {
  PhiThreeColumnLayout as PhiThreeColumnLayoutView,
  type PhiThreeColumnLayoutProps,
} from "./clients/phi-three-column-layout-client";

export type { PhiThreeColumnLayoutProps } from "./clients/phi-three-column-layout-client";

export function PhiThreeColumnLayout(props: PhiThreeColumnLayoutProps) {
  return <PhiThreeColumnLayoutView {...props} />;
}
