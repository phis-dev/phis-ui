"use client";

import { useMemo, useState, type ReactNode } from "react";

import { ColorPicker, Flex, Tooltip, theme } from "antd";
import type { ColorPickerProps } from "antd/es/color-picker";
import type { ColorValueType, LineGradientType } from "antd/es/color-picker/interface";

import type { PhiControlSize } from "../../types/control";
import type {
  PhiPickerPlacement,
  PhiPickerTransactionCallbacks,
} from "./phi-picker-control-contract";
import { PhiSelectControl } from "./phi-select-control";
import { usePhiImmediatePicker } from "./use-phi-immediate-picker";

export type PhiColorPickerMode = "single" | "gradient" | "both";

export type PhiColorPickerPreset = {
  key: string;
  label: string;
  colors: readonly string[];
  colorLabels?: readonly string[];
  defaultOpen?: boolean;
};

export type PhiColorPickerPresets = readonly PhiColorPickerPreset[];

export type PhiColorControlProps = PhiPickerTransactionCallbacks<string | null> & {
  value?: string | null;
  defaultValue?: string;
  disabled?: boolean;
  allowClear?: boolean;
  mode?: PhiColorPickerMode;
  open?: boolean;
  showText?: boolean;
  trigger?: "click" | "hover";
  placement?: PhiPickerPlacement;
  size?: PhiControlSize;
  children?: ReactNode;
  presets?: PhiColorPickerPresets;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  popupClassName?: string;
  renderPanel?: (panel: ReactNode) => ReactNode;
  onClear?: () => void;
};

const PHI_COLOR_PICKER_CONTENT_WIDTH = 234;

function splitLinearGradientStops(input: string) {
  const stops: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of input) {
    if (char === "(") depth += 1;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      const next = current.trim();
      if (next) stops.push(next);
      current = "";
      continue;
    }
    current += char;
  }

  const trailing = current.trim();
  if (trailing) stops.push(trailing);
  return stops;
}

function parseLinearGradientValue(value: string): LineGradientType | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("linear-gradient(") || !trimmed.endsWith(")")) {
    return null;
  }

  const parts = splitLinearGradientStops(trimmed.slice("linear-gradient(".length, -1));
  const hasDirection = /^(?:to\s+(?:left|right|top|bottom)(?:\s+(?:left|right|top|bottom))?|[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:deg|grad|rad|turn))$/i.test(parts[0] ?? "");
  const stopParts = hasDirection ? parts.slice(1) : parts;
  if (stopParts.length < 2) return null;

  const parsedStops = stopParts.map((part) => {
    const match = part.match(/^(.+?)(?:\s+(-?(?:\d+(?:\.\d+)?|\.\d+))%)?$/);
    if (!match) return null;
    const color = match[1]?.trim();
    const percent = match[2] == null ? null : Number.parseFloat(match[2]);
    if (!color || (percent != null && !Number.isFinite(percent))) return null;
    return { color, percent };
  });
  if (parsedStops.some((entry) => entry == null)) return null;

  const colorStops = parsedStops as Array<{ color: string; percent: number | null }>;
  if (colorStops[0]?.percent == null) colorStops[0]!.percent = 0;
  if (colorStops[colorStops.length - 1]?.percent == null) {
    colorStops[colorStops.length - 1]!.percent = 100;
  }

  let previousPosition = 0;
  while (previousPosition < colorStops.length - 1) {
    let nextPosition = previousPosition + 1;
    while (nextPosition < colorStops.length && colorStops[nextPosition]?.percent == null) {
      nextPosition += 1;
    }
    const startPercent = colorStops[previousPosition]?.percent;
    const endPercent = colorStops[nextPosition]?.percent;
    if (startPercent == null || endPercent == null) return null;
    const intervalCount = nextPosition - previousPosition;
    for (let index = previousPosition + 1; index < nextPosition; index += 1) {
      colorStops[index]!.percent = startPercent + ((endPercent - startPercent) * (index - previousPosition)) / intervalCount;
    }
    previousPosition = nextPosition;
  }

  return colorStops as LineGradientType;
}

function resolveAntdColorValue(value: string | null, fallback: string): ColorValueType {
  const resolved = value?.trim() || fallback;
  return parseLinearGradientValue(resolved) ?? resolved;
}

function resolveCssValue(nextValue: ColorValueType, fallbackCss: string) {
  if (nextValue == null) return fallbackCss;
  if (typeof nextValue === "string") return nextValue.trim() || fallbackCss;
  if (!Array.isArray(nextValue) && "toCssString" in nextValue && typeof nextValue.toCssString === "function") {
    return nextValue.toCssString();
  }
  return fallbackCss;
}

function resolveAntdMode(mode: PhiColorPickerMode): ColorPickerProps["mode"] {
  return mode === "both" ? ["single", "gradient"] : mode;
}

export function PhiColorControl({
  value = null,
  defaultValue = "#f0f0f0",
  disabled,
  allowClear,
  mode = "single",
  open,
  showText = false,
  trigger,
  placement = "auto",
  size,
  children,
  presets = [],
  getPopupContainer,
  popupClassName,
  renderPanel,
  onChange,
  onCommit,
  onDiscard,
  onOpenChange,
  onClear,
}: PhiColorControlProps) {
  const { token } = theme.useToken();
  const picker = usePhiImmediatePicker({
    value,
    open,
    disabled,
    onChange,
    onCommit,
    onDiscard,
    onOpenChange,
  });
  const paletteOptions = useMemo(() => presets.map((preset) => ({
    value: preset.key,
    label: preset.label,
  })), [presets]);
  const [paletteKey, setPaletteKey] = useState(() => paletteOptions[0]?.value ?? "");
  const selectedPalette = presets.find((preset) => preset.key === paletteKey) ?? presets[0];
  const selectedPaletteKey = selectedPalette?.key;
  const selectedPaletteLabel = selectedPalette?.label ?? selectedPaletteKey;
  const selectedCssValue = picker.value ?? defaultValue;
  const antdPresets: NonNullable<ColorPickerProps["presets"]> = presets.map((preset) => ({
    key: preset.key,
    label: preset.label,
    colors: [...preset.colors],
    defaultOpen: preset.defaultOpen,
  }));

  return (
    <ColorPicker
      mode={resolveAntdMode(mode)}
      value={resolveAntdColorValue(picker.value, defaultValue)}
      open={picker.open}
      disabled={disabled}
      allowClear={allowClear}
      trigger={trigger}
      placement={placement === "auto" ? undefined : placement}
      size={size}
      showText={showText}
      presets={antdPresets}
      getPopupContainer={getPopupContainer}
      classNames={{ popup: { root: ["phi-color-widget-popup", popupClassName].filter(Boolean).join(" ") } }}
      styles={{
        root: {
          display: "inline-flex",
          alignItems: "center",
          lineHeight: 1,
          maxWidth: "100%",
        },
        popupOverlayInner: {
          padding: 12,
        },
      }}
      panelRender={(_, extra) => {
        const { Picker } = extra.components;
        const content = (
          <Flex
            className="phi-color-widget-panel"
            vertical
            gap={token.paddingXS}
            style={{ width: PHI_COLOR_PICKER_CONTENT_WIDTH }}
          >
            <div style={{ width: "100%" }}>
              <Picker />
            </div>
            {selectedPalette && selectedPaletteKey ? (
              <Flex vertical gap={token.paddingXS}>
                <PhiSelectControl
                  value={selectedPaletteKey}
                  options={paletteOptions}
                  size="small"
                  popupMatchSelectWidth={PHI_COLOR_PICKER_CONTENT_WIDTH}
                  getPopupContainer={(triggerNode) => triggerNode.parentElement ?? triggerNode}
                  onChange={setPaletteKey}
                  style={{ width: "100%" }}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, 22px)",
                    justifyContent: "space-between",
                    rowGap: token.paddingXXS,
                  }}
                >
                  {selectedPalette.colors.map((presetColor, index) => {
                    const selected = presetColor === selectedCssValue;
                    const swatchLabel = selectedPalette.colorLabels?.[index]
                      ?? `${selectedPaletteLabel} ${index + 1}`;
                    return (
                      <Tooltip key={`${index}-${presetColor}`} title={swatchLabel}>
                        <span style={{ display: "inline-flex" }}>
                          <button
                            type="button"
                            aria-label={`${swatchLabel}: ${presetColor}`}
                            aria-pressed={selected}
                            title={`${swatchLabel}: ${presetColor}`}
                            disabled={disabled}
                            onClick={() => picker.changeValue(presetColor)}
                            style={{
                              width: 22,
                              height: 22,
                              padding: 0,
                              border: `1px solid ${selected ? token.colorPrimary : token.colorBorder}`,
                              borderRadius: token.borderRadiusSM,
                              background: presetColor,
                              boxShadow: selected ? `0 0 0 2px ${token.colorPrimaryBorder}` : undefined,
                              cursor: disabled ? "not-allowed" : "pointer",
                            }}
                          />
                        </span>
                      </Tooltip>
                    );
                  })}
                </div>
              </Flex>
            ) : null}
          </Flex>
        );
        return renderPanel?.(content) ?? content;
      }}
      onChange={(nextValue, css) => {
        const nextCss = resolveCssValue(nextValue, css).trim();
        if (nextCss) picker.changeValue(nextCss);
      }}
      onOpenChange={picker.handleOpenChange}
      onClear={() => {
        picker.changeValue(null);
        onClear?.();
      }}
    >
      {children}
    </ColorPicker>
  );
}
