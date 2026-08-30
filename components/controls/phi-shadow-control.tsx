"use client";

import { useState } from "react";

import { Flex, Typography } from "antd";

import { usePhiConfig } from "../root/phi-config-provider";
import type { PhiWidgetControlMode } from "../../types/widget-ui";
import { PhiTextControl } from "./phi-text-control";
import { ConfigPreviewShell } from "./config-preview-shell";
import { PhiSegmentedControl } from "./phi-segmented-control";
import { resolvePhiShadow } from "../../helpers/layout-style";
import type { PhiShadow, PhiShadowId } from "../../types/layout-style";

export type PhiShadowControlProps = {
  value?: PhiShadow | null;
  disabled?: boolean;
  mode?: PhiWidgetControlMode;
  onChange?: (value: PhiShadow) => void;
};

type PhiShadowPresetKey = PhiShadowId | "custom";

export function PhiShadowControl({
  value,
  disabled = false,
  mode = "control",
  onChange,
}: PhiShadowControlProps) {
  const { token } = usePhiConfig();
  const resolvedValue = value ?? "none";
  const derivedPreset: PhiShadowPresetKey = typeof resolvedValue === "string" ? resolvedValue : "custom";
  const isDisabled = disabled || !onChange || mode === "preview";
  const [selectedPresetState, setSelectedPresetState] = useState(() => ({
    source: derivedPreset,
    value: derivedPreset,
  }));
  const selectedPreset =
    selectedPresetState.source === derivedPreset
      ? selectedPresetState.value
      : derivedPreset;
  const [customValue, setCustomValue] = useState(typeof resolvedValue === "object" ? resolvedValue.value : "");
  const [editingCustomValue, setEditingCustomValue] = useState(false);
  const displayedCustomValue =
    editingCustomValue || derivedPreset !== "custom"
      ? customValue
      : typeof resolvedValue === "object" ? resolvedValue.value : "";
  const previewShadow = resolvePhiShadow(
    selectedPreset === "custom"
      ? { kind: "custom", value: displayedCustomValue }
      : selectedPreset,
  );

  return (
    <div style={{ display: "grid", gap: token.paddingSM, width: "100%" }}>
      <ConfigPreviewShell expanded>
        <div
          aria-hidden="true"
          style={{
            padding: token.paddingLG,
            borderRadius: token.borderRadiusLG,
            background: token.colorFillQuaternary,
          }}
        >
          <div
            style={{
              minHeight: token.controlHeight * 2.2,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusSM,
              background: token.colorBgContainer,
              boxShadow: previewShadow ?? "none",
            }}
          />
        </div>
      </ConfigPreviewShell>

      <Flex vertical gap={8} style={{ width: "100%" }}>
        <PhiSegmentedControl
          block
          disabled={isDisabled}
          value={selectedPreset}
          options={[
            { label: "None", value: "none" },
            { label: "Soft", value: "soft" },
            { label: "Strong", value: "strong" },
            { label: "Custom", value: "custom" },
          ]}
          onChange={(nextValue) => {
            const nextPreset = nextValue as PhiShadowPresetKey;
            setSelectedPresetState({
              source: derivedPreset,
              value: nextPreset,
            });

            if (nextPreset === "custom") {
              const nextCustomValue = customValue.trim();
              if (nextCustomValue.length > 0) {
                onChange?.({ kind: "custom", value: nextCustomValue });
              }
              return;
            }

            onChange?.(nextPreset);
          }}
        />

        {selectedPreset === "custom" ? (
          <div style={{ display: "grid", gap: token.paddingXS }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              CSS `box-shadow`
            </Typography.Text>
            <PhiTextControl
              value={displayedCustomValue}
              disabled={isDisabled}
              allowClear
              clearLabel="Clear shadow"
              placeholder="0 12px 32px rgba(0, 0, 0, 0.14)"
              ariaLabel="Shadow"
              onChange={(nextValue) => {
                setCustomValue(nextValue ?? "");
                const normalized = nextValue?.trim() ?? "";
                if (normalized.length > 0) {
                  onChange?.({ kind: "custom", value: normalized });
                }
              }}
              onFocus={() => {
                setCustomValue(displayedCustomValue);
                setEditingCustomValue(true);
              }}
              onBlur={() => {
                setEditingCustomValue(false);
                const normalized = customValue.trim();
                setCustomValue(normalized);
                onChange?.(normalized.length > 0 ? { kind: "custom", value: normalized } : "none");
              }}
            />
          </div>
        ) : null}
      </Flex>
    </div>
  );
}
