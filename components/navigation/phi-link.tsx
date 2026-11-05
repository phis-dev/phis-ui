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
  /**
   * Whether the client router may fetch the destination before anybody asks for it.
   *
   * Absent leaves Next to its own answer, which is right for a link a reader is likely to follow. A
   * link that is a deliberate action rather than somewhere they are already heading says `false`: the
   * speculation buys nothing, and where the destination is an Area root that forwards, it costs two
   * requests nobody made. Only the client-navigated branch has an opinion; a plain anchor never
   * prefetched.
   */
  prefetch?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function PhiLink({
  href,
  children,
  external,
  newTab,
  prefetch,
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
      textDecoration: "none",
      cursor: "pointer",
      ...style,
      /*
       * A colour the caller states is the link at rest -- a Header's text colour, a list's inherited one --
       * and never more: pointed at and pressed, a link answers in the Theme's link colours whatever it
       * rests in. Spread after `style`, a stated colour had silenced the hover of every link that set one.
       */
      color: active ? token.colorLinkActive : hovered ? token.colorLinkHover : style?.color ?? token.colorLink,
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
      {...(prefetch === undefined ? {} : { prefetch })}
      className={className}
      style={linkStyle}
      onClick={onClick}
      {...interactionProps}
    >
      {children}
    </Link>
  );
}
