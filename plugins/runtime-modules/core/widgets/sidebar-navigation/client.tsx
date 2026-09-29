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
import {
  createPhiCoreRuntimeControllerAddress,
} from "../../../../../components/runtime/core-runtime-controller-address";
import { usePhiSignalEmitter } from "../../../../../components/runtime/runtime-signal-identity";

export type PhiSidebarNavigationWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  Pick<PhiCmsSidebarNavigationWidgetConfig, "fontFamily" | "fontSize">,
  Pick<PhiBlockRuntime, "site" | "locale" | "area">
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
  // Without a runtime the Site's locales are unknown, and no path segment can be read as one.
  const availableLocales = runtime?.site.availableLocales.map((option) => option.code) ?? [];
  const presentation = usePhiSidebarMenuPresentation(config);
  const emitSignal = usePhiSignalEmitter();

  /*
   * Signing out is asked of the Core Runtime Controller, as the account menu and the password-change
   * dialog ask it: it ends the session, says so when that fails, and loads the Page again as a fresh
   * document, so no RSC cache or client store built for the old session survives it.
   */
  function handleAction(action: "logout") {
    if (action !== "logout") {
      return;
    }
    emitSignal({
      scope: "site",
      channel: "session",
      action: "clear",
      value: null,
      valueType: "none",
      valueSchema: null,
      receiver: createPhiCoreRuntimeControllerAddress(),
    });
  }

  return (
    <PhiMenuControl
      scope="sidebar-navigation"
      mode="inline"
      menuTheme={menuTheme}
      selectedKeys={collectPhiSelectedNavKeys(pathname, items, availableLocales)}
      items={mapPhiNavItems(
        runtime?.locale.current ?? "en",
        runtime?.area ?? "public",
        pathname,
        items,
        availableLocales,
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
      selectedKeys={collectPhiSelectedNavKeys(pathname, items, [])}
      items={mapPhiNavItemsStatic(items)}
      collapsed={presentation.collapsed}
      collapsedWidth={presentation.collapsedWidth}
      inlineIndent={presentation.collapsed ? 0 : 16}
      fontFamily={presentation.fontFamily}
      fontSize={presentation.fontSize}
    />
  );
}
