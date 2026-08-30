"use client";

import { Space } from "antd";

import { PhiSelectControl } from "./phi-select-control";
import { PhiTextControl } from "./phi-text-control";

export type PhiPresetSizeOption = {
  key: string;
  label?: string;
  value: number;
};

export type PhiPresetSizeControlProps<TKey extends string = string> = {
  value: number;
  options: ReadonlyArray<PhiPresetSizeOption & { key: TKey }>;
  fallbackKey: TKey;
  disabled?: boolean;
  onChange?: (value: number, key: TKey) => void;
};

function resolvePresetKey<TKey extends string>(
  value: number,
  options: ReadonlyArray<PhiPresetSizeOption & { key: TKey }>,
  fallbackKey: TKey,
) {
  return options.find((option) => option.value === value)?.key ?? fallbackKey;
}

export function PhiPresetSizeControl<TKey extends string = string>({
  value,
  options,
  fallbackKey,
  disabled = false,
  onChange,
}: PhiPresetSizeControlProps<TKey>) {
  const selectedKey = resolvePresetKey(value, options, fallbackKey);
  const selectOptions = options.map((option) => ({
    value: option.key,
    label: option.label ?? option.key,
  }));

  return (
    <Space.Compact style={{ width: "100%" }}>
      <PhiSelectControl
        disabled={disabled}
        value={selectedKey}
        options={selectOptions}
        onChange={(nextKey) => {
          const nextOption = options.find((option) => option.key === nextKey);
          if (nextOption) {
            onChange?.(nextOption.value, nextOption.key);
          }
        }}
        style={{ width: "58%" }}
      />
      <PhiTextControl readOnly allowClear={false} value={`${value}px`} style={{ width: "42%" }} />
    </Space.Compact>
  );
}
