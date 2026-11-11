"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePhiPathname } from "../runtime/use-phi-pathname";

import { PhiButtonControl } from "../controls/phi-button-control";
import { PhiIcon } from "./phi-icon";

/** Where the drawer's top stands within the Shell, published on the Shell element (`styles/shell.css`). */
const PHI_SHELL_SIDER_DRAWER_TOP_PROPERTY = "--phi-shell-sider-drawer-top";

/**
 * A `sider_left` without `MobileColumn`, on a phone: the menu button that opens it, the mask behind it, and
 * the rules that close it again (SHELL.md "The Sider on a phone").
 *
 * The Sider itself does not move. `styles/shell.css` takes it out of its column below 768px and stands it
 * at the inline start, off screen until the Shell says `data-phi-sider-drawer-open`; this component only
 * says so. The Region keeps rendering where it always renders -- statically or through its own client --
 * so nothing it holds is mounted twice.
 *
 * **The Shell is a container**, and a container is the containing block of what is `position: fixed`
 * inside it: the drawer's top is the Shell's, not the viewport's. So the page stops scrolling while the
 * drawer is open, and the drawer is moved to where the viewport's top is on the Shell at that moment.
 *
 * The button goes into `header_main`, at its inline start; a Shell without one gets it at its own top.
 * Opening needs JavaScript: without it the Sider stays off screen on a phone.
 */
export function PhiShellSiderDrawer() {
  const pathname = usePhiPathname();
  const [shell, setShell] = useState<HTMLElement | null>(null);
  /*
   * The Page the drawer was opened on. Following a link to another Page closes it without an effect
   * having to notice the navigation: on the new path it is simply not open.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn != null && openedOn === pathname;
  const close = useCallback(() => setOpenedOn(null), []);

  const anchorRef = useCallback((node: HTMLSpanElement | null) => {
    setShell(node?.closest<HTMLElement>("[data-phi-shell-layout]") ?? null);
  }, []);

  const sider = shell?.querySelector<HTMLElement>('[data-phi-sider-mobile="drawer"]') ?? null;
  const header = shell?.querySelector<HTMLElement>('[data-phi-region-key="header_main"]') ?? null;

  useLayoutEffect(() => {
    if (!shell) return;
    if (!open) {
      shell.removeAttribute("data-phi-sider-drawer-open");
      return;
    }
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    shell.style.setProperty(PHI_SHELL_SIDER_DRAWER_TOP_PROPERTY, `${-shell.getBoundingClientRect().top}px`);
    shell.setAttribute("data-phi-sider-drawer-open", "true");
    return () => {
      root.style.overflow = previousOverflow;
      shell.removeAttribute("data-phi-sider-drawer-open");
      shell.style.removeProperty(PHI_SHELL_SIDER_DRAWER_TOP_PROPERTY);
    };
  }, [open, shell]);

  useEffect(() => {
    if (!open || !sider) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    // A link chosen in the drawer is where the reader is going; one to the Page they are on goes nowhere.
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a[href]")) close();
    };
    const previousTabIndex = sider.getAttribute("tabindex");
    if (previousTabIndex == null) sider.setAttribute("tabindex", "-1");
    sider.focus({ preventScroll: true });
    document.addEventListener("keydown", onKeyDown);
    sider.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      sider.removeEventListener("click", onClick);
      if (previousTabIndex == null) sider.removeAttribute("tabindex");
    };
  }, [close, open, sider]);

  const button = (
    <span className={header ? "phi-shell-sider-drawer-button" : "phi-shell-sider-drawer-button phi-shell-sider-drawer-button--shell"}>
      <PhiButtonControl
        type="text"
        ariaLabel={open ? "Close menu" : "Open menu"}
        ariaExpanded={open}
        icon={<PhiIcon name={open ? "close" : "menu"} size="inherit" />}
        onClick={() => setOpenedOn(open ? null : pathname)}
      />
    </span>
  );

  return (
    <>
      <span hidden ref={anchorRef} />
      {shell ? createPortal(button, header ?? shell) : null}
      {shell && open
        ? createPortal(<div aria-hidden className="phi-shell-sider-drawer-mask" onClick={close} />, shell)
        : null}
    </>
  );
}
