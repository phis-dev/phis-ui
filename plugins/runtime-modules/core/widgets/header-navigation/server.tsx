import type { PhiBlockRuntime } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { resolvePhiNavigationItems } from "../../../../../components/widgets/server/navigation-request";
import type { PhiHeaderNavigationWidgetClientProps } from "./client";

export type PhiHeaderNavigationWidgetProps = Pick<
  PhiHeaderNavigationWidgetClientProps,
  "menuTheme" | "height" | "align" | "interactive"
> & {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer" | "request">;
  navKey?: string;
};

export async function PhiHeaderNavigationWidget({
  runtime,
  navKey,
  menuTheme,
  height,
  align,
  interactive = true,
}: PhiHeaderNavigationWidgetProps) {
  const items = await resolvePhiNavigationItems(runtime, navKey?.trim() || `${runtime.area}:header`);
  if (items == null) {
    return null;
  }

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.HeaderNavigation}
      componentProps={{
        runtime: { locale: runtime.locale, area: runtime.area },
        items,
        menuTheme,
        height,
        align,
        interactive,
      }}
    />
  );
}
