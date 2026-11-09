"use client";

import { decodePhiProtectedMail, isPhiProtectedMail } from "../../helpers/protected-mail";
import { usePhiHydrated } from "../state/use-phi-hydrated";

/**
 * The href a link may show: a protected address only once the page is hydrated, everything else at once.
 *
 * Before -- on the server, in the HTML, during hydration -- a protected href is absent, so the anchor in
 * the source carries no address (`helpers/protected-mail.ts`).
 */
export function usePhiRevealedHref(href: string): string | undefined {
  const hydrated = usePhiHydrated();
  if (!isPhiProtectedMail(href)) return href;
  return hydrated ? decodePhiProtectedMail(href) ?? undefined : undefined;
}

/** An address in running text, written in once the page is hydrated; nothing before. */
export function PhiProtectedMailText({ token }: { token: string }) {
  const hydrated = usePhiHydrated();
  return <span data-phi-mail="">{hydrated ? decodePhiProtectedMail(token) ?? "" : ""}</span>;
}
