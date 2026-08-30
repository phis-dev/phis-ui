import {
  PHI_CORE_BACKGROUND_PATTERN_KEYS,
  type PhiBackgroundPatternFieldDescriptor,
  type PhiBackgroundPatternKey,
  type PhiBackgroundPatternValues,
} from "./background-pattern-contract";

export type PhiBackgroundPatternProvider = {
  patternKey: PhiBackgroundPatternKey;
  labelKey: "stripes" | "grid" | "dots" | "checker" | "crosshatch";
  fields: readonly PhiBackgroundPatternFieldDescriptor[];
};

const SCALE_FIELD = {
  key: "scale",
  type: "number",
  defaultValue: 12,
  min: 2,
  max: 64,
  step: 1,
} as const satisfies PhiBackgroundPatternFieldDescriptor;

const DIRECTION_FIELD = {
  key: "direction",
  type: "direction",
  defaultValue: "45deg",
} as const satisfies PhiBackgroundPatternFieldDescriptor;

export const PHI_CORE_BACKGROUND_PATTERN_PROVIDERS = [
  {
    patternKey: PHI_CORE_BACKGROUND_PATTERN_KEYS.stripes,
    labelKey: "stripes",
    fields: [DIRECTION_FIELD, SCALE_FIELD],
  },
  {
    patternKey: PHI_CORE_BACKGROUND_PATTERN_KEYS.grid,
    labelKey: "grid",
    fields: [SCALE_FIELD],
  },
  {
    patternKey: PHI_CORE_BACKGROUND_PATTERN_KEYS.dots,
    labelKey: "dots",
    fields: [SCALE_FIELD],
  },
  {
    patternKey: PHI_CORE_BACKGROUND_PATTERN_KEYS.checker,
    labelKey: "checker",
    fields: [SCALE_FIELD],
  },
  {
    patternKey: PHI_CORE_BACKGROUND_PATTERN_KEYS.crosshatch,
    labelKey: "crosshatch",
    fields: [DIRECTION_FIELD, SCALE_FIELD],
  },
] as const satisfies readonly PhiBackgroundPatternProvider[];

export function resolvePhiBackgroundPatternProvider(
  patternKey: PhiBackgroundPatternKey,
): PhiBackgroundPatternProvider | null {
  return PHI_CORE_BACKGROUND_PATTERN_PROVIDERS.find((provider) => provider.patternKey === patternKey) ?? null;
}

export function resolvePhiBackgroundPatternDefaultValues(provider: PhiBackgroundPatternProvider) {
  return Object.fromEntries(provider.fields.map((field) => [field.key, field.defaultValue])) as PhiBackgroundPatternValues;
}
