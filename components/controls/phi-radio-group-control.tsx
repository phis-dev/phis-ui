"use client";

import { Flex, Radio } from "antd";

import type { PhiControlSize } from "../../types/control";
import type { PhiControlOption } from "./phi-control-options";
import { PhiControlOptionContent } from "./phi-control-option-content";

export type PhiRadioGroupControlProps<TValue extends string | number = string> = {
  value?: TValue;
  options: readonly PhiControlOption<TValue>[];
  disabled?: boolean;
  readOnly?: boolean;
  vertical?: boolean;
  size?: PhiControlSize;
  onChange?: (value: TValue) => void;
};

export function PhiRadioGroupControl<TValue extends string | number = string>({
  value,
  options,
  disabled,
  readOnly,
  vertical,
  size,
  onChange,
}: PhiRadioGroupControlProps<TValue>) {
  return (
    <Radio.Group
      value={value}
      size={size}
      disabled={disabled || readOnly || !onChange}
      onChange={(event) => onChange?.(event.target.value as TValue)}
      style={{ width: "100%" }}
    >
      <Flex vertical={vertical} gap="small" wrap={vertical ? false : "wrap"}>
        {options.map((option) => (
          <Radio key={option.value} value={option.value} disabled={option.disabled}>
            <PhiControlOptionContent option={option} presentation="option" />
          </Radio>
        ))}
      </Flex>
    </Radio.Group>
  );
}
