"use client";

import { usePathname } from "next/navigation";

import { collectPhiSelectedNavKeys } from "../../../../../helpers/nav-selection";
import { PhiMenuControl, type PhiMenuControlItem } from "../../../../../components/controls/phi-menu-control";
import { mapPhiNavItems } from "../../../../../components/shell/menu-items";
import type { PhiNavItem } from "../../../../../components/shell/shell-types";
import type { PhiClientBlockBaseProps, PhiBlockRuntime, PhiNoLabels } from "../../../../../types";
import { usePhiSiderContext } from "../../../../../components/regions/presets/clients/sider-context";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import type { PhiCmsSidebarNavigationWidgetConfig } from "./config";
import { resolvePhiWidgetFontFamily } from "../../../../../components/widgets/helpers/font-family";
import { resolvePhiWidgetFontSize } from "../../../../../components/widgets/helpers/font-size";

export type PhiSidebarNavigationWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  Pick<PhiCmsSidebarNavigationWidgetConfig, "fontFamily" | "fontSize">,
  Pick<PhiBlockRuntime, "locale" | "area">
> & {
  items: PhiNavItem[];
  menuTheme?: "light" | "dark";
};

function mapPhiNavItemsStatic(items: PhiNavItem[]): PhiMenuControlItem[] {
  return items.map((item) => {
    if (item.separator) {
      return { type: "divider" };
    }

    const hasChildren = (item.children?.length ?? 0) > 0;
    return {
      key: item.key,
      disabled: true,
      label: <span>{item.label}</span>,
      ...(hasChildren ? { children: mapPhiNavItemsStatic(item.children ?? []) } : {}),
    };
  });
}

/**
 * Presentation values the sidebar menu derives from Widget config and the Sider context. The
 * Widget resolves them; the menu itself is rendered by the shared Control.
 */
function usePhiSidebarMenuPresentation(
  config: PhiSidebarNavigationWidgetClientProps["config"],
) {
  const { fonts, token } = usePhiConfig();
  const sider = usePhiSiderContext();

  return {
    fontFamily: resolvePhiWidgetFontFamily(config?.fontFamily, fonts, token),
    fontSize: resolvePhiWidgetFontSize(config?.fontSize, token, "lg"),
    collapsed: sider?.collapsed ?? false,
    collapsedWidth: sider?.collapsedWidth ?? 40,
  };
}

export function PhiSidebarNavigationWidgetClient({
  config,
  runtime,
  items,
  menuTheme,
}: PhiSidebarNavigationWidgetClientProps) {
  const pathname = usePathname() ?? "/";
  const presentation = usePhiSidebarMenuPresentation(config);

  async function handleAction(action: "logout") {
    if (action !== "logout") {
      return;
    }

    const csrfResponse = await fetch("/api/auth/csrf", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const csrfPayload = (await csrfResponse.json().catch(() => ({}))) as { token?: string };
    const csrfToken = csrfPayload.token?.trim() ?? "";

    if (!csrfResponse.ok || !csrfToken) {
      return;
    }

    const logoutResponse = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      cache: "no-store",
    });

    if (logoutResponse.ok) {
      window.location.assign(`/${runtime?.locale.current ?? "en"}`);
    }
  }

  return (
    <PhiMenuControl
      scope="sidebar-navigation"
      mode="inline"
      menuTheme={menuTheme}
      selectedKeys={collectPhiSelectedNavKeys(pathname, items)}
      items={mapPhiNavItems(
        runtime?.locale.current ?? "en",
        runtime?.area ?? "public",
        pathname,
        items,
        { onAction: handleAction },
      )}
      collapsed={presentation.collapsed}
      collapsedWidth={presentation.collapsedWidth}
      inlineIndent={presentation.collapsed ? 0 : 16}
      fontFamily={presentation.fontFamily}
      fontSize={presentation.fontSize}
    />
  );
}

export function PhiSidebarNavigationWidgetPreviewClient({
  config,
  runtime: _runtime,
  items,
  menuTheme,
}: PhiSidebarNavigationWidgetClientProps) {
  void _runtime;
  const pathname = usePathname() ?? "/";
  const presentation = usePhiSidebarMenuPresentation(config);

  return (
    <PhiMenuControl
      scope="sidebar-navigation-preview"
      mode="inline"
      menuTheme={menuTheme}
      selectedKeys={collectPhiSelectedNavKeys(pathname, items)}
      items={mapPhiNavItemsStatic(items)}
      collapsed={presentation.collapsed}
      collapsedWidth={presentation.collapsedWidth}
      inlineIndent={presentation.collapsed ? 0 : 16}
      fontFamily={presentation.fontFamily}
      fontSize={presentation.fontSize}
    />
  );
}
