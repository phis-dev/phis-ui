"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * The page's Intl settings for Client code that formats dates and numbers.
 *
 * The browser's own locale is the visitor's machine, not the page they are reading: an English browser on
 * `/de/...` would show English dates in a German page, and the server's render would show a third. The
 * Root Layout sets it once from the resolved locale, the same value `<html lang>` carries.
 *
 * The time zone is the Site's (`PhiSiteConfig.timeZone`), for the same reason: the server formatted the
 * instant in its zone and the browser in the reader's, and the page was hydrated against text that
 * then changed under the reader's eyes. `renderedAt` is when the server rendered this page, so that
 * "3 minutes ago" is the same words on both sides of hydration rather than a moment newer in the browser.
 */
type PhiIntlContextValue = {
  locale: string;
  timeZone: string;
  renderedAt: number;
};

const PhiIntlContext = createContext<PhiIntlContextValue | null>(null);

export function PhiIntlLocaleProvider({
  locale,
  timeZone,
  renderedAt,
  children,
}: {
  locale: string;
  timeZone: string;
  renderedAt: number;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, timeZone, renderedAt }), [locale, renderedAt, timeZone]);
  return <PhiIntlContext.Provider value={value}>{children}</PhiIntlContext.Provider>;
}

function usePhiIntl(): PhiIntlContextValue {
  const value = useContext(PhiIntlContext);
  if (!value) {
    throw new Error("usePhiIntlLocale needs a PhiIntlLocaleProvider above it; the Root Layout sets one.");
  }
  return value;
}

export function usePhiIntlLocale(): string {
  return usePhiIntl().locale;
}

/** The Site's time zone, for every date and time a Client component formats. */
export function usePhiIntlTimeZone(): string {
  return usePhiIntl().timeZone;
}

/** The moment the server rendered this page, for relative times that have to hydrate unchanged. */
export function usePhiIntlRenderedAt(): number {
  return usePhiIntl().renderedAt;
}
