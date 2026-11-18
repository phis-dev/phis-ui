"use client";

import { useRef, useState, type ReactNode } from "react";
import { Flex, Typography } from "antd";

import {
  mergePhiMaskConfigDefaults,
  mergePhiMaskConfigPatch,
  PHI_MASK_PRESET_VALUES,
  resolvePhiMaskStyle,
  type PhiMaskConfig,
  type PhiMaskPreset,
} from "../widgets/config/mask";
import {
  formatPhiMaskPickerLabel,
  PHI_MASK_PICKER_CONTROL_DEFAULT_LABELS,
  type PhiMaskPickerControlLabels,
} from "../widgets/label-types/mask-picker";
import type { PhiIconPickerControlLabels } from "../widgets/label-types/icon-picker";
import { PhiIcon } from "../shell/phi-icon";
import { PhiFileDropControl } from "./phi-file-drop-control";
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
  /** What the picker says; English where nobody passes the translated set. */
  labels?: PhiMaskPickerControlLabels;
  /** What the Iconify picker inside it says, handed on as it is. */
  iconPickerLabels?: PhiIconPickerControlLabels;
};

function resolveInitialMode(mask: PhiMaskConfig | null | undefined): PhiMaskPickerMode {
  return mask?.source === "asset" ? "asset" : "preset";
}

function renderMaskPreview(mask: PhiMaskConfig, label: string, selected = false) {
  return (
    <Flex vertical align="center" gap={6}>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 8,
          background: "linear-gradient(135deg, var(--phi-color-primary, #1677ff), var(--phi-color-info, #13c2c2))",
          boxShadow: selected ? "0 0 0 2px var(--phi-color-primary)" : "inset 0 0 0 1px var(--phi-color-border-secondary)",
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
  buttonAriaLabel,
  buttonIcon = <PhiIcon name="star" size="inherit" />,
  placement = "bottomRight",
  mediaPickerProps,
  selectedIcon,
  uploading = false,
  uploadProgress = 0,
  popupRootClassName,
  getPopupContainer,
  onUploadFile,
  onIconSelect,
  labels = PHI_MASK_PICKER_CONTROL_DEFAULT_LABELS,
  iconPickerLabels,
  onChange,
  onCommit,
  onDiscard,
  onOpenChange,
}: PhiMaskPickerControlProps) {
  const uploadingLabel = formatPhiMaskPickerLabel(labels.uploading, uploadProgress);
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
    picker.changeValue(mergePhiMaskConfigPatch(picker.value, patch));
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
      style={{ width: 360, maxWidth: "calc(100vw - (var(--phi-padding-lg) * 2))" }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Flex vertical gap="var(--phi-padding-sm)">
        <Flex align="center" justify="space-between" gap="var(--phi-padding-sm)">
          <Typography.Text strong>{labels.title}</Typography.Text>
          <PhiButtonControl
            size="small"
            type="text"
            danger
            icon={<PhiIcon name="delete" size="inherit" />}
            ariaLabel={labels.clear}
            onClick={() => picker.changeValue(undefined)}
          />
        </Flex>
        <PhiSegmentedControl<PhiMaskPickerMode>
          block
          value={mode}
          options={[
            { value: "preset", label: labels.modePresets },
            { value: "asset", label: labels.modeMedia },
          ]}
          onChange={setMode}
        />

        {mode === "preset" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "var(--phi-padding-sm)",
            }}
          >
            {PHI_MASK_PRESET_VALUES.map((preset) => {
              const selected = resolvedMask.source !== "asset" && resolvedMask.preset === preset;
              return (
                <PhiButtonControl
                  key={preset}
                  type={selected ? "primary" : "default"}
                  style={{ height: "auto", padding: "var(--phi-padding-xs)" }}
                  onClick={() => selectPreset(preset)}
                  label={renderMaskPreview({
                    ...resolvedMask,
                    enabled: true,
                    source: "preset",
                    preset,
                  }, labels.presets[preset], selected)}
                />
              );
            })}
          </div>
        ) : null}

        {mode === "asset" ? (
          <Flex vertical gap="var(--phi-padding-xs)">
            <PhiMediaPickerControl
              {...mediaPickerProps}
              getPopupContainer={popupContainer}
              popupRootClassName={popupRootClassName}
              trigger={
                <span style={{ display: "block" }}>
                  <PhiButtonControl block label={labels.selectAsset} onClick={() => undefined} />
                </span>
              }
            />
            <PhiFileDropControl
              accept=".svg,.png,image/svg+xml,image/png"
              onFile={(file) => onUploadFile?.(file)}
              disabled={uploading}
              style={{ width: "100%" }}
            >
              <span style={{ display: "block", width: "100%" }}>
                <PhiButtonControl
                  block
                  icon={<PhiIcon name="upload" size="inherit" />}
                  loading={uploading}
                  label={uploading ? uploadingLabel : labels.upload}
                  onClick={() => undefined}
                />
              </span>
            </PhiFileDropControl>
            <PhiIconPickerControl
              value={selectedIcon}
              onChange={onIconSelect}
              disabled={uploading}
              buttonAriaLabel={labels.selectIconify}
              buttonIcon={selectedIcon ? <PhiIcon name={selectedIcon} size={16} /> : <PhiIcon name="star" size="inherit" />}
              buttonLabel={uploading ? uploadingLabel : labels.iconifyButton}
              labels={iconPickerLabels}
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
          [labels.scale, Math.round((resolvedMask.scale ?? 1) * 100), 25, 200, "%", (next: number) => patchMask({ scale: next / 100 })],
          [labels.offsetX, resolvedMask.offsetX ?? 0, -100, 100, "%", (next: number) => patchMask({ offsetX: next })],
          [labels.offsetY, resolvedMask.offsetY ?? 0, -100, 100, "%", (next: number) => patchMask({ offsetY: next })],
          [labels.rotation, resolvedMask.rotationDeg ?? 0, -180, 180, "deg", (next: number) => patchMask({ rotationDeg: next })],
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
          ariaLabel={buttonAriaLabel ?? labels.button}
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
