"use client";

import { InputNumber, Select, Space, Typography, theme } from "antd";

import { resolvePhiBorderWidgetStyle } from "../../helpers/border-widget-style";
import {
  mergePhiBorderWidgetConfig,
  type PhiCmsBorderWidgetConfig,
} from "../../types/cms-config";
import {
  PHI_BORDER_WIDGET_DEFAULT_LABELS,
  type PhiBorderWidgetLabels,
} from "../widgets/label-types/border";
import type { PhiColorPickerLabels } from "../widgets/label-types/color-picker";
import type { PhiWidgetControlMode } from "../../types/widget-ui";
import { ConfigPreviewShell } from "./config-preview-shell";
import { PhiBoundRadiusControl } from "./phi-bound-radius-control";
import { PhiColorControl } from "./phi-color-control";
import type { PhiPickerPlacement } from "./phi-picker-control-contract";

export type PhiBorderControlProps = {
  value?: PhiCmsBorderWidgetConfig | null;
  config?: PhiCmsBorderWidgetConfig | null;
  disabled?: boolean;
  mode?: PhiWidgetControlMode;
  labels?: PhiBorderWidgetLabels;
  colorPickerLabels?: PhiColorPickerLabels;
  colorPickerPlacement?: PhiPickerPlacement;
  onChange?: (value: PhiCmsBorderWidgetConfig) => void;
};

type PhiResolvedBorderWidgetConfig = Required<
  Pick<
    PhiCmsBorderWidgetConfig,
    | "borderWidth"
    | "borderStyle"
    | "borderColor"
    | "borderTopLeftRadius"
    | "borderTopRightRadius"
    | "borderBottomLeftRadius"
    | "borderBottomRightRadius"
  >
>;

const BORDER_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "double", label: "Double" },
  { value: "none", label: "None" },
] as const satisfies ReadonlyArray<{
  value: NonNullable<PhiResolvedBorderWidgetConfig["borderStyle"]>;
  label: string;
}>;

function resolveCurrentValue(
  value: PhiCmsBorderWidgetConfig | null | undefined,
  primaryColor: string,
): PhiResolvedBorderWidgetConfig {
  return {
    borderWidth: value?.borderWidth ?? 1,
    borderStyle: value?.borderStyle ?? "none",
    borderColor: resolveDisplayBorderColor(value?.borderColor ?? primaryColor, primaryColor),
    borderTopLeftRadius: value?.borderTopLeftRadius ?? 0,
    borderTopRightRadius: value?.borderTopRightRadius ?? 0,
    borderBottomLeftRadius: value?.borderBottomLeftRadius ?? 0,
    borderBottomRightRadius: value?.borderBottomRightRadius ?? 0,
  };
}

function resolveDisplayBorderColor(color: string, primaryColor: string) {
  if (color === "var(--ant-color-primary)") {
    return primaryColor;
  }

  return color;
}

export function PhiBorderControl({
  value,
  config,
  disabled = false,
  mode = "control",
  labels = PHI_BORDER_WIDGET_DEFAULT_LABELS,
  colorPickerPlacement,
  onChange,
}: PhiBorderControlProps) {
  const { token } = theme.useToken();
  const currentValue = mergePhiBorderWidgetConfig(config, value);
  const isDisabled = disabled || !onChange || mode === "preview";
  const resolvedValue = resolveCurrentValue(currentValue, token.colorPrimary);
  const displayBorderColor = resolveDisplayBorderColor(resolvedValue.borderColor, token.colorPrimary);
  const showPreview = resolvedValue.borderStyle !== "none" && resolvedValue.borderWidth > 0;

  function emit(nextValue: Partial<PhiResolvedBorderWidgetConfig>) {
    onChange?.({
      ...resolvedValue,
      ...nextValue,
    });
  }

  return (
    <div style={{ display: "grid", gap: token.paddingSM, width: "100%" }}>
      <ConfigPreviewShell expanded={showPreview}>
        <div
          aria-hidden="true"
          style={{
            minHeight: token.controlHeight * 2.2,
            background: token.colorBgContainer,
            ...resolvePhiBorderWidgetStyle(resolvedValue, {
              borderRadius: 0,
            }),
          }}
        />
      </ConfigPreviewShell>

      <div style={{ display: "grid", gap: token.paddingXS, width: "100%" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(5.5rem, auto) minmax(0, 1fr)",
            gap: token.paddingSM,
            rowGap: token.paddingXS,
            alignItems: "center",
            width: "100%",
          }}
        >
          <Typography.Text>{labels.fields.style}</Typography.Text>
          <Space.Compact style={{ width: "100%" }}>
            <InputNumber
              disabled={isDisabled}
              value={resolvedValue.borderWidth}
              min={0}
              step={0.5}
              precision={2}
              placeholder={labels.placeholders.width}
              onChange={(nextWidth) => {
                emit({
                  borderWidth: typeof nextWidth === "number" ? nextWidth : resolvedValue.borderWidth,
                });
              }}
              style={{ width: "42%" }}
            />
            <Select<PhiResolvedBorderWidgetConfig["borderStyle"]>
              disabled={isDisabled}
              value={resolvedValue.borderStyle}
              options={BORDER_STYLE_OPTIONS.map((option) => ({
                value: option.value,
                label: labels.borderStyles[option.value],
              }))}
              onChange={(borderStyle) => {
                emit({
                  borderStyle,
                });
              }}
              style={{ width: "58%" }}
            />
          </Space.Compact>

          <Typography.Text>{labels.fields.color}</Typography.Text>
          <PhiColorControl
            value={displayBorderColor}
            disabled={isDisabled}
            mode="single"
            placement={colorPickerPlacement}
            onChange={(resolvedCss) => {
              if (resolvedCss == null) return;
              emit({
                borderColor: resolvedCss,
              });
            }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: token.paddingXS, width: "100%" }}>
        <PhiBoundRadiusControl
          disabled={isDisabled}
          value={resolvedValue}
          labels={labels}
          onChange={(nextRadius) => emit(nextRadius)}
        />
      </div>
    </div>
  );
}
