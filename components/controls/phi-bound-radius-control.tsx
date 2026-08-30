"use client";

import { Flex, Select, Switch, Typography } from "antd";

import type { PhiCmsBorderWidgetConfig } from "../../types/cms-config";
import { usePhiConfig } from "../root/phi-config-provider";
import { PHI_RADII } from "../../theme/phi-tokens";
export type PhiRadiusControlLabels = {
  sections: { radius: string };
  fields: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
  radiusSizes: Record<PhiRadiusOptionValue, string>;
};

export type PhiRadiusOptionValue =
  | "none"
  | "xxs"
  | "xs"
  | "sm"
  | "base"
  | "md"
  | "lg"
  | "xl"
  | "xxl"
  | "round";

export type PhiBoundRadiusValue = Pick<
  PhiCmsBorderWidgetConfig,
  "borderTopLeftRadius" | "borderTopRightRadius" | "borderBottomLeftRadius" | "borderBottomRightRadius"
>;

export type PhiBoundRadiusControlProps = {
  value?: PhiBoundRadiusValue | null;
  disabled?: boolean;
  labels?: PhiRadiusControlLabels;
  showLabel?: boolean;
  onChange?: (nextValue: PhiBoundRadiusValue) => void;
};

const RADIUS_OPTIONS = [
  { value: "none", cssValue: 0 },
  { value: "xxs", cssValue: PHI_RADII.xxs },
  { value: "xs", cssValue: PHI_RADII.xs },
  { value: "sm", cssValue: PHI_RADII.sm },
  { value: "base", cssValue: PHI_RADII.base },
  { value: "md", cssValue: PHI_RADII.md },
  { value: "lg", cssValue: PHI_RADII.lg },
  { value: "xl", cssValue: PHI_RADII.xl },
  { value: "xxl", cssValue: PHI_RADII.xxl },
  { value: "round", cssValue: "50%" },
] as const satisfies ReadonlyArray<{
  value: PhiRadiusOptionValue;
  cssValue: number | string;
}>;

const RADIUS_COMPARE_ALIASES: Record<PhiRadiusOptionValue, ReadonlyArray<string>> = {
  none: ["0", "0px"],
  xxs: ["3", "3px", "var(--ant-border-radius-xs)"],
  xs: ["5", "5px", "var(--ant-border-radius-sm)"],
  sm: ["8", "8px", "var(--ant-border-radius)"],
  base: ["13", "13px", "var(--ant-border-radius-lg)"],
  md: ["21", "21px", "var(--ant-border-radius-lg)"],
  lg: ["34", "34px", "var(--ant-border-radius-lg)"],
  xl: ["55", "55px", "var(--ant-border-radius-outer)"],
  xxl: ["89", "89px", "var(--ant-border-radius-outer)"],
  round: ["50%"],
};

const PHI_RADIUS_CORNER_SHORT_LABELS: Record<keyof PhiBoundRadiusValue, string> = {
  borderTopLeftRadius: "TL",
  borderTopRightRadius: "TR",
  borderBottomLeftRadius: "BL",
  borderBottomRightRadius: "BR",
};

const PHI_RADIUS_CONTROL_DEFAULT_LABELS: PhiRadiusControlLabels = {
  sections: { radius: "Corner radius" },
  fields: {
    topLeft: "Top left",
    topRight: "Top right",
    bottomLeft: "Bottom left",
    bottomRight: "Bottom right",
  },
  radiusSizes: {
    none: "None",
    xxs: "XXS",
    xs: "XS",
    sm: "SM",
    base: "Base",
    md: "MD",
    lg: "LG",
    xl: "XL",
    xxl: "XXL",
    round: "Round",
  },
};

function normalizeRadiusValue(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function resolveRadiusToken(value: number | string | null | undefined): PhiRadiusOptionValue {
  const normalizedValue = normalizeRadiusValue(value);
  if (normalizedValue == null) {
    return "none";
  }

  const matchedOption = RADIUS_OPTIONS.find((option) =>
    RADIUS_COMPARE_ALIASES[option.value].includes(normalizedValue),
  );

  return matchedOption?.value ?? "base";
}

function resolveRadiusCssValue(token: PhiRadiusOptionValue) {
  return RADIUS_OPTIONS.find((option) => option.value === token)?.cssValue ?? 0;
}

function hasRadius(value: PhiBoundRadiusValue | null | undefined) {
  return [
    value?.borderTopLeftRadius,
    value?.borderTopRightRadius,
    value?.borderBottomLeftRadius,
    value?.borderBottomRightRadius,
  ].some((candidate) => {
    const normalized = normalizeRadiusValue(candidate);
    return normalized != null && normalized !== "0" && normalized !== "0px";
  });
}

function createRadiusValue(token: PhiRadiusOptionValue): PhiBoundRadiusValue {
  const cssValue = resolveRadiusCssValue(token);
  return {
    borderTopLeftRadius: cssValue,
    borderTopRightRadius: cssValue,
    borderBottomLeftRadius: cssValue,
    borderBottomRightRadius: cssValue,
  };
}

export function PhiBoundRadiusControl({
  value,
  disabled = false,
  labels = PHI_RADIUS_CONTROL_DEFAULT_LABELS,
  showLabel = true,
  onChange,
}: PhiBoundRadiusControlProps) {
  const { token } = usePhiConfig();
  const currentValue = value ?? null;
  const enabled = hasRadius(currentValue);
  const isDisabled = disabled || !onChange;
  const options = RADIUS_OPTIONS.map((option) => ({
    value: option.value,
    label: labels.radiusSizes[option.value],
  }));

  function updateCorner(key: keyof PhiBoundRadiusValue, token: PhiRadiusOptionValue) {
    onChange?.({
      borderTopLeftRadius: currentValue?.borderTopLeftRadius ?? 0,
      borderTopRightRadius: currentValue?.borderTopRightRadius ?? 0,
      borderBottomLeftRadius: currentValue?.borderBottomLeftRadius ?? 0,
      borderBottomRightRadius: currentValue?.borderBottomRightRadius ?? 0,
      [key]: resolveRadiusCssValue(token),
    });
  }

  return (
    <div style={{ display: "grid", gap: token.paddingXS, width: "100%" }}>
      <Flex align="center" justify="flex-start" gap={8}>
        {showLabel ? <Typography.Text>{labels.sections.radius}</Typography.Text> : null}
        <Switch
          checked={enabled}
          disabled={isDisabled}
          onChange={(checked) => {
            onChange?.(checked ? createRadiusValue("base") : createRadiusValue("none"));
          }}
        />
      </Flex>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: token.paddingXS,
          width: "100%",
        }}
      >
        <div style={{ display: "grid", gap: token.paddingXS, minWidth: 0, gridColumn: 1 }}>
          <Flex align="center" gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
            <Typography.Text title={labels.fields.topLeft} style={{ flex: "0 0 auto" }}>
              {PHI_RADIUS_CORNER_SHORT_LABELS.borderTopLeftRadius}
            </Typography.Text>
            <Select<PhiRadiusOptionValue>
              disabled={isDisabled || !enabled}
              value={resolveRadiusToken(currentValue?.borderTopLeftRadius)}
              options={options}
              onChange={(token) => updateCorner("borderTopLeftRadius", token)}
              style={{ width: "100%", minWidth: 0 }}
            />
          </Flex>
          <Flex align="center" gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
            <Typography.Text title={labels.fields.bottomLeft} style={{ flex: "0 0 auto" }}>
              {PHI_RADIUS_CORNER_SHORT_LABELS.borderBottomLeftRadius}
            </Typography.Text>
            <Select<PhiRadiusOptionValue>
              disabled={isDisabled || !enabled}
              value={resolveRadiusToken(currentValue?.borderBottomLeftRadius)}
              options={options}
              onChange={(token) => updateCorner("borderBottomLeftRadius", token)}
              style={{ width: "100%", minWidth: 0 }}
            />
          </Flex>
        </div>
        <div style={{ display: "grid", gap: token.paddingXS, minWidth: 0, gridColumn: 2 }}>
          <Flex align="center" gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
            <Typography.Text title={labels.fields.topRight} style={{ flex: "0 0 auto" }}>
              {PHI_RADIUS_CORNER_SHORT_LABELS.borderTopRightRadius}
            </Typography.Text>
            <Select<PhiRadiusOptionValue>
              disabled={isDisabled || !enabled}
              value={resolveRadiusToken(currentValue?.borderTopRightRadius)}
              options={options}
              onChange={(token) => updateCorner("borderTopRightRadius", token)}
              style={{ width: "100%", minWidth: 0 }}
            />
          </Flex>
          <Flex align="center" gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
            <Typography.Text title={labels.fields.bottomRight} style={{ flex: "0 0 auto" }}>
              {PHI_RADIUS_CORNER_SHORT_LABELS.borderBottomRightRadius}
            </Typography.Text>
            <Select<PhiRadiusOptionValue>
              disabled={isDisabled || !enabled}
              value={resolveRadiusToken(currentValue?.borderBottomRightRadius)}
              options={options}
              onChange={(token) => updateCorner("borderBottomRightRadius", token)}
              style={{ width: "100%", minWidth: 0 }}
            />
          </Flex>
        </div>
      </div>
    </div>
  );
}
