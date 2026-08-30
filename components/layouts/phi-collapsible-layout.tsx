import type { PhiCollapsibleLayoutProps } from "./clients/phi-collapsible-layout-client";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";
import { PhiCmsLayoutType } from "../../constants/cms-layout-types";

export type { PhiCollapsibleLayoutProps } from "./clients/phi-collapsible-layout-client";

export function PhiCollapsibleLayout(props: PhiCollapsibleLayoutProps) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsLayoutType.Collapsible}
      componentProps={{ ...props }}
    />
  );
}
