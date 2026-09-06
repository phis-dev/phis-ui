import type { PhiCarouselLayoutProps } from "./clients/phi-carousel-layout-client";
import { PhiRuntimeModuleRenderClientHost } from "../runtime/runtime-module-render-client-manifest";
import { PhiCmsLayoutType } from "../../constants/cms-layout-types";

export type { PhiCarouselLayoutProps } from "./clients/phi-carousel-layout-client";

export function PhiCarouselLayout(props: PhiCarouselLayoutProps) {
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsLayoutType.Carousel}
      componentProps={{ ...props }}
    />
  );
}
