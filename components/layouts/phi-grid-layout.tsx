import type { PhiGridLayoutProps } from "./clients/phi-grid-layout-client";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";
import { PhiCmsLayoutType } from "../../constants/cms-layout-types";

export type { PhiGridLayoutProps } from "./clients/phi-grid-layout-client";

export function PhiGridLayout(props: PhiGridLayoutProps) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsLayoutType.Grid}
      componentProps={{ ...props }}
    />
  );
}
