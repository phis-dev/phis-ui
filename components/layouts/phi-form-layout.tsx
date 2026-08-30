import {
  PhiFormLayout as PhiFormLayoutView,
  type PhiFormLayoutProps,
} from "./clients/phi-form-layout-client";

export type { PhiFormLayoutProps } from "./clients/phi-form-layout-client";

export function PhiFormLayout(props: PhiFormLayoutProps) {
  return <PhiFormLayoutView {...props} />;
}
