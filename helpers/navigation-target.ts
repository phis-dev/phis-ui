import type { PhiCmsResolvedNavigationTarget } from "../types/cms-module-descriptors";

/**
 * The path a navigation target goes to, or `null` when it goes nowhere.
 *
 * An Overlay target has no path by construction -- it opens something in place. Every consumer that
 * used to read `target.path` has to decide what that means for it: a href becomes a button, a redirect
 * becomes impossible, a Builder row shows no address. Going through one reader keeps that decision
 * visible rather than letting an `undefined` travel.
 */
export function readPhiCmsNavigationTargetPath(
  target: PhiCmsResolvedNavigationTarget | null | undefined,
): string | null {
  if (!target || target.kind === "overlay") {
    return null;
  }
  return target.path;
}

export function isPhiCmsNavigationOverlayTarget(
  target: PhiCmsResolvedNavigationTarget | null | undefined,
): target is Extract<PhiCmsResolvedNavigationTarget, { kind: "overlay" }> {
  return target?.kind === "overlay";
}
