"use client";

import { createPhiPluginStateStore } from "../state/plugin-state-store";

/**
 * Whether a visitor has said that videos of one provider may load for the rest of this visit.
 *
 * The single writer of that answer, and deliberately a contract rather than state inside the placeholder.
 * Several placeholders on one page have to agree -- saying yes at the first video is meant to open the
 * third -- and a later machine-readable signal ([design/CONSENT.md](../../design/CONSENT.md), "Machine-
 * readable signals") should become a second source for the same state instead of a rebuild.
 *
 * Scoped per provider key because consent is per purpose. One answer covers every YouTube frame on the
 * Site, and it covers nothing else: a Vimeo frame asks for itself, and a map or an analytics product would
 * be a different purpose that must not ride along.
 *
 * `sessionStorage` and not a cookie. The lifetime is the same, but a cookie would travel on every request
 * to a server that cannot act on it -- the static render reads no cookies, and letting the answer into the
 * static cache key would multiply the cache for a decision the browser has to apply anyway. Per tab is
 * also the honest reading of "this visit". Storing a plain yes is the exempt case of § 25(2) TDDDG: a
 * status, not an identifier, so there is nothing here that recognises anybody.
 *
 * Every access may fail -- a private window, blocked site data -- and a refused store is not an error:
 * the placeholder then simply asks once per view, which is the answer it gives by default anyway.
 */
type PhiVideoVisitConsentState = {
  unlocked: boolean;
};

const PHI_VIDEO_VISIT_CONSENT_STORAGE_PREFIX = "phi.video.visit-consent:";

const videoVisitConsentStore = createPhiPluginStateStore<PhiVideoVisitConsentState>(
  "@phis/ui/video-visit-consent",
  () => ({ unlocked: false }),
);

function storageKey(providerKey: string) {
  return `${PHI_VIDEO_VISIT_CONSENT_STORAGE_PREFIX}${providerKey}`;
}

/**
 * What this tab already answered for that provider.
 *
 * The default is always "no", which is what makes the first Client render agree with the Server's: the
 * Server cannot see session storage, so a placeholder is what both draw. `seed` then turns it into a
 * player, from an effect, the way the Form runtime restores an unsent draft.
 */
export function usePhiVideoVisitConsent(providerKey: string): boolean {
  return videoVisitConsentStore.useStoreSelector(providerKey, (state) => state.unlocked);
}

/** Reads the answer this tab gave earlier. Called from an effect, never during a render. */
export function seedPhiVideoVisitConsent(providerKey: string): void {
  let stored: string | null = null;
  try {
    stored = window.sessionStorage.getItem(storageKey(providerKey));
  } catch {
    // An answer nobody can store is an answer nobody has to restore.
    return;
  }
  if (stored === "1" && !videoVisitConsentStore.getSnapshot(providerKey).unlocked) {
    videoVisitConsentStore.replace(providerKey, { unlocked: true });
  }
}

/** Yes, for this tab, until it is closed or the answer is taken back. */
export function grantPhiVideoVisitConsent(providerKey: string): void {
  videoVisitConsentStore.replace(providerKey, { unlocked: true });
  try {
    window.sessionStorage.setItem(storageKey(providerKey), "1");
  } catch {
    // The unlock then lasts this page rather than this visit, which is the lesser of the two promises.
  }
}

/**
 * Taking it back, which this step owes: withdrawal has to be possible at any time, and as easily as the
 * consent was given. It ends the unlock for the tab and every placeholder returns to asking.
 */
export function revokePhiVideoVisitConsent(providerKey: string): void {
  videoVisitConsentStore.replace(providerKey, { unlocked: false });
  try {
    window.sessionStorage.removeItem(storageKey(providerKey));
  } catch {
    // Nothing stored, nothing to remove.
  }
}
