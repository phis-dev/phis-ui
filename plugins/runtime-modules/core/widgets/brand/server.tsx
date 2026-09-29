import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiBrandWidgetClientProps, PhiBrandWidgetConfig } from "./client";

export type PhiBrandWidgetProps = Pick<
  PhiBrandWidgetClientProps,
  "fallbackTitle" | "interactive"
> & PhiBrandWidgetConfig;

/*
 * The Brand itself is not read here. It comes from the root on the Client (`usePhiSiteBrand`), which
 * holds it with the Theme Set's Logo folded in and follows a live Theme draft.
 */
export function PhiBrandWidget({
  fallbackTitle,
  interactive,
  mode,
  fontFamily,
  fontSize,
}: PhiBrandWidgetProps) {
  const config: PhiBrandWidgetConfig = { mode, fontFamily, fontSize };

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Brand}
      componentProps={{
        config,
        fallbackTitle,
        interactive,
      }}
    />
  );
}
