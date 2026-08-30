"use client";

import { Flex, Radio, Tooltip } from "antd";

import { PhiIcon } from "../shell/phi-icon";
import type { PhiControlSize } from "../../types/control";
import type { PhiControlOption } from "./phi-control-options";

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
        {options.map((option) => {
          const content = (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--ant-padding-xxs)" }}>
              {option.icon ? <PhiIcon name={option.icon} size={14} /> : null}
              {option.label}
            </span>
          );
          return (
            <Radio key={option.value} value={option.value} disabled={option.disabled}>
              {option.description ? <Tooltip title={option.description}>{content}</Tooltip> : content}
            </Radio>
          );
        })}
      </Flex>
    </Radio.Group>
  );
}
