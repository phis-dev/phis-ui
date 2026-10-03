"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";

import { TreeSelect } from "antd";
import type { TreeSelectProps } from "antd";

import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import type { PhiTreeOption } from "../../types/tree";
import { PhiControlOptionContent } from "./phi-control-option-content";
import { PhiLabeledControl, usePhiControlLabel } from "./phi-labeled-control";

export type PhiTreeSelectControlProps<TMeta = unknown> = {
  value?: string | null;
  options: readonly PhiTreeOption<TMeta>[];
  label?: string;
  description?: ReactNode;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  allowClear?: boolean;
  size?: PhiControlSize;
  variant?: PhiControlVariant;
  /**
   * How deep the tree stands open when it is first shown.
   *
   * Open by default, because a picker that opens collapsed hides the thing it is for: the reader sees
   * one root and has to guess that what they came for is under it. A tree deep enough for that to be
   * unhelpful says so by passing a number.
   */
  defaultExpandedDepth?: number | "all";
  popupMatchSelectWidth?: boolean | number;
  getPopupContainer?: TreeSelectProps["getPopupContainer"];
  popupRootClassName?: string;
  popupZIndex?: number;
  style?: CSSProperties;
  onOpenChange?: (open: boolean) => void;
  /**
   * The chosen value, and the option it came from.
   *
   * Handing the option back is the point. A caller that only got the value would have to walk the tree
   * again to find what it stands for, and walking a tree to recover what was just clicked is how a
   * selection turns back into a lookup that can miss -- a node's value read against a second copy of the
   * catalogue answers with whichever entry that copy happens to hold first.
   */
  onChange: (value: string | null, option: PhiTreeOption<TMeta> | null) => void;
};

type PhiTreeSelectNode = {
  value: string;
  title: ReactNode;
  searchLabel: string;
  disabled?: boolean;
  children?: PhiTreeSelectNode[];
};

function buildPhiTreeSelectNodes<TMeta>(
  options: readonly PhiTreeOption<TMeta>[],
): PhiTreeSelectNode[] {
  return options.map((option) => ({
    value: option.value,
    title: (
      <PhiControlOptionContent
        option={{
          value: option.value,
          label: option.label,
          ...(option.description ? { description: option.description } : {}),
        }}
        presentation="dropdown"
      />
    ),
    searchLabel: `${option.label} ${option.description ?? ""}`.trim(),
    ...(option.disabled ? { disabled: true } : {}),
    ...(option.children?.length ? { children: buildPhiTreeSelectNodes(option.children) } : {}),
  }));
}

function indexPhiTreeOptions<TMeta>(
  options: readonly PhiTreeOption<TMeta>[],
  index: Map<string, PhiTreeOption<TMeta>>,
) {
  for (const option of options) {
    index.set(option.value, option);
    if (option.children?.length) {
      indexPhiTreeOptions(option.children, index);
    }
  }
  return index;
}

function collectPhiTreeSelectExpandedValues<TMeta>(
  options: readonly PhiTreeOption<TMeta>[],
  depth: number | "all",
  collected: string[] = [],
) {
  if (depth !== "all" && depth <= 0) {
    return collected;
  }
  for (const option of options) {
    if (!option.children?.length) continue;
    collected.push(option.value);
    collectPhiTreeSelectExpandedValues(option.children, depth === "all" ? "all" : depth - 1, collected);
  }
  return collected;
}

/**
 * One value chosen out of a hierarchy, where the hierarchy is what makes the choice readable.
 *
 * The Select next to this one takes a flat list, and flattening is not free: a Page tree read as a list
 * loses which Page sits under which, so two entries called "Overview" become indistinguishable and the
 * reader picks by guess. Rows that cannot be chosen -- a path with no Page of its own, a Page that has
 * been deleted -- still stand here as structure, because leaving them out would close the branch their
 * children live on.
 *
 * **The value is the node's own, never a path assembled from its ancestors.** That is the difference
 * between this and a Cascader, and it is not cosmetic: a Cascader's hierarchy *is* its value, split on a
 * separator, so the thing it hands back has to be resolved against a catalogue again -- and against the
 * wrong copy of that catalogue it resolves to a different node than the one that was clicked. Whatever a
 * node stands for travels in `meta` and comes back untouched.
 */
export function PhiTreeSelectControl<TMeta = unknown>({
  value,
  options,
  label,
  description,
  ariaLabel,
  placeholder,
  disabled,
  readOnly,
  allowClear,
  size,
  variant,
  defaultExpandedDepth = "all",
  popupMatchSelectWidth = false,
  getPopupContainer,
  popupRootClassName,
  popupZIndex,
  style,
  onOpenChange,
  onChange,
}: PhiTreeSelectControlProps<TMeta>) {
  const { labelId, labelledBy } = usePhiControlLabel(label, ariaLabel);
  const treeData = useMemo(() => buildPhiTreeSelectNodes(options), [options]);
  const optionsByValue = useMemo(() => indexPhiTreeOptions(options, new Map()), [options]);
  const defaultExpandedKeys = useMemo(
    () => collectPhiTreeSelectExpandedValues(options, defaultExpandedDepth),
    [defaultExpandedDepth, options],
  );

  const control = (
    <TreeSelect<string>
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      value={value ?? undefined}
      treeData={treeData}
      placeholder={placeholder}
      disabled={disabled || readOnly}
      allowClear={allowClear}
      size={size}
      variant={variant}
      treeDefaultExpandedKeys={defaultExpandedKeys}
      popupMatchSelectWidth={popupMatchSelectWidth}
      getPopupContainer={getPopupContainer}
      classNames={popupRootClassName ? { popup: { root: popupRootClassName } } : undefined}
      styles={popupZIndex == null ? undefined : { popup: { root: { zIndex: popupZIndex } } }}
      showSearch
      /*
       * Stated rather than left to `treeNodeFilterProp`, because the title is a rendered option and not a
       * string: the primitive would search the React element and match nothing.
       */
      filterTreeNode={(input, node) =>
        String((node as unknown as PhiTreeSelectNode).searchLabel ?? "")
          .toLowerCase()
          .includes(input.toLowerCase())}
      onOpenChange={onOpenChange}
      onChange={(nextValue) => onChange(nextValue ?? null, optionsByValue.get(nextValue) ?? null)}
      style={style}
    />
  );
  return (
    <PhiLabeledControl label={label} labelId={labelId} description={description} fill={style?.width === "100%"}>
      {control}
    </PhiLabeledControl>
  );
}
