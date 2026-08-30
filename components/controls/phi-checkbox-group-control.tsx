"use client";

import { Checkbox, Flex, Tooltip } from "antd";

import { PhiIcon } from "../shell/phi-icon";
import type { PhiControlOption } from "./phi-control-options";

export type PhiCheckboxGroupControlProps<TValue extends string | number = string> = {
  value?: readonly TValue[];
  options: readonly PhiControlOption<TValue>[];
  disabled?: boolean;
  readOnly?: boolean;
  vertical?: boolean;
  onChange?: (value: TValue[]) => void;
};

export function PhiCheckboxGroupControl<TValue extends string | number = string>({
  value,
  options,
  disabled,
  readOnly,
  vertical,
  onChange,
}: PhiCheckboxGroupControlProps<TValue>) {
  return (
    <Checkbox.Group
      value={[...(value ?? [])]}
      disabled={disabled || readOnly || !onChange}
      onChange={(nextValue) => onChange?.(nextValue as TValue[])}
      style={{ width: "100%" }}
    >
      <Flex vertical={vertical} gap="small" wrap={vertical ? false : "wrap"}>
        {options.map((option) => {
          const content = (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--ant-padding-xxs)" }}>
              {option.icon ? <PhiIcon name={option.icon} size={14} /> : null}
              {option.label}
            </span>
          );
          return (
            <Checkbox key={option.value} value={option.value} disabled={option.disabled}>
              {option.description ? <Tooltip title={option.description}>{content}</Tooltip> : content}
            </Checkbox>
          );
        })}
      </Flex>
    </Checkbox.Group>
  );
}
