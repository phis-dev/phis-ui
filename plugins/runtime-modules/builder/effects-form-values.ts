import { isPhiRecord } from "../../../helpers/is-record";
import type { PhiRenderableBlockEffects } from "../../../types/renderable-block";

export const PHI_BUILDER_EFFECTS_SECTIONS = ["appearance", "transitions", "viewport"] as const;
export type PhiBuilderEffectsSection = (typeof PHI_BUILDER_EFFECTS_SECTIONS)[number];

export type PhiBuilderEffectsFormValuesBySection = {
  appearance: { transparency: number };
  transitions: {
    transitionTrigger: NonNullable<PhiRenderableBlockEffects["transitionTrigger"]>;
    transitionOnce: boolean;
    transitions: Record<string, unknown>[];
  };
  viewport: { viewportEffects: Record<string, unknown>[] };
};

function withRowKeys<TValue extends Record<string, unknown>>(
  values: readonly TValue[],
  prefix: string,
) {
  return values.map((value, index) => ({ ...value, __rowKey: `${prefix}:${index}` }));
}

export function splitPhiBuilderEffectsFormValues(
  effects: PhiRenderableBlockEffects | null | undefined,
): PhiBuilderEffectsFormValuesBySection {
  return {
    appearance: {
      transparency: Math.round((1 - Math.min(1, Math.max(0, effects?.opacity ?? 1))) * 100),
    },
    transitions: {
      transitionTrigger: effects?.transitionTrigger ?? "on_mount",
      transitionOnce: effects?.transitionOnce ?? true,
      transitions: withRowKeys(effects?.transitions ?? [], "transition"),
    },
    viewport: {
      viewportEffects: withRowKeys(effects?.viewportEffects ?? [], "viewport"),
    },
  };
}

function readRecord(value: unknown) {
  return isPhiRecord(value)
    ? value as Record<string, unknown>
    : {};
}

function withoutRowKeys<TValue extends Record<string, unknown>>(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isPhiRecord(entry)) return [];
    const row = { ...(entry as Record<string, unknown>) };
    delete row.__rowKey;
    return [row as TValue];
  });
}

/**
 * The Transparency the Appearance section shows, as the opacity a block is drawn with.
 *
 * One reading for both the commit and the live picture in the canvas: the form asks how much of the
 * block is taken away, the style says how much is left, and a second place doing that arithmetic is a
 * second place for the two to disagree. Three decimals, because a percent step is a thousandth and
 * anything beyond it is the binary fraction showing through.
 */
export function readPhiBuilderEffectsOpacity(appearance: unknown): number {
  const transparency = readRecord(appearance).transparency;
  const clamped = typeof transparency === "number" ? Math.min(100, Math.max(0, transparency)) : 0;
  return Number((1 - clamped / 100).toFixed(3));
}

export function mergePhiBuilderEffectsFormValues(input: {
  appearance: unknown;
  transitions: unknown;
  viewport: unknown;
}): PhiRenderableBlockEffects {
  const appearance = readRecord(input.appearance);
  const transitions = readRecord(input.transitions);
  const viewport = readRecord(input.viewport);
  const viewportEffects = withoutRowKeys<Record<string, unknown>>(viewport.viewportEffects)
    .map((effect) => effect.unit === "unitless" ? { ...effect, unit: "" } : effect) as
      NonNullable<PhiRenderableBlockEffects["viewportEffects"]>;
  return {
    opacity: readPhiBuilderEffectsOpacity(appearance),
    transitionTrigger: typeof transitions.transitionTrigger === "string"
      ? transitions.transitionTrigger as NonNullable<PhiRenderableBlockEffects["transitionTrigger"]>
      : "on_mount",
    transitionOnce: transitions.transitionOnce !== false,
    transitions: withoutRowKeys<NonNullable<PhiRenderableBlockEffects["transitions"]>[number]>(transitions.transitions),
    viewportEffects,
  };
}
