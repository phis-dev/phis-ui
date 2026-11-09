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
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "viewer" | "request">;
  navKey?: string;
};

/** The Widget and its preview differ in nothing but the Client type the host mounts. */
async function renderSidebarNavigation(
  { runtime, navKey, config, menuTheme }: PhiSidebarNavigationWidgetProps,
  type: typeof PhiCmsWidgetType.SidebarNavigation | typeof PhiRuntimeRenderClientType.SidebarNavigationPreview,
) {
  const resolvedItems = await resolvePhiNavigationItems(runtime, navKey?.trim() || `${runtime.area}:sidebar`);
  if (resolvedItems == null || resolvedItems.length === 0) {
    return null;
  }

  return (
    <PhiRuntimeModuleRenderClientHost
      type={type}
      componentProps={{
        runtime: { site: runtime.site, locale: runtime.locale, area: runtime.area },
        config,
        items: resolvedItems,
        menuTheme,
      }}
    />
  );
}

export async function PhiSidebarNavigationWidget(props: PhiSidebarNavigationWidgetProps) {
  return renderSidebarNavigation(props, PhiCmsWidgetType.SidebarNavigation);
}

export async function PhiSidebarNavigationWidgetPreview(props: PhiSidebarNavigationWidgetProps) {
  return renderSidebarNavigation(props, PhiRuntimeRenderClientType.SidebarNavigationPreview);
}
