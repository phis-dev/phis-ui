"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";

import { collectPhiSelectedNavKeys } from "../../../../../helpers/nav-selection";
import { PhiMenuControl } from "../../../../../components/controls/phi-menu-control";
import type { PhiClientBlockBaseProps, PhiBlockRuntime, PhiNoLabels } from "../../../../../types";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { mapPhiNavItems } from "../../../../../components/shell/menu-items";
import { type PhiMenuTheme, type PhiNavItem } from "../../../../../components/shell/shell-types";

export type PhiHeaderNavigationWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  Record<string, never>,
  Pick<PhiBlockRuntime, "locale" | "area">
> & {
  items: PhiNavItem[];
  menuTheme?: PhiMenuTheme;
  height?: CSSProperties["height"];
  align?: "left" | "center";
  interactive?: boolean;
};

export function PhiHeaderNavigationWidgetClient({
  runtime,
  items,
  menuTheme,
  height,
  align = "left",
  interactive = true,
}: PhiHeaderNavigationWidgetClientProps) {
  const { token } = usePhiConfig();
  const pathname = usePathname() ?? "/";
  const selectedKeys = collectPhiSelectedNavKeys(pathname, items);
  const menuItems = mapPhiNavItems(runtime?.locale.current ?? "en", runtime?.area ?? "public", pathname, items, {
    interactive,
  });
  const resolvedHeight =
    typeof height === "number" ? `${height}px` : (height ?? "100%");

  if (menuItems.length === 0) {
    return null;
  }

  if (!interactive) {
    return (
      <nav
        aria-label="Header navigation preview"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: align === "center" ? "center" : "flex-start",
          gap: 24,
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
          whiteSpace: "nowrap",
          fontSize: token.fontSizeLG,
        }}
      >
        {items.map((item) => (
          <span
            key={item.key}
            style={{
              display: "inline-flex",
              alignItems: "center",
              minWidth: 0,
              color: "inherit",
              textDecoration: "none",
            }}
          >
            {item.label}
          </span>
        ))}
      </nav>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        flex: 1,
        justifyContent: align === "center" ? "center" : "flex-start",
      }}
    >
      <PhiMenuControl
        scope="header-navigation"
        mode="horizontal"
        menuTheme={menuTheme}
        selectedKeys={selectedKeys}
        items={menuItems}
        fontSize={token.fontSizeLG}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: align === "center" ? "center" : "flex-start",
          minHeight: 0,
          flex: "1 1 auto",
          paddingInline: 0,
          height: resolvedHeight,
          lineHeight: resolvedHeight,
        } as CSSProperties}
      />
    </div>
  );
}
