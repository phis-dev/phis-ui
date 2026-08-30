import type { PhiSidebarNavigationWidgetClientProps } from "./client";
import type { PhiBlockRuntime } from "../../../../../types";
import { resolvePhiNavigationItems } from "../../../../../components/widgets/server/navigation-request";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeRenderClientType } from "../../../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";

export type PhiSidebarNavigationWidgetProps = Pick<
  PhiSidebarNavigationWidgetClientProps,
  "config" | "menuTheme"
> & {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer" | "request">;
  navKey?: string;
};

export async function PhiSidebarNavigationWidget({
  runtime,
  navKey,
  config,
  menuTheme,
}: PhiSidebarNavigationWidgetProps) {
  const resolvedItems = await resolvePhiNavigationItems(runtime, navKey?.trim() || `${runtime.area}:sidebar`);
  if (resolvedItems == null || resolvedItems.length === 0) {
    return null;
  }

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.SidebarNavigation}
      componentProps={{
        runtime: { locale: runtime.locale, area: runtime.area },
        config,
        items: resolvedItems,
        menuTheme,
      }}
    />
  );
}

export async function PhiSidebarNavigationWidgetPreview({
  runtime,
  navKey,
  config,
  menuTheme,
}: PhiSidebarNavigationWidgetProps) {
  const resolvedItems = await resolvePhiNavigationItems(runtime, navKey?.trim() || `${runtime.area}:sidebar`);
  if (resolvedItems == null || resolvedItems.length === 0) {
    return null;
  }

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.SidebarNavigationPreview}
      componentProps={{
        runtime: { locale: runtime.locale, area: runtime.area },
        config,
        items: resolvedItems,
        menuTheme,
      }}
    />
  );
}
