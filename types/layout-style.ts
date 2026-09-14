export const PHI_LAYOUT_EFFECT_IDS = ["glass", "haze", "blur", "dim"] as const;

export type PhiLayoutEffectId = (typeof PHI_LAYOUT_EFFECT_IDS)[number];

/**
 * The Effects that are a pane rather than a treatment of the surface itself.
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

export function isPhiLayoutEffectId(value: unknown): value is PhiLayoutEffectId {
  return typeof value === "string" && PHI_LAYOUT_EFFECT_IDS.includes(value as PhiLayoutEffectId);
}

export function isPhiShadowId(value: unknown): value is PhiShadowId {
  return typeof value === "string" && PHI_SHADOW_IDS.includes(value as PhiShadowId);
}

export function readPhiShadow(value: unknown): PhiShadow | undefined {
  if (isPhiShadowId(value)) {
    return value;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const customValue = typeof candidate.value === "string" ? candidate.value.trim() : "";
  return candidate.kind === "custom" && customValue.length > 0
    ? { kind: "custom", value: customValue }
    : undefined;
}
