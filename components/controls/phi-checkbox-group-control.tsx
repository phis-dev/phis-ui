"use client";

import { Checkbox, Flex } from "antd";

import type { PhiControlOption } from "./phi-control-options";
import { PhiControlOptionContent } from "./phi-control-option-content";

export type PhiCheckboxGroupControlProps<TValue extends string | number = string> = {
  value?: readonly TValue[];
  /** The group's accessible name; the group has no visible label of its own. */
  ariaLabel?: string;
  options: readonly PhiControlOption<TValue>[];
  disabled?: boolean;
  readOnly?: boolean;
  vertical?: boolean;
  onChange?: (value: TValue[]) => void;
};

export function PhiCheckboxGroupControl<TValue extends string | number = string>({
  value,
  ariaLabel,
  options,
  disabled,
  readOnly,
  vertical,
  onChange,
}: PhiCheckboxGroupControlProps<TValue>) {
  return (
    <Checkbox.Group
      role="group"
      aria-label={ariaLabel}
      value={[...(value ?? [])]}
      disabled={disabled || readOnly || !onChange}
      onChange={(nextValue) => onChange?.(nextValue as TValue[])}
      style={{ width: "100%" }}
    >
      <Flex vertical={vertical} gap="small" wrap={vertical ? false : "wrap"}>
        {options.map((option) => (
          <Checkbox key={option.value} value={option.value} disabled={option.disabled}>
            <PhiControlOptionContent option={option} presentation="option" />
          </Checkbox>
        ))}
      </Flex>
    </Checkbox.Group>
  );
}
