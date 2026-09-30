"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The page's Intl locale for Client code that formats dates and numbers.
 *
 * The browser's own locale is the visitor's machine, not the page they are reading: an English browser on
 * `/de/...` would show English dates in a German page, and the server's render would show a third. The
 * Root Layout sets it once from the resolved locale, the same value `<html lang>` carries.
 */
const PhiIntlLocaleContext = createContext<string | null>(null);

export function PhiIntlLocaleProvider({ locale, children }: { locale: string; children: ReactNode }) {
  return <PhiIntlLocaleContext.Provider value={locale}>{children}</PhiIntlLocaleContext.Provider>;
}

export function usePhiIntlLocale(): string {
  const locale = useContext(PhiIntlLocaleContext);
  if (!locale) {
    throw new Error("usePhiIntlLocale needs a PhiIntlLocaleProvider above it; the Root Layout sets one.");
  }
  return locale;
}
