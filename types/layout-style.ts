import { isPhiRecord } from "../helpers/is-record";
/**
 * The Background filters that are a pane rather than a treatment of the paint itself.
 *
 * `glass` and `haze` are the same thing at two strengths: a sheet that frosts what shows through it.
 * `glass` is the frosted pane, `haze` the barely clouded one -- both a smaller radius and more of the
 * ground let through, because moving only one of the two reads as a dirty window rather than as
 * lighter glass. Everything that used to test for `glass` asks this instead, so a further strength
 * would be a table entry and not another branch.
 */
export const PHI_GLASS_LAYOUT_EFFECT_IDS = ["glass", "haze"] as const;

export type PhiGlassLayoutEffectId = (typeof PHI_GLASS_LAYOUT_EFFECT_IDS)[number];

export function isPhiGlassLayoutEffectId(value: unknown): value is PhiGlassLayoutEffectId {
  return typeof value === "string" && PHI_GLASS_LAYOUT_EFFECT_IDS.includes(value as PhiGlassLayoutEffectId);
}

export const PHI_SHADOW_IDS = ["none", "soft", "strong"] as const;

export type PhiShadowId = (typeof PHI_SHADOW_IDS)[number];

export type PhiCustomShadow = {
  kind: "custom";
  value: string;
};

export type PhiShadow = PhiShadowId | PhiCustomShadow;

export function isPhiShadowId(value: unknown): value is PhiShadowId {
  return typeof value === "string" && PHI_SHADOW_IDS.includes(value as PhiShadowId);
}

export function readPhiShadow(value: unknown): PhiShadow | undefined {
  if (isPhiShadowId(value)) {
    return value;
  }

  if (!isPhiRecord(value)) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const customValue = typeof candidate.value === "string" ? candidate.value.trim() : "";
  return candidate.kind === "custom" && customValue.length > 0
    ? { kind: "custom", value: customValue }
    : undefined;
}

/**
 * What a Background does to the light that reaches it, beside what it paints.
 *
 * `glass` and `haze` are panes: they frost what shows THROUGH the surface, so they act on the backdrop and
 * on a ground thinned enough to let it through. `blur` softens the Background's own paint -- the picture,
 * the gradient, the pattern -- and nothing in front of it: the content a surface carries is never filtered.
 * Darkening is not a filter; a colour Overlay at an opacity does it, and lets the colour be chosen.
 */
export const PHI_BACKGROUND_FILTERS = ["glass", "haze", "blur"] as const;

export type PhiBackgroundFilter = (typeof PHI_BACKGROUND_FILTERS)[number];

export function isPhiBackgroundFilter(value: unknown): value is PhiBackgroundFilter {
  return typeof value === "string" && PHI_BACKGROUND_FILTERS.includes(value as PhiBackgroundFilter);
}
