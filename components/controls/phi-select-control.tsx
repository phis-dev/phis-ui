"use client";

import type { CSSProperties, ReactNode } from "react";

import { AutoComplete, Select } from "antd";
import type { SelectProps } from "antd";

import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import type { PhiControlOption } from "./phi-control-options";
import { PhiControlOptionContent } from "./phi-control-option-content";
import { PhiLabeledControl, usePhiControlLabel } from "./phi-labeled-control";

export type PhiSelectControlProps<TValue extends string | number = string> = {
  /** The DOM id of the input, so a `<label for>` outside the control can name it. */
  id?: string;
  value?: TValue;
  label?: string;
  description?: ReactNode;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  presentation?: "select" | "autocomplete";
  allowCustom?: boolean;
  allowClear?: boolean;
  options: readonly PhiControlOption<TValue>[];
  size?: PhiControlSize;
  variant?: PhiControlVariant;
  popupMatchSelectWidth?: boolean | number;
  getPopupContainer?: SelectProps["getPopupContainer"];
  popupRootClassName?: string;
  popupZIndex?: number;
  style?: CSSProperties;
  onFocus?: () => void;
  onBlur?: () => void;
  onOpenChange?: (open: boolean) => void;
  /**
   * Reports what has been typed, so a provider that searches server-side can be asked again.
   *
   * Debounced here rather than in each provider: the control is the one place that knows a keystroke
   * happened, and every provider would otherwise reinvent the same guard.
   */
  onSearch?: (search: string) => void;
  /** `false` turns off local filtering, because the answer is already the result of the search. */
  filterOptionsLocally?: boolean;
  onChange: (value: TValue) => void;
};

type PhiResolvedSelectOption<TValue extends string | number> = {
  value: TValue;
  label: ReactNode;
  searchLabel: string;
  disabled?: boolean;
  option: PhiControlOption<TValue>;
};

/*
 * A line in the menu, which antd's Select has no entry for: an option nobody can choose, drawn as the
 * line and nothing else. Its value cannot meet a real one, and its empty search label drops it from
 * every search, where a line between whatever is left would separate nothing.
 */
type PhiSelectSeparatorEntry = {
  value: string;
  label: ReactNode;
  searchLabel: "";
  disabled: true;
  style: CSSProperties;
  separator: true;
};

const PHI_SELECT_SEPARATOR_STYLE: CSSProperties = { minHeight: 0, padding: 0, cursor: "default" };

function isPhiSelectSeparatorEntry(entry: unknown): entry is PhiSelectSeparatorEntry {
  return typeof entry === "object" && entry != null && "separator" in entry;
}

function renderPhiSelectSeparator() {
  return <div role="separator" style={{ borderTop: "1px solid var(--ant-color-split)", marginBlock: 4 }} />;
}

/* The options with a line where one asks for it -- once, where an option after and one before agree. */
function separatePhiSelectOptions<TValue extends string | number>(
  resolved: PhiResolvedSelectOption<TValue>[],
): Array<PhiResolvedSelectOption<TValue> | PhiSelectSeparatorEntry> {
  const entries: Array<PhiResolvedSelectOption<TValue> | PhiSelectSeparatorEntry> = [];
  resolved.forEach((entry, index) => {
    const lineBefore = index > 0 &&
      (entry.option.separator === "before" || resolved[index - 1]?.option.separator === "after");
    if (lineBefore) {
      entries.push({
        value: `\u0000separator-${index}`,
        label: null,
        searchLabel: "",
        disabled: true,
        style: PHI_SELECT_SEPARATOR_STYLE,
        separator: true,
      });
    }
    entries.push(entry);
  });
  return entries;
}

/*
 * Consecutive options that name the same group, under one heading. Options without a group stay at the
 * top level, and a list that names no group at all comes back unchanged.
 */
function groupPhiSelectOptions<TValue extends string | number>(
  resolved: Array<PhiResolvedSelectOption<TValue> | PhiSelectSeparatorEntry>,
) {
  if (!resolved.some((entry) => !isPhiSelectSeparatorEntry(entry) && entry.option.group)) {
    return resolved;
  }
  const grouped: Array<PhiResolvedSelectOption<TValue> | PhiSelectSeparatorEntry | {
    label: ReactNode;
    title: string;
    options: PhiResolvedSelectOption<TValue>[];
  }> = [];
  for (const entry of resolved) {
    if (isPhiSelectSeparatorEntry(entry)) {
      grouped.push(entry);
      continue;
    }
    const group = entry.option.group;
    const last = grouped.at(-1);
    if (!group) {
      grouped.push(entry);
    } else if (last && "options" in last && last.title === group) {
      last.options.push(entry);
    } else {
      grouped.push({ label: <>{group}</>, title: group, options: [entry] });
    }
  }
  return grouped;
}

export function PhiSelectControl<TValue extends string | number = string>({
  id,
  value,
  label,
  description,
  ariaLabel,
  placeholder,
  disabled,
  readOnly,
  presentation = "select",
  allowCustom,
  allowClear,
  options,
  size,
  variant,
  popupMatchSelectWidth = false,
  getPopupContainer,
  popupRootClassName,
  popupZIndex,
  style,
  onFocus,
  onBlur,
  onOpenChange,
  onSearch,
  filterOptionsLocally = true,
  onChange,
}: PhiSelectControlProps<TValue>) {
  const { labelId, labelledBy } = usePhiControlLabel(label, ariaLabel);
  const resolvedOptions = groupPhiSelectOptions(separatePhiSelectOptions(options.map((option) => ({
    value: option.value,
    // rc-select synthesizes native HTML title attributes from primitive labels.
    // Phi owns option descriptions through PhiControlOptionContent instead.
    label: <>{option.label}</>,
    searchLabel: option.label,
    disabled: option.disabled,
    option,
  }))));
  const controlDisabled = disabled || readOnly;

  const canUseTextEntry = (presentation === "autocomplete" || allowCustom) &&
    (value === undefined || typeof value === "string") &&
    options.every((option) => typeof option.value === "string");

  if (canUseTextEntry) {
    const control = (
      <AutoComplete
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        value={value}
        placeholder={placeholder}
        disabled={controlDisabled}
        allowClear={allowClear}
        options={resolvedOptions}
        optionRender={(resolvedOption) => isPhiSelectSeparatorEntry(resolvedOption.data) ? renderPhiSelectSeparator() : (
          <PhiControlOptionContent
            option={(resolvedOption.data as PhiResolvedSelectOption<TValue>).option}
            presentation="dropdown"
          />
        )}
        size={size}
        variant={variant}
        popupMatchSelectWidth={popupMatchSelectWidth}
        getPopupContainer={getPopupContainer}
        classNames={popupRootClassName ? { popup: { root: popupRootClassName } } : undefined}
        styles={popupZIndex == null ? undefined : { popup: { root: { zIndex: popupZIndex } } }}
        filterOption={!filterOptionsLocally
          ? false
          : (inputValue, option) => {
            // A group heading has no search label of its own; antd filters the options inside it.
            const entry = option as Partial<PhiResolvedSelectOption<TValue>> | undefined;
            return String(entry?.searchLabel ?? entry?.value ?? "")
              .toLowerCase()
              .includes(inputValue.toLowerCase());
          }
        }
        onSearch={onSearch}
        onFocus={onFocus}
        onBlur={onBlur}
        onOpenChange={onOpenChange}
        onChange={(nextValue) => onChange(nextValue as TValue)}
        style={style}
      />
    );
    return <PhiLabeledControl label={label} labelId={labelId} description={description} fill={style?.width === "100%"}>{control}</PhiLabeledControl>;
  }

  const control = (
    <Select
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      value={value ?? undefined}
      placeholder={placeholder}
      disabled={controlDisabled}
      allowClear={allowClear}
      options={resolvedOptions}
      optionRender={(resolvedOption) => isPhiSelectSeparatorEntry(resolvedOption.data) ? renderPhiSelectSeparator() : (
        <PhiControlOptionContent
          option={(resolvedOption.data as PhiResolvedSelectOption<TValue>).option}
          presentation="dropdown"
        />
      )}
      labelRender={(selectedOption) => {
        const selected = options.find((option) => option.value === selectedOption.value);
        return selected
          ? <PhiControlOptionContent option={selected} presentation="selection" />
          : selectedOption.label;
      }}
      size={size}
      variant={variant}
      popupMatchSelectWidth={popupMatchSelectWidth}
      getPopupContainer={getPopupContainer}
      classNames={popupRootClassName ? { popup: { root: popupRootClassName } } : undefined}
      styles={popupZIndex == null ? undefined : { popup: { root: { zIndex: popupZIndex } } }}
      showSearch
      optionFilterProp={["searchLabel", "value"]}
      filterOption={filterOptionsLocally ? undefined : false}
      onSearch={onSearch}
      onFocus={onFocus}
      onBlur={onBlur}
      onOpenChange={onOpenChange}
      onChange={onChange}
      style={style}
    />
  );
  return <PhiLabeledControl label={label} labelId={labelId} description={description} fill={style?.width === "100%"}>{control}</PhiLabeledControl>;
}
