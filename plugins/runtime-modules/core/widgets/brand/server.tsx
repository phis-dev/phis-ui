import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiBrandWidgetClientProps, PhiBrandWidgetConfig } from "./client";
import type { PhiBrandWidgetLine, PhiBrandWidgetMode } from "./config";

export type PhiBrandWidgetProps = Pick<
  PhiBrandWidgetClientProps,
  "fallbackTitle" | "fallbackEyebrow" | "interactive"
> & {
  mode?: PhiBrandWidgetMode;
  line?: PhiBrandWidgetLine;
  showLogo?: boolean;
  logoYOffset?: number;
};

/*
 * The Brand itself is not read here. It comes from the root on the Client (`usePhiSiteBrand`), which
 * holds it with the Theme Set's Logo folded in and follows a live Theme draft.
 */
export function PhiBrandWidget({
  fallbackTitle,
  fallbackEyebrow,
  interactive,
  mode,
  line,
  showLogo,
  logoYOffset,
}: PhiBrandWidgetProps) {
  const config: PhiBrandWidgetConfig = {
    mode,
    line,
    showLogo,
    logoYOffset,
  };

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Brand}
      componentProps={{
        config,
        fallbackTitle,
        fallbackEyebrow,
        interactive,
      }}
    />
  );
}
