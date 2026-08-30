"use client";

import { useRef, useState, type ReactNode } from "react";
import { DeleteOutlined, StarOutlined, UploadOutlined } from "@ant-design/icons";
import { Flex, Typography, Upload } from "antd";

import {
  mergePhiMaskConfigDefaults,
  PHI_MASK_PRESET_OPTIONS,
  resolvePhiMaskStyle,
  type PhiMaskConfig,
  type PhiMaskPreset,
} from "../widgets/config/mask";
import { PhiIcon } from "../shell/phi-icon";
import { PhiButtonControl } from "./phi-button-control";
import { PhiIconPickerControl } from "./phi-icon-picker-control";
import { PhiMediaPickerControl, type PhiMediaPickerControlProps } from "./phi-media-picker-control";
import type { PhiPickerPlacement, PhiPickerTransactionCallbacks } from "./phi-picker-control-contract";
import { PhiPopoverControl } from "./phi-popover-control";
import { PhiSegmentedControl } from "./phi-segmented-control";
import { PhiSliderControl } from "./phi-slider-control";
import { usePhiImmediatePicker } from "./use-phi-immediate-picker";

type PhiMaskPickerMode = "preset" | "asset";

export type PhiMaskPickerControlProps = PhiPickerTransactionCallbacks<PhiMaskConfig | undefined> & {
  value?: PhiMaskConfig | null;
  open?: boolean;
  buttonAriaLabel?: string;
  buttonIcon?: ReactNode;
  placement?: PhiPickerPlacement;
  mediaPickerProps: PhiMediaPickerControlProps;
  selectedIcon?: string | null;
  uploading?: boolean;
  uploadProgress?: number;
  popupRootClassName?: string;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  onUploadFile?: (file: File) => void;
  onIconSelect?: (icon: string | null) => void;
};

function resolveInitialMode(mask: PhiMaskConfig | null | undefined): PhiMaskPickerMode {
  return mask?.source === "asset" ? "asset" : "preset";
}

function mergeMask(value: PhiMaskConfig | null | undefined, patch: PhiMaskConfig): PhiMaskConfig {
  return {
    ...mergePhiMaskConfigDefaults(value),
    ...patch,
    enabled: patch.enabled ?? true,
  };
}

function renderMaskPreview(mask: PhiMaskConfig, label: string, selected = false) {
  return (
    <Flex vertical align="center" gap={6}>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 8,
          background: "linear-gradient(135deg, var(--ant-color-primary, #1677ff), var(--ant-color-info, #13c2c2))",
          boxShadow: selected ? "0 0 0 2px var(--ant-color-primary)" : "inset 0 0 0 1px var(--ant-color-border-secondary)",
          ...resolvePhiMaskStyle(mask),
        }}
      />
      <Typography.Text style={{ fontSize: 11, textAlign: "center" }}>{label}</Typography.Text>
    </Flex>
  );
}

export function PhiMaskPickerControl({
  value,
  open,
  buttonAriaLabel = "Select mask",
  buttonIcon = <StarOutlined />,
  placement = "bottomRight",
  mediaPickerProps,
  selectedIcon,
  uploading = false,
  uploadProgress = 0,
  popupRootClassName,
  getPopupContainer,
  onUploadFile,
  onIconSelect,
  onChange,
  onCommit,
  onDiscard,
  onOpenChange,
}: PhiMaskPickerControlProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<PhiMaskPickerMode>(resolveInitialMode(value));
  const picker = usePhiImmediatePicker<PhiMaskConfig | undefined>({
    value: value ?? undefined,
    open,
    onChange,
    onCommit,
    onDiscard,
    onOpenChange,
  });
  const resolvedMask = mergePhiMaskConfigDefaults(picker.value);

  const patchMask = (patch: PhiMaskConfig) => {
    picker.changeValue(mergeMask(picker.value, patch));
  };

  const selectPreset = (preset: PhiMaskPreset) => {
    patchMask({
      source: "preset",
      preset,
      assetId: undefined,
      assetUrl: undefined,
    });
  };

  const popupContainer = (triggerNode: HTMLElement) =>
    contentRef.current ?? triggerNode.parentElement ?? document.body;

  const content = (
    <div
      ref={contentRef}
      style={{ width: 360, maxWidth: "calc(100vw - (var(--ant-padding-lg) * 2))" }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Flex vertical gap="var(--ant-padding-sm)">
        <Flex align="center" justify="space-between" gap="var(--ant-padding-sm)">
          <Typography.Text strong>Mask</Typography.Text>
          <PhiButtonControl
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            ariaLabel="Clear mask"
            onClick={() => picker.changeValue(undefined)}
          />
        </Flex>
        <PhiSegmentedControl<PhiMaskPickerMode>
          block
          value={mode}
          options={[
            { value: "preset", label: "Presets" },
            { value: "asset", label: "Media" },
          ]}
          onChange={setMode}
        />

        {mode === "preset" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "var(--ant-padding-sm)",
            }}
          >
            {PHI_MASK_PRESET_OPTIONS.map((preset) => {
              const selected = resolvedMask.source !== "asset" && resolvedMask.preset === preset.value;
              return (
                <PhiButtonControl
                  key={preset.value}
                  type={selected ? "primary" : "default"}
                  style={{ height: "auto", padding: "var(--ant-padding-xs)" }}
                  onClick={() => selectPreset(preset.value)}
                  label={renderMaskPreview({
                    ...resolvedMask,
                    enabled: true,
                    source: "preset",
                    preset: preset.value,
                  }, preset.label, selected)}
                />
              );
            })}
          </div>
        ) : null}

        {mode === "asset" ? (
          <Flex vertical gap="var(--ant-padding-xs)">
            <PhiMediaPickerControl
              {...mediaPickerProps}
              getPopupContainer={popupContainer}
              popupRootClassName={popupRootClassName}
              trigger={
                <span style={{ display: "block" }}>
                  <PhiButtonControl block label="Select mask asset" onClick={() => undefined} />
                </span>
              }
            />
            <Upload
              accept=".svg,.png,image/svg+xml,image/png"
              showUploadList={false}
              beforeUpload={(file) => {
                onUploadFile?.(file as File);
                return Upload.LIST_IGNORE;
              }}
              style={{ width: "100%" }}
            >
              <span style={{ display: "block", width: "100%" }}>
                <PhiButtonControl
                  block
                  icon={<UploadOutlined />}
                  loading={uploading}
                  label={uploading ? `Uploading ${uploadProgress}%` : "Upload SVG or PNG mask"}
                  onClick={() => undefined}
                />
              </span>
            </Upload>
            <PhiIconPickerControl
              value={selectedIcon}
              onChange={onIconSelect}
              buttonAriaLabel="Select Iconify mask"
              buttonIcon={selectedIcon ? <PhiIcon name={selectedIcon} size={16} /> : <StarOutlined />}
              buttonLabel={uploading ? `Uploading ${uploadProgress}%` : "Select Iconify icon"}
              buttonType="default"
              buttonSize="medium"
              buttonBlock
              buttonStyle={{ width: "100%" }}
              getPopupContainer={popupContainer}
              rootClassName={popupRootClassName}
            />
          </Flex>
        ) : null}

        {([
          ["Scale", Math.round((resolvedMask.scale ?? 1) * 100), 25, 200, "%", (next: number) => patchMask({ scale: next / 100 })],
          ["Offset X", resolvedMask.offsetX ?? 0, -100, 100, "%", (next: number) => patchMask({ offsetX: next })],
          ["Offset Y", resolvedMask.offsetY ?? 0, -100, 100, "%", (next: number) => patchMask({ offsetY: next })],
          ["Rotation", resolvedMask.rotationDeg ?? 0, -180, 180, "deg", (next: number) => patchMask({ rotationDeg: next })],
        ] as const).map(([label, sliderValue, min, max, suffix, change]) => (
          <Flex key={label} vertical gap={4}>
            <Flex align="center" justify="space-between">
              <Typography.Text type="secondary">{label}</Typography.Text>
              <Typography.Text type="secondary">{sliderValue}{suffix}</Typography.Text>
            </Flex>
            <PhiSliderControl
              min={min}
              max={max}
              tooltipMode="hidden"
              value={sliderValue}
              onChange={change}
            />
          </Flex>
        ))}
      </Flex>
    </div>
  );

  return (
    <PhiPopoverControl
      open={picker.open}
      content={content}
      placement={placement}
      destroyOnHidden={false}
      rootClassName={popupRootClassName}
      getPopupContainer={getPopupContainer}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setMode(resolveInitialMode(value));
        picker.handleOpenChange(nextOpen);
      }}
    >
      <span style={{ display: "inline-flex" }}>
        <PhiButtonControl
          type="text"
          size="small"
          icon={buttonIcon}
          ariaLabel={buttonAriaLabel}
          style={{ width: 24, minWidth: 24, height: 24, padding: 0 }}
          onClick={() => {
            if (picker.open) picker.closePicker("commit");
            else picker.openPicker();
          }}
        />
      </span>
    </PhiPopoverControl>
  );
}
