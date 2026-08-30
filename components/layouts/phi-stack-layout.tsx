import type { PhiStackLayoutProps } from "./clients/phi-stack-layout-client";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";
import { PhiCmsLayoutType } from "../../constants/cms-layout-types";

export type { PhiStackLayoutProps } from "./clients/phi-stack-layout-client";

export function PhiStackLayout(props: PhiStackLayoutProps) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsLayoutType.Stack}
      componentProps={{ ...props }}
    />
  );
}
