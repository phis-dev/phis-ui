"use client";

import type { CSSProperties, ReactNode } from "react";

import { AutoComplete, Select } from "antd";
import type { SelectProps } from "antd";

import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import type { PhiControlOption } from "./phi-control-options";
import { PhiControlOptionContent } from "./phi-control-option-content";
import { PhiLabeledControl } from "./phi-labeled-control";

export type PhiSelectControlProps<TValue extends string | number = string> = {
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

export function PhiSelectControl<TValue extends string | number = string>({
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
  const resolvedOptions = options.map((option) => ({
    value: option.value,
    // rc-select synthesizes native HTML title attributes from primitive labels.
    // Phi owns option descriptions through PhiControlOptionContent instead.
    label: <>{option.label}</>,
    searchLabel: option.label,
    disabled: option.disabled,
    option,
  }));
  const controlDisabled = disabled || readOnly;

  const canUseTextEntry = (presentation === "autocomplete" || allowCustom) &&
    (value === undefined || typeof value === "string") &&
    options.every((option) => typeof option.value === "string");

  if (canUseTextEntry) {
    const control = (
      <AutoComplete
        aria-label={ariaLabel}
        value={value}
        placeholder={placeholder}
        disabled={controlDisabled}
        allowClear={allowClear}
        options={resolvedOptions}
        optionRender={(resolvedOption) => (
          <PhiControlOptionContent
            option={resolvedOption.data.option as PhiControlOption<TValue>}
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
          : (inputValue, option) =>
            String(option?.searchLabel ?? option?.value ?? "")
              .toLowerCase()
              .includes(inputValue.toLowerCase())
        }
        onSearch={onSearch}
        onFocus={onFocus}
        onBlur={onBlur}
        onOpenChange={onOpenChange}
        onChange={(nextValue) => onChange(nextValue as TValue)}
        style={style}
      />
    );
    return <PhiLabeledControl label={label} description={description} fill={style?.width === "100%"}>{control}</PhiLabeledControl>;
  }

  const control = (
    <Select
      aria-label={ariaLabel}
      value={value ?? undefined}
      placeholder={placeholder}
      disabled={controlDisabled}
      allowClear={allowClear}
      options={resolvedOptions}
      optionRender={(resolvedOption) => (
        <PhiControlOptionContent
          option={resolvedOption.data.option as PhiControlOption<TValue>}
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
  return <PhiLabeledControl label={label} description={description} fill={style?.width === "100%"}>{control}</PhiLabeledControl>;
}
