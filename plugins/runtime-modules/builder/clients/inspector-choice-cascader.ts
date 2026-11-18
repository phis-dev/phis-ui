import {
  normalizePhiCascaderValue,
  type PhiCascaderOption,
} from "../../../../components/controls/phi-cascader-control";
import type { PhiControlOption } from "../../../../components/controls/phi-control-options";

/*
 * A choice field shown as a cascader (`presentation: "cascader"`): the options stand in a hierarchy by
 * their `parentValue`, and `PhiCascaderControl` builds its levels from path values. The paths are this
 * file's own -- the values from the top down, joined -- and never leave it: the field stores the chosen
 * option's `value`, as a Select would.
 *
 * The separator and the root are characters no option value carries, so a value that is itself a path
 * (`/shop/cart`) stays one segment.
 */
export const PHI_INSPECTOR_CHOICE_CASCADER_SEPARATOR = "␟";
export const PHI_INSPECTOR_CHOICE_CASCADER_ROOT = "␞";

export type PhiInspectorChoiceCascader = {
  /** The options as the Cascader takes them: each one's path as its value, parents before children. */
  options: PhiCascaderOption[];
  /** The path each option's value stands at. */
  pathByValue: ReadonlyMap<string, string>;
  /** The option behind each path, for writing back what was chosen. */
  optionByPath: ReadonlyMap<string, PhiControlOption>;
};

function normalizePath(segments: readonly string[]) {
  return normalizePhiCascaderValue(segments.join(PHI_INSPECTOR_CHOICE_CASCADER_SEPARATOR), {
    separator: PHI_INSPECTOR_CHOICE_CASCADER_SEPARATOR,
    rootValue: PHI_INSPECTOR_CHOICE_CASCADER_ROOT,
    normalize: "raw",
  });
}

/**
 * The options as a tree, by `parentValue`. An option whose `parentValue` names no option in the list,
 * or whose chain of parents leads back to itself, stands at the top level; the first of two options
 * with the same value is the one offered.
 */
export function buildPhiInspectorChoiceCascader(
  options: readonly PhiControlOption[],
): PhiInspectorChoiceCascader {
  const byValue = new Map<string, PhiControlOption>();
  for (const option of options) {
    const value = String(option.value);
    if (!byValue.has(value)) byValue.set(value, option);
  }

  const rawParentOf = (value: string) => {
    const parentValue = byValue.get(value)?.parentValue;
    if (parentValue == null) return null;
    const parent = String(parentValue);
    return byValue.has(parent) ? parent : null;
  };

  // The parent an option keeps: none where following the parents from there comes back to the option.
  const parentOf = new Map<string, string | null>();
  for (const value of byValue.keys()) {
    const parent = rawParentOf(value);
    let current = parent;
    const seen = new Set<string>();
    while (current != null && current !== value && !seen.has(current)) {
      seen.add(current);
      current = rawParentOf(current);
    }
    parentOf.set(value, current === value ? null : parent);
  }

  const segmentsOf = (value: string) => {
    const segments: string[] = [];
    for (let current: string | null = value; current != null; current = parentOf.get(current) ?? null) {
      segments.unshift(current);
    }
    return segments;
  };

  const entries = [...byValue.entries()].map(([value, option]) => {
    const segments = segmentsOf(value);
    return { value, option, depth: segments.length, path: normalizePath(segments) };
  });
  // The Cascader names a level after the option inserted at it first, so a parent goes in before its children.
  const ordered = entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => left.entry.depth - right.entry.depth || left.index - right.index)
    .map(({ entry }) => entry);

  const pathByValue = new Map<string, string>();
  const optionByPath = new Map<string, PhiControlOption>();
  const cascaderOptions: PhiCascaderOption[] = [];
  for (const { value, option, path } of ordered) {
    pathByValue.set(value, path);
    optionByPath.set(path, option);
    cascaderOptions.push({
      value: path,
      label: option.label,
      ...(option.description ? { description: option.description } : {}),
      ...(option.icon ? { icon: option.icon } : {}),
    });
  }

  return { options: cascaderOptions, pathByValue, optionByPath };
}

/**
 * What the Cascader is handed as its value: the stored value's path, or the stored value itself where no
 * option has it -- shown as it is, the way a Select shows a value it has no option for.
 */
export function readPhiInspectorChoiceCascaderPath(
  cascader: PhiInspectorChoiceCascader,
  value: string | null | undefined,
) {
  if (value == null || value === "") return undefined;
  return cascader.pathByValue.get(value) ?? value;
}

/**
 * The value a chosen path writes back: the chosen option's own value. A path that names no option -- a
 * search text, the empty root -- or a disabled option writes nothing.
 */
export function readPhiInspectorChoiceCascaderValue(
  cascader: PhiInspectorChoiceCascader,
  path: string,
): string | null {
  const option = cascader.optionByPath.get(path);
  return option && option.disabled !== true ? String(option.value) : null;
}
