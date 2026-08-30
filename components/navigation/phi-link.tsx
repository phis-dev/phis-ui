"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import Link from "next/link";
import { isPhiExternalHref } from "../../helpers/external-href";
import { usePhiConfig } from "../root/phi-config-provider";

export type PhiLinkProps = {
  href: string;
  children: ReactNode;
  external?: boolean;
  newTab?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function PhiLink({
  href,
  children,
  external,
  newTab,
  className,
  style,
  onClick,
}: PhiLinkProps) {
  const { token } = usePhiConfig();
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const useAnchor = external ?? isPhiExternalHref(href);

  const linkStyle = useMemo<CSSProperties>(
    () => ({
      color: active ? token.colorLinkActive : hovered ? token.colorLinkHover : token.colorLink,
      textDecoration: "none",
      cursor: "pointer",
      ...style,
    }),
    [active, hovered, style, token.colorLink, token.colorLinkActive, token.colorLinkHover],
  );

  const interactionProps = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => {
      setHovered(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    onBlur: () => setActive(false),
  };

  if (useAnchor) {
    return (
      <a
        href={href}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noreferrer noopener" : undefined}
        className={className}
        style={linkStyle}
        onClick={onClick}
        {...interactionProps}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      style={linkStyle}
      onClick={onClick}
      {...interactionProps}
    >
      {children}
    </Link>
  );
}
