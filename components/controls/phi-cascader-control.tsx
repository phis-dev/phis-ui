"use client";

import { useMemo, useState, type CSSProperties } from "react";

import { Cascader } from "antd";
import type { CascaderProps, DefaultOptionType } from "antd/es/cascader";

import type { PhiControlSize } from "../../types/control";
import type { PhiControlOption } from "./phi-control-options";
import { PhiLabeledControl } from "./phi-labeled-control";

export type PhiCascaderNormalizeMode = "raw" | "path";

export type PhiCascaderOption = PhiControlOption;

export function normalizePhiCascaderValue(
  value: string | null | undefined,
  options?: {
    separator?: string | null;
    rootValue?: string | null;
    normalize?: PhiCascaderNormalizeMode | null;
  },
) {
  const separator = options?.separator?.trim() || "/";
  const rootValue = options?.rootValue?.trim() || "/";
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === rootValue) {
    return rootValue;
  }

  const normalizedInput = trimmed
    .replace(new RegExp(`^${escapeRegExp(separator)}+`), "")
    .replace(new RegExp(`${escapeRegExp(separator)}+$`), "");

  const segments = normalizedInput
    .split(separator)
    .map((segment) => {
      const rawSegment = segment.trim();
      if (options?.normalize !== "path") {
        return rawSegment;
      }

      return rawSegment
        .toLowerCase()
        .replace(/['"]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    })
    .filter(Boolean);

  return segments.length > 0 ? `${rootValue === separator ? separator : ""}${segments.join(separator)}` : rootValue;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleizeSegment(value: string, rootValue: string) {
  if (value === rootValue) {
    return rootValue;
  }

  return (
    value
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ") || rootValue
  );
}

function splitCascaderSegments(value: string, separator: string, rootValue: string) {
  const normalized = normalizePhiCascaderValue(value, { separator, rootValue, normalize: "raw" });
  return normalized === rootValue
    ? [rootValue]
    : normalized.replace(new RegExp(`^${escapeRegExp(separator)}+`), "").split(separator).filter(Boolean);
}

function joinCascaderSegments(segments: string[], separator: string, rootValue: string) {
  if (segments.length === 0 || segments[0] === rootValue) {
    return rootValue;
  }
  return `${rootValue === separator ? separator : ""}${segments.join(separator)}`;
}

function findOptionPath(
  options: DefaultOptionType[],
  normalizedValue: string,
  separator: string,
  rootValue: string,
): string[] | null {
  const targetSegments = splitCascaderSegments(normalizedValue, separator, rootValue);
  const visit = (nodes: DefaultOptionType[], segmentIndex: number, prefix: string[]): string[] | null => {
    const targetValue =
      targetSegments[segmentIndex] === rootValue
        ? rootValue
        : joinCascaderSegments(targetSegments.slice(0, segmentIndex + 1), separator, rootValue);

    for (const node of nodes) {
      if (node.value !== targetValue) {
        continue;
      }

      const currentPath = [...prefix, String(node.value)];
      if (segmentIndex === targetSegments.length - 1) {
        return currentPath;
      }

      const childPath = node.children ? visit(node.children as DefaultOptionType[], segmentIndex + 1, currentPath) : null;
      if (childPath) {
        return childPath;
      }
    }

    return null;
  };

  return visit(options, 0, []);
}

function insertCascaderOption(
  options: DefaultOptionType[],
  option: PhiCascaderOption,
  allowRoot: boolean,
  separator: string,
  rootValue: string,
  normalize: PhiCascaderNormalizeMode,
) {
  const value = normalizePhiCascaderValue(option.value, { separator, rootValue, normalize });
  if (value === rootValue) {
    if (allowRoot && !options.some((entry) => entry.value === rootValue)) {
      options.unshift({
        value: rootValue,
        label: option.label?.trim() || rootValue,
        title: "",
      });
    }
    return;
  }

  const segments = splitCascaderSegments(value, separator, rootValue);
  let currentOptions = options;

  segments.forEach((segment, index) => {
    const cumulativeValue = joinCascaderSegments(segments.slice(0, index + 1), separator, rootValue);
    let current = currentOptions.find((entry) => entry.value === cumulativeValue);
    if (!current) {
      current = {
        value: cumulativeValue,
        label: index === segments.length - 1 ? option.label?.trim() || titleizeSegment(segment, rootValue) : titleizeSegment(segment, rootValue),
        title: "",
      };
      currentOptions.push(current);
      currentOptions.sort((left, right) => String(left.label ?? "").localeCompare(String(right.label ?? "")));
    }

    if (index < segments.length - 1) {
      current.children = (current.children as DefaultOptionType[] | undefined) ?? [];
      currentOptions = current.children as DefaultOptionType[];
    }
  });
}

function buildCascaderOptions(
  configuredOptions: readonly PhiCascaderOption[],
  currentValue: string,
  allowRoot: boolean,
  separator: string,
  rootValue: string,
  normalize: PhiCascaderNormalizeMode,
) {
  const options: DefaultOptionType[] = [];
  if (allowRoot) {
    const configuredRoot = configuredOptions.find((option) =>
      normalizePhiCascaderValue(option.value, { separator, rootValue, normalize }) === rootValue);
    insertCascaderOption(
      options,
      { value: rootValue, label: configuredRoot?.label ?? rootValue },
      allowRoot,
      separator,
      rootValue,
      normalize,
    );
  }

  for (const option of configuredOptions) {
    insertCascaderOption(options, option, allowRoot, separator, rootValue, normalize);
  }

  insertCascaderOption(
    options,
    { value: currentValue, label: titleizeSegment(currentValue, rootValue) },
    allowRoot,
    separator,
    rootValue,
    normalize,
  );
  return options;
}

export function PhiCascaderControl({
  value,
  options,
  allowRoot = true,
  allowClear = false,
  expandTrigger = "click",
  separator = "/",
  rootValue = "/",
  normalize = "raw",
  disabled = false,
  readOnly = false,
  label,
  placeholder,
  size,
  onChange,
  onFocus,
  onBlur,
  classNames,
  getPopupContainer,
  style,
}: {
  value?: string | null;
  options?: readonly PhiCascaderOption[];
  allowRoot?: boolean;
  allowClear?: boolean;
  expandTrigger?: CascaderProps["expandTrigger"];
  separator?: string;
  rootValue?: string;
  normalize?: PhiCascaderNormalizeMode;
  disabled?: boolean;
  readOnly?: boolean;
  label?: string;
  placeholder?: string;
  size?: PhiControlSize;
  onChange?: (nextValue: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  classNames?: CascaderProps["classNames"];
  getPopupContainer?: CascaderProps["getPopupContainer"];
  style?: CSSProperties;
}) {
  const resolvedSeparator = separator.trim() || "/";
  const resolvedRootValue = rootValue.trim() || "/";
  const normalizedValue = normalizePhiCascaderValue(value, {
    separator: resolvedSeparator,
    rootValue: resolvedRootValue,
    normalize,
  });
  const [searchValue, setSearchValue] = useState("");
  const cascaderOptions = useMemo(
    () => buildCascaderOptions(options ?? [], normalizedValue, allowRoot, resolvedSeparator, resolvedRootValue, normalize),
    [allowRoot, normalize, normalizedValue, options, resolvedRootValue, resolvedSeparator],
  );
  const cascaderValue = findOptionPath(cascaderOptions, normalizedValue, resolvedSeparator, resolvedRootValue) ?? [];

  function commit(nextValue: string) {
    const normalizedNextValue = normalizePhiCascaderValue(nextValue, {
      separator: resolvedSeparator,
      rootValue: resolvedRootValue,
      normalize,
    });
    if (!allowRoot && normalizedNextValue === resolvedRootValue) {
      return;
    }
    setSearchValue("");
    onChange?.(normalizedNextValue);
  }

  const control = (
    <Cascader
      allowClear={allowClear}
      changeOnSelect
      expandTrigger={expandTrigger}
      rootClassName="phi-cascader-control"
      disabled={disabled || readOnly || !onChange}
      displayRender={(_, selectedOptions) => {
        const selectedLabels = (selectedOptions ?? [])
          .map((option) => option.label)
          .filter((label): label is NonNullable<typeof label> => label != null);
        // Keep the selected label non-primitive so rc-select cannot synthesize
        // a native HTML title from the visible Cascader text.
        return <>{selectedLabels.length > 0 ? selectedLabels.join(" / ") : resolvedRootValue}</>;
      }}
      options={cascaderOptions}
      placeholder={placeholder}
      size={size}
      searchValue={searchValue}
      showSearch
      value={cascaderValue}
      classNames={classNames}
      getPopupContainer={getPopupContainer}
      onFocus={onFocus}
      onBlur={() => {
        if (searchValue.trim()) {
          commit(searchValue);
        }
        onBlur?.();
      }}
      onChange={(nextValue) => {
        const selectedValue = Array.isArray(nextValue) ? nextValue.at(-1) : null;
        if (typeof selectedValue === "string") {
          commit(selectedValue);
        } else if (allowClear) {
          setSearchValue("");
          onChange?.(resolvedRootValue);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && searchValue.trim()) {
          commit(searchValue);
        }
      }}
      onSearch={setSearchValue}
      style={{ width: "100%", ...style }}
    />
  );
  return (
    <PhiLabeledControl label={label} fill={style?.width === undefined || style.width === "100%"}>
      {control}
    </PhiLabeledControl>
  );
}
