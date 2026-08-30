export const PHI_LAYOUT_EFFECT_IDS = ["glass", "blur", "dim", "tint"] as const;

export type PhiLayoutEffectId = (typeof PHI_LAYOUT_EFFECT_IDS)[number];

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
