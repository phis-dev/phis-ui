"use client";

import type { CSSProperties, ReactNode } from "react";
import { Menu } from "antd";
import type { ItemType } from "antd/es/menu/interface";

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

/**
 * A titled set of entries, drawn under a heading rather than behind a parent.
 *
 * Different from an entry with `children`, which is a submenu: a submenu hides what is in it behind a
 * step, which is right where the entries are many or secondary. A group shows them and says what they
 * have in common, which is right where the set is short, fixed, and worth naming -- the Areas a person
 * may enter, for one. The title is not a destination and cannot be chosen.
 */
export type PhiMenuControlGroup = {
  type: "group";
  key: string;
  label: ReactNode;
  children: readonly PhiMenuControlItem[];
};

export type PhiMenuControlItem = PhiMenuControlDivider | PhiMenuControlGroup | PhiMenuControlEntry;

export type PhiMenuControlProps = {
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
    if ("type" in item && item.type === "divider") {
      return { type: "divider", ...(item.key ? { key: item.key } : {}) };
    }
    if ("type" in item && item.type === "group") {
      return { type: "group", key: item.key, label: item.label, children: toPhiAntdMenuItems(item.children) };
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
 * Ant Design Menu or its item interface. The theme wiring lives here once — the transparent item
 * backgrounds every stacked Phi menu uses, its collapsed width, and the type a Widget configures — so
 * menu surfaces cannot drift apart in their component tokens.
 */
export function PhiMenuControl({
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
  const { mode: themeMode } = usePhiConfig();
  const resolvedMenuTheme = menuTheme ?? themeMode;
  /*
   * What a Menu changes about Ant Design's own Menu, as classes and custom properties rather than a
   * `ConfigProvider` of its own.
   *
   * A nested provider with its own tokens makes Ant Design derive the whole Theme again -- its
   * component tokens and its variable scope are part of the derivation's cache key -- and write all of
   * its variables out a second time: a sidebar cost a full derivation and 12 KB of HTML per request
   * (measured 04.10.2026). The overrides are a handful of variables, so they are set as variables,
   * by `styles/controls.css` under the classes below. The values a Widget configures travel as
   * `--phi-menu-*` properties, on the Menu and on its popups, which Ant Design renders into a portal.
   */
  const presentationVars = {
    ...(fontFamily ? { "--phi-menu-font-family": fontFamily } : {}),
    ...(fontSize ? { "--phi-menu-font-size": `${fontSize}px` } : {}),
    ...(mode === "inline" && collapsedWidth !== undefined
      ? { "--phi-menu-collapsed-width": typeof collapsedWidth === "number" ? `${collapsedWidth}px` : collapsedWidth }
      : {}),
  } as CSSProperties;
  const modifiers = [
    "phi-menu-control",
    /*
     * Only the stacked menu overrides item geometry: it fills the width of its Sider, so items carry
     * no inline margin and paint no background of their own. A horizontal menu keeps the Ant Design
     * defaults, whose item spacing is what separates the entries in a header bar.
     */
    mode === "inline" ? "phi-menu-control--inline" : null,
    fontFamily ? "phi-menu-control--font-family" : null,
    fontSize ? "phi-menu-control--font-size" : null,
    mode === "inline" && collapsedWidth !== undefined ? "phi-menu-control--collapsed-width" : null,
  ].filter(Boolean).join(" ");

  if (items.length === 0) {
    return null;
  }

  return (
    <Menu
      className={modifiers}
      classNames={{ popup: { root: `${modifiers} phi-menu-control__popup` } }}
      styles={{ popup: { root: presentationVars } }}
      mode={mode}
      theme={resolvedMenuTheme}
      selectedKeys={selectedKeys ? [...selectedKeys] : undefined}
      items={toPhiAntdMenuItems(items)}
      {...(mode === "inline" ? { inlineCollapsed: collapsed, inlineIndent } : {})}
      style={{
        ...presentationVars,
        background: "transparent",
        width: "100%",
        minWidth: 0,
        ...(mode === "inline"
          ? { height: "auto", borderInlineEnd: "none" }
          : { borderBottom: "none" }),
        ...style,
      }}
    />
  );
}
