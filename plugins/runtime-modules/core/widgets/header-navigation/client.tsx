"use client";

import { useCallback, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";

import { collectPhiSelectedNavKeys } from "../../../../../helpers/nav-selection";
import { PhiMenuControl } from "../../../../../components/controls/phi-menu-control";
import type { PhiMenuSelectionStyle } from "../../../../../components/controls/phi-menu-control-vocabulary";
import type { PhiClientBlockBaseProps, PhiBlockRuntime, PhiNoLabels } from "../../../../../types";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { mapPhiNavItems } from "../../../../../components/shell/menu-items";
import { type PhiMenuTheme, type PhiNavItem } from "../../../../../components/shell/shell-types";
import { usePhiPathname } from "../../../../../components/runtime/use-phi-pathname";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiDialogControl } from "../../../../../components/controls/phi-dialog-control";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import type { PhiHeaderNavigationPhoneMenu } from "./config";

export type PhiHeaderNavigationWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  Record<string, never>,
  Pick<PhiBlockRuntime, "site" | "locale" | "area">
> & {
  // Always handed over with the request's locale, so no reader has a language to invent.
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area">;
  items: PhiNavItem[];
  menuTheme?: PhiMenuTheme;
  height?: CSSProperties["height"];
  align?: "left" | "center";
  selectionStyle?: PhiMenuSelectionStyle;
  /** Below 768px: the entries behind a menu button (the default), or the row as on a wider screen. */
  phoneMenu?: PhiHeaderNavigationPhoneMenu;
  interactive?: boolean;
};

export function PhiHeaderNavigationWidgetClient({
  runtime,
  items,
  menuTheme,
  height,
  align = "left",
  selectionStyle = "auto",
  phoneMenu = "button",
  interactive = true,
}: PhiHeaderNavigationWidgetClientProps) {
  const { token } = usePhiConfig();
  const pathname = usePhiPathname();
  const availableLocales = runtime.site.availableLocales.map((option) => option.code);
  const selectedKeys = collectPhiSelectedNavKeys(pathname, items, availableLocales);
  const menuItems = mapPhiNavItems(
    runtime.locale.current,
    runtime.area,
    pathname,
    items,
    availableLocales,
    { interactive },
  );
  const resolvedHeight =
    typeof height === "number" ? `${height}px` : (height ?? "100%");
  /*
   * The Page the Drawer was opened on: following an entry to another Page closes it without an effect
   * having to notice the navigation (the Shell's Sider drawer does the same).
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const drawerOpen = openedOn != null && openedOn === pathname;
  const closeDrawer = useCallback(() => setOpenedOn(null), []);
  // An entry chosen in the Drawer is where the reader is going, the Page they are on included.
  const closeOnLink = useCallback((event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest("a[href]")) closeDrawer();
  }, [closeDrawer]);

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
          fontSize: token.fontSize,
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
      /*
       * Both forms are drawn and `styles/shell.css` shows one: whether this is a phone is the Shell's
       * container width, which a Widget's own box cannot answer. The row is the wider screen's.
       */
      className={phoneMenu === "button" ? "phi-header-nav phi-header-nav--phone-button" : "phi-header-nav"}
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
      {phoneMenu === "button" ? (
        <span className="phi-header-nav__button">
          <PhiButtonControl
            type="text"
            ariaLabel="Open navigation"
            ariaExpanded={drawerOpen}
            icon={<PhiIcon name="menu" size="inherit" />}
            onClick={() => setOpenedOn(pathname)}
          />
          <PhiDialogControl
            open={drawerOpen}
            presentation="drawer"
            placement="right"
            size="min(20rem, 85vw)"
            onDismiss={closeDrawer}
          >
            <nav aria-label="Navigation" onClickCapture={closeOnLink}>
              <PhiMenuControl
                mode="inline"
                menuTheme={menuTheme}
                selectionStyle={selectionStyle}
                selectedKeys={selectedKeys}
                items={menuItems}
                fontSize={token.fontSize}
                style={{ borderInlineEnd: "none" }}
              />
            </nav>
          </PhiDialogControl>
        </span>
      ) : null}
      <div
        className="phi-header-nav__row"
        style={{
          display: "flex",
          alignItems: "stretch",
          flex: "1 1 auto",
          minWidth: 0,
          justifyContent: align === "center" ? "center" : "flex-start",
        }}
      >
        <PhiMenuControl
          mode="horizontal"
          menuTheme={menuTheme}
          selectionStyle={selectionStyle}
          selectedKeys={selectedKeys}
          items={menuItems}
          fontSize={token.fontSize}
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
    </div>
  );
}
