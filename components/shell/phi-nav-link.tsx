"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { isPhiExternalHref } from "../../helpers/external-href";
import { isPhiProtectedMail } from "../../helpers/protected-mail";
import { usePhiRevealedHref } from "../navigation/use-phi-protected-mail";

export type PhiNavLinkProps = {
  href: string;
  currentLocale?: string;
  children: ReactNode;
  external?: boolean;
  newTab?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function PhiNavLink({
  href,
  children,
  external,
  newTab,
  className,
  style,
}: PhiNavLinkProps) {
  // A protected address is never a route, whatever the caller says it is.
  const useAnchor = isPhiProtectedMail(href) || (external ?? isPhiExternalHref(href));
  const anchorHref = usePhiRevealedHref(href);

  if (useAnchor) {
    return (
      <a
        href={anchorHref}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noreferrer noopener" : undefined}
        className={className}
        style={style}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}
