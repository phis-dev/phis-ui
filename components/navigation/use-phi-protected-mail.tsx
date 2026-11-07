"use client";

import { useSyncExternalStore } from "react";

import { decodePhiProtectedMail, isPhiProtectedMail } from "../../helpers/protected-mail";

const subscribeNever = () => () => {};

/**
 * Whether this render runs in a hydrated browser. False on the server and during hydration -- the HTML a
 * crawler reads -- and true in the render that follows.
 */
function usePhiHydrated() {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

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
