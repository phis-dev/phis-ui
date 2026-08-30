"use client";

import { useMemo, type ReactNode } from "react";
import { Select } from "antd";
import type { SelectProps } from "antd";

import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import type { PhiControlOption } from "./phi-control-options";
import { PhiControlOptionContent } from "./phi-control-option-content";
import { PhiLabeledControl } from "./phi-labeled-control";

export type PhiMultiSelectControlProps<TValue extends string | number = string> = {
  value?: readonly TValue[];
  label?: string;
  description?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  allowCustom?: boolean;
  allowClear?: boolean;
  options: readonly PhiControlOption<TValue>[];
  maxTagCount?: number | "responsive";
  size?: PhiControlSize;
  variant?: PhiControlVariant;
  popupMatchSelectWidth?: boolean | number;
  style?: SelectProps["style"];
  onFocus?: () => void;
  onBlur?: () => void;
  onChange?: (value: TValue[]) => void;
};

export function PhiMultiSelectControl<TValue extends string | number = string>({
  value,
  label,
  description,
  placeholder,
  disabled,
  readOnly,
  allowCustom,
  allowClear,
  options,
  maxTagCount,
  size,
  variant,
  popupMatchSelectWidth = false,
  style,
  onFocus,
  onBlur,
  onChange,
}: PhiMultiSelectControlProps<TValue>) {
  const selectOptions = useMemo(
    () => options.map((option) => ({
      value: option.value,
      // Keep labels non-primitive so rc-select cannot add native HTML titles.
      label: <>{option.label}</>,
      searchLabel: option.label,
      option,
      disabled: option.disabled,
    })),
    [options],
  );
  const control = (
    <Select
      mode={allowCustom ? "tags" : "multiple"}
      allowClear={allowClear}
      value={[...(value ?? [])]}
      placeholder={placeholder}
      disabled={disabled || readOnly || !onChange}
      options={selectOptions}
      optionFilterProp={["searchLabel", "value"]}
      optionRender={(option) => {
        const item = option.data.option as PhiControlOption<TValue>;
        return <PhiControlOptionContent option={item} presentation="dropdown" />;
      }}
      labelRender={(selectedOption) => {
        const selected = options.find((option) => option.value === selectedOption.value);
        return selected
          ? <PhiControlOptionContent option={selected} presentation="selection" />
          : selectedOption.label;
      }}
      maxTagCount={maxTagCount}
      popupMatchSelectWidth={popupMatchSelectWidth}
      size={size}
      variant={variant}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={onChange}
      style={style}
    />
  );

  return <PhiLabeledControl label={label} description={description} fill={style?.width === "100%"}>{control}</PhiLabeledControl>;
}
