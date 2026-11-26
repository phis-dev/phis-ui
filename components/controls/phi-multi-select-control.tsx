"use client";

import { useMemo, type ReactNode } from "react";
import { Select } from "antd";
import type { SelectProps } from "antd";

import type { PhiControlSize, PhiControlVariant } from "../../types/control";
import type { PhiControlOption } from "./phi-control-options";
import { PhiControlOptionContent } from "./phi-control-option-content";
import { PhiLabeledControl, usePhiControlLabel } from "./phi-labeled-control";
import { groupPhiSelectOptions } from "./phi-select-control";

export type PhiMultiSelectControlProps<TValue extends string | number = string> = {
  /** The DOM id of the input, so a `<label for>` outside the control can name it. */
  id?: string;
  value?: readonly TValue[];
  label?: string;
  description?: ReactNode;
  /**
   * The accessible name where no visible label stands beside the field -- a filter in a picker's header.
   * It takes precedence over `label`, as on `PhiSelectControl`.
   */
  ariaLabel?: string;
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
  /** Where the list is mounted; the document's end where left out. */
  getPopupContainer?: SelectProps["getPopupContainer"];
  style?: SelectProps["style"];
  onFocus?: () => void;
  onBlur?: () => void;
  onChange?: (value: TValue[]) => void;
};

export function PhiMultiSelectControl<TValue extends string | number = string>({
  id,
  value,
  label,
  description,
  ariaLabel,
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
  getPopupContainer,
  style,
  onFocus,
  onBlur,
  onChange,
}: PhiMultiSelectControlProps<TValue>) {
  const { labelId, labelledBy } = usePhiControlLabel(label, ariaLabel);
  // Options that name a group are listed under its heading, as the Select lists them.
  const selectOptions = useMemo(
    () => groupPhiSelectOptions(options.map((option) => ({
      value: option.value,
      // Keep labels non-primitive so rc-select cannot add native HTML titles.
      label: <>{option.label}</>,
      searchLabel: option.label,
      option,
      disabled: option.disabled,
    }))),
    [options],
  );
  const control = (
    <Select
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      mode={allowCustom ? "tags" : "multiple"}
      allowClear={allowClear}
      value={[...(value ?? [])]}
      placeholder={placeholder}
      disabled={disabled || readOnly || !onChange}
      options={selectOptions}
      optionFilterProp={["searchLabel", "value"]}
      optionRender={(option) => {
        /*
         * With `allowCustom` the Select offers what is being typed as an option of its own, and that one
         * carries no Phi option: it is a value nobody declared yet, drawn as the text it is.
         */
        const item = (option.data as { option?: PhiControlOption<TValue> }).option;
        return item
          ? <PhiControlOptionContent option={item} presentation="dropdown" />
          : <>{String(option.value ?? "")}</>;
      }}
      labelRender={(selectedOption) => {
        const selected = options.find((option) => option.value === selectedOption.value);
        return selected
          ? <PhiControlOptionContent option={selected} presentation="selection" />
          : selectedOption.label;
      }}
      maxTagCount={maxTagCount}
      popupMatchSelectWidth={popupMatchSelectWidth}
      getPopupContainer={getPopupContainer}
      size={size}
      variant={variant}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={onChange}
      style={style}
    />
  );

  return <PhiLabeledControl label={label} labelId={labelId} description={description} fill={style?.width === "100%"}>{control}</PhiLabeledControl>;
}
