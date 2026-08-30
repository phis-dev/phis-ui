import { createPhiModuleScopedKey, isPhiModuleScopedKey } from "../../../constants/runtime-module-ownership";
import type { PhiBackgroundDirection } from "./background";

export const PHI_BACKGROUND_PATTERN_NAMESPACE = "background-patterns";

export type PhiBackgroundPatternKey = `${string}/${typeof PHI_BACKGROUND_PATTERN_NAMESPACE}/${string}`;

export type PhiBackgroundPatternValue = string | number | boolean;

export type PhiBackgroundPatternValues = Record<string, PhiBackgroundPatternValue>;

export type PhiBackgroundNoiseGrain = "fine" | "medium" | "coarse";

export type PhiBackgroundPatternFieldDescriptor =
  | {
      key: string;
      type: "direction";
      defaultValue: PhiBackgroundDirection;
    }
  | {
      key: string;
      type: "number";
      defaultValue: number;
      min: number;
      max: number;
      step: number;
    };

export type PhiBackgroundPatternLayer = {
  images: readonly string[];
  sizes?: readonly string[];
  positions?: readonly string[];
  repeats?: readonly string[];
};

/**
 * A pattern is named by the module that ships it, like every other first-party identifier: the core
 * module carries these, so a Site that never loads anything else still resolves them.
 */
export const PHI_CORE_BACKGROUND_PATTERN_KEYS = {
  stripes: createPhiModuleScopedKey(PHI_BACKGROUND_PATTERN_NAMESPACE, "stripes"),
  grid: createPhiModuleScopedKey(PHI_BACKGROUND_PATTERN_NAMESPACE, "grid"),
  dots: createPhiModuleScopedKey(PHI_BACKGROUND_PATTERN_NAMESPACE, "dots"),
  checker: createPhiModuleScopedKey(PHI_BACKGROUND_PATTERN_NAMESPACE, "checker"),
  crosshatch: createPhiModuleScopedKey(PHI_BACKGROUND_PATTERN_NAMESPACE, "crosshatch"),
} satisfies Record<string, PhiBackgroundPatternKey>;

export const PHI_DEFAULT_BACKGROUND_PATTERN_KEY = PHI_CORE_BACKGROUND_PATTERN_KEYS.stripes;

export function isPhiBackgroundPatternKey(value: unknown): value is PhiBackgroundPatternKey {
  return isPhiModuleScopedKey(PHI_BACKGROUND_PATTERN_NAMESPACE, value);
}
