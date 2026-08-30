"use client";

import type { CSSProperties, ReactNode } from "react";
import { ConfigProvider, Menu } from "antd";
import type { ItemType } from "antd/es/menu/interface";

import { createPhiAntdThemeCssVarKey } from "../../theme/phi-antd-token-resolver";
import { usePhiConfig } from "../root/phi-config-provider";

export type PhiMenuControlDivider = {
  type: "divider";
  key?: string;
};

export type PhiMenuControlEntry = {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  children?: readonly PhiMenuControlItem[];
};

export type PhiMenuControlItem = PhiMenuControlDivider | PhiMenuControlEntry;

export type PhiMenuControlProps = {
  /**
   * Distinguishes the generated theme CSS variable scope between menus rendered on one page
   * (for example the sidebar and its Builder preview), so their component tokens never collide.
   */
  scope: string;
  items: readonly PhiMenuControlItem[];
  mode: "inline" | "horizontal";
  /** Defaults to the active Phi theme mode. */
  menuTheme?: "light" | "dark";
  selectedKeys?: readonly string[];
  collapsed?: boolean;
  collapsedWidth?: number | string;
  inlineIndent?: number;
  /** Resolved presentation values; the owning Widget maps its own config to these. */
  fontFamily?: string;
  fontSize?: number;
  style?: CSSProperties;
};

export function toPhiAntdMenuItems(items: readonly PhiMenuControlItem[]): ItemType[] {
  return items.map((item) => {
    if ("type" in item) {
      return { type: "divider", ...(item.key ? { key: item.key } : {}) };
    }

    const { children, ...entry } = item;
    return {
      ...entry,
      ...(children && children.length > 0 ? { children: toPhiAntdMenuItems(children) } : {}),
    };
  });
}

/**
 * The canonical navigation menu presentation (SETTINGS.md-independent; see the Control layer
 * boundary in AGENTS.md): Widgets describe navigation as `PhiMenuControlItem`s and never touch the
 * Ant Design Menu or its item interface. The theme wiring lives here once — the scoped CSS variable
 * key, the transparent item backgrounds every Phi menu surface uses, and the collapsed-sider width
 * — so menu surfaces cannot drift apart in their component tokens.
 */
export function PhiMenuControl({
  scope,
  items,
  mode,
  menuTheme,
  selectedKeys,
  collapsed = false,
  collapsedWidth,
  inlineIndent,
  fontFamily,
  fontSize,
  style,
}: PhiMenuControlProps) {
  const { mode: themeMode, token } = usePhiConfig();
  const resolvedMenuTheme = menuTheme ?? themeMode;
  const localThemeToken = {
    ...(fontFamily ? { fontFamily } : {}),
    ...(fontSize ? { fontSize } : {}),
  };
  /**
   * Only the stacked menu overrides item geometry: it fills the width of its Sider, so items carry
   * no inline margin and paint no background of their own. A horizontal menu keeps the Ant Design
   * defaults, whose item spacing is what separates the entries in a header bar.
   */
  const menuComponentTheme = mode === "inline"
    ? {
      ...(collapsedWidth !== undefined ? { collapsedWidth } : {}),
      itemMarginBlock: token.marginXXS,
      itemMarginInline: 0,
      itemBg: "transparent",
      subMenuItemBg: "transparent",
      darkItemBg: "transparent",
      darkSubMenuItemBg: "transparent",
    }
    : {};
  const themeCssVarKey = createPhiAntdThemeCssVarKey(scope, {
    mode: themeMode,
    rootToken: token,
    token: localThemeToken,
    menu: menuComponentTheme,
    menuTheme: resolvedMenuTheme,
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <ConfigProvider
      theme={{
        cssVar: { prefix: "ant", key: themeCssVarKey },
        token: localThemeToken,
        components: { Menu: menuComponentTheme },
      }}
    >
      <Menu
        mode={mode}
        theme={resolvedMenuTheme}
        selectedKeys={selectedKeys ? [...selectedKeys] : undefined}
        items={toPhiAntdMenuItems(items)}
        {...(mode === "inline" ? { inlineCollapsed: collapsed, inlineIndent } : {})}
        style={{
          background: "transparent",
          width: "100%",
          minWidth: 0,
          ...(mode === "inline"
            ? { height: "auto", borderInlineEnd: "none" }
            : { borderBottom: "none" }),
          ...style,
        }}
      />
    </ConfigProvider>
  );
}
