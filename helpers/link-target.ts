import type { PhiCmsAreaKey } from "../constants/cms-areas";
import {
  isPhiLinkTargetConfigKey,
  readPhiLinkTarget,
  type PhiLinkTarget,
  type PhiPageReference,
  type PhiResolvedLinkTargets,
} from "../types/references";

/**
 * One Page a render has to ask about, and the Area to ask in.
 *
 * `null` means the Area doing the asking, which is what a link that names none intends. The pair is
 * carried rather than the reference alone because the question is answered per Area: a resolver told
 * the wrong one finds nothing, and finding nothing is indistinguishable from the Page being gone.
 */
export type PhiLinkTargetReference = {
  reference: PhiPageReference;
  area: PhiCmsAreaKey | null;
};

/**
 * Every Page a stored config points at, found by the name of the field it stands under.
 *
 * The same rule the server's reference collector goes by, for the other half of the job: it indexes what
 * a Page is pointed at by, this gathers what a render has to resolve before it can draw. One rule,
 * because two would drift and the drift would be invisible -- a target the index guards but the renderer
 * never resolves draws nothing, and one the renderer resolves but the index misses outlives its Page.
 *
 * A target field is read whole and never descended into. An external target's `href` is a literal URL
 * the Site does not own, and walking into it would collect whatever happened to be typed there.
 */
export function collectPhiLinkTargetReferences(
  value: unknown,
  into: Map<string, PhiLinkTargetReference> = new Map(),
): Map<string, PhiLinkTargetReference> {
  if (Array.isArray(value)) {
    for (const entry of value) collectPhiLinkTargetReferences(entry, into);
    return into;
  }
  if (!value || typeof value !== "object") {
    return into;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isPhiLinkTargetConfigKey(key)) {
      const target = readPhiLinkTarget(entry);
      if (target?.kind === "page") {
        const area = target.area ?? null;
        into.set(`${area ?? ""}|${target.reference}`, { reference: target.reference, area });
      }
      continue;
    }
    collectPhiLinkTargetReferences(entry, into);
  }
  return into;
}

/**
 * Where a target leads, now, for the render that resolved it.
 *
 * `null` is the answer for a Page nobody could resolve -- deleted, unpublished, or brought by a Module
 * that is switched off -- and it means no link at all rather than a link to nowhere. `REFERENCES.md`:
 * an unresolved internal Page reference renders non-interactive text.
 *
 * A fragment rides along after resolution and is not part of what was resolved: the Page is identity,
 * the place inside it is not, and a Page that moved keeps the anchor it was pointed at.
 *
 * `external` comes out with the address because the target said so, not because the address looks a
 * certain way. Every Control downstream would otherwise ask a regex the same question and get it wrong
 * for the one case that matters -- an internal Page whose resolved path happens to be absolute.
 */
export function resolvePhiLinkHref(
  target: PhiLinkTarget | null | undefined,
  resolved?: PhiResolvedLinkTargets | null,
): { href: string; newTab: boolean; external: boolean } | null {
  if (!target) {
    return null;
  }
  if (target.kind === "external") {
    return { href: target.href, newTab: target.newTab === true, external: true };
  }
  const path = resolved?.get(target.reference);
  if (!path) {
    return null;
  }
  const fragment = target.fragment?.replace(/^#/u, "").trim();
  return {
    href: fragment ? `${path}#${encodeURIComponent(fragment)}` : path,
    // A Page of the Site never opens a new tab; only an address elsewhere may (see the link field).
    newTab: false,
    external: false,
  };
}
