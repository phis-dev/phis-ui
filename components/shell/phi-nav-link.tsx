import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { isPhiExternalHref } from "../../helpers/external-href";

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
  const useAnchor = external ?? isPhiExternalHref(href);

  if (useAnchor) {
    return (
      <a
        href={href}
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
