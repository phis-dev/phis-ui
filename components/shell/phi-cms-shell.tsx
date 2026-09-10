import type { CSSProperties, ReactNode } from "react";
import "../../styles/shell.css";

export type PhiCmsShellProps = {
  content?: ReactNode;
  headerTop?: ReactNode;
  headerMain?: ReactNode;
  headerBottom?: ReactNode;
  hero?: ReactNode;
  siderLeft?: ReactNode;
  siderRight?: ReactNode;
  siderLeftFullHeight?: boolean;
  footerTop?: ReactNode;
  footerMain?: ReactNode;
  footerBottom?: ReactNode;
  drawer?: ReactNode;
  /**
   * Where the Header pane sticks, from `resolvePhiShellChromePaneStickyTop`, or nothing where it does
   * not stick. The Shell is handed the answer rather than the bands: the Area resolves the Region
   * configs already, and the Page-owned `header_bottom` never reaches here as anything but a subtree.
   */
  headerPaneStickyTop?: string | null;
};

/**
 * One continuous pane per Chrome family (SHELL.md "Root Background and Shell Backdrop Layers").
 *
 * The Shell is the only place that can compose these, and it is where SHELL.md puts them: it is the
 * last hand the Page-owned `header_bottom` passes through, so it is the first place that knows which
 * bands a family actually has.
 *
 * A pane carries nothing of its own. It reads the same custom properties the Root Layout publishes for
 * the Shell Chrome Overlay, and where a mode has no overlay those resolve to nothing and it paints
 * nothing. Its geometry is the grid's, spanning from the family's first area to its last, so no height
 * is measured here or anywhere else.
 */
const PHI_SHELL_CHROME_PANE_PAINT: CSSProperties = {
  backgroundColor: "var(--phi-shell-chrome-color, transparent)",
  backgroundImage: "var(--phi-shell-chrome-image, none)",
  backgroundSize: "var(--phi-shell-chrome-size, auto)",
  backgroundPosition: "var(--phi-shell-chrome-position, 0 0)",
  backgroundRepeat: "var(--phi-shell-chrome-repeat, repeat)",
  /*
   * The same window onto one viewport-sized painting the Regions used to show. A pane spans its whole
   * family, so this only still matters where two panes exist: a gradient stays continuous from the
   * Header pane into the Sider pane beside it.
   */
  backgroundAttachment: "fixed",
  backdropFilter: "var(--phi-shell-chrome-filter, none)",
  WebkitBackdropFilter: "var(--phi-shell-chrome-filter, none)",
};

type PhiShellChromePaneName =
  | "header"
  | "header-bottom"
  | "sider"
  | "sider-right"
  | "footer";

/*
 * Which published Shadow a pane wears. The two Header panes of the embedded topology share the Header's
 * Shadow, and the left Sider's pane is named `sider` for the grid area it covers.
 */
const PHI_SHELL_CHROME_PANE_SHADOW_SOURCE: Record<PhiShellChromePaneName, string> = {
  header: "header",
  "header-bottom": "header",
  sider: "sider-left",
  "sider-right": "sider-right",
  footer: "footer",
};

function PhiShellChromePane({
  family,
  stickyTop,
}: {
  family: PhiShellChromePaneName;
  stickyTop?: string | null;
}) {
  const boxShadow = `var(--phi-shell-chrome-shadow-${PHI_SHELL_CHROME_PANE_SHADOW_SOURCE[family]}, none)`;
  return (
    <div
      aria-hidden
      className={`phi-shell-chrome-pane phi-shell-chrome-pane--${family}`}
      style={
        stickyTop == null
          ? { ...PHI_SHELL_CHROME_PANE_PAINT, boxShadow }
          : { ...PHI_SHELL_CHROME_PANE_PAINT, boxShadow, position: "sticky", top: stickyTop }
      }
    />
  );
}

export function PhiCmsShell({
  content,
  headerTop,
  headerMain,
  headerBottom,
  hero,
  siderLeft,
  siderRight,
  siderLeftFullHeight = false,
  footerTop,
  footerMain,
  footerBottom,
  drawer,
  headerPaneStickyTop,
}: PhiCmsShellProps) {
  const hasLeftFullHeightSidebar = siderLeftFullHeight && Boolean(siderLeft);
  const shellVariant = hasLeftFullHeightSidebar
    ? "full-height-sider"
    : siderLeft
      ? "embedded-sider"
      : "embedded-no-sider";
  /*
   * A family gets a pane only where it has a band to cover. An empty family would still collapse its
   * tracks to zero and paint nothing, but rendering the element anyway would put a frosting layer into
   * a Shell that has no chrome there at all.
   */
  const hasHeader = Boolean(headerTop || headerMain || headerBottom);
  const hasFooter = Boolean(footerTop || footerMain || footerBottom);

  if (hasLeftFullHeightSidebar) {
    return (
      <div
        className="shell-sider-full"
        data-phi-shell-layout="cms"
        data-phi-shell-variant={shellVariant}
        data-phi-shell-chrome-panes="true"
      >
        {hasHeader ? <PhiShellChromePane family="header" stickyTop={headerPaneStickyTop} /> : null}
        <PhiShellChromePane family="sider" />
        {siderRight ? <PhiShellChromePane family="sider-right" /> : null}
        {hasFooter ? <PhiShellChromePane family="footer" /> : null}
        {siderLeft}
        {headerTop}
        {headerMain}
        {headerBottom}
        {hero}
        <main className="content phi-shell-content-main">{content}</main>
        {siderRight}
        {footerTop}
        {footerMain}
        {footerBottom}
        {drawer}
      </div>
    );
  }

  return (
    <div
      className={siderLeft ? "shell-sider-embedded" : "shell-sider-embedded shell-sider-embedded--no-sider"}
      data-phi-shell-layout="cms"
      data-phi-shell-variant={shellVariant}
      data-phi-shell-chrome-panes="true"
    >
      {/*
        Two Header panes here, not one: `header_bottom` sits beside the Sider in this topology, so the
        family is an L and a grid item cannot be one. The seam falls on the row the Sider starts in.
      */}
      {headerTop || headerMain ? <PhiShellChromePane family="header" stickyTop={headerPaneStickyTop} /> : null}
      {headerBottom ? <PhiShellChromePane family="header-bottom" /> : null}
      {siderLeft ? <PhiShellChromePane family="sider" /> : null}
      {siderRight ? <PhiShellChromePane family="sider-right" /> : null}
      {hasFooter ? <PhiShellChromePane family="footer" /> : null}
      {headerTop}
      {headerMain}
      {headerBottom}
      {hero}
      {siderLeft}
      <main className="content phi-shell-content-main">{content}</main>
      {siderRight}
      {footerTop}
      {footerMain}
      {footerBottom}
      {drawer}
    </div>
  );
}
