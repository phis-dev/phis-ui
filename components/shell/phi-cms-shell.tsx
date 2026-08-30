import type { ReactNode } from "react";
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
};

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
}: PhiCmsShellProps) {
  const hasLeftFullHeightSidebar = siderLeftFullHeight && Boolean(siderLeft);
  const shellVariant = hasLeftFullHeightSidebar
    ? "full-height-sider"
    : siderLeft
      ? "embedded-sider"
      : "embedded-no-sider";

  if (hasLeftFullHeightSidebar) {
    return (
      <div
        className="shell-sider-full"
        data-phi-shell-layout="cms"
        data-phi-shell-variant={shellVariant}
      >
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
    >
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
