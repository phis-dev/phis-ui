"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BgColorsOutlined,
  FontSizeOutlined,
  FormatPainterOutlined,
  LinkOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { formatUrl } from "@lexical/link";
import { Flex, Typography } from "antd";

import type { PhiWidgetFontFamilyKey, PhiWidgetFontSizeKey } from "../../../../types/site-theme";
import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import { createPhiAssetUri, createPhiPageUri } from "../../../../types/references";
import { PhiBuilderPageReferencePicker } from "../../../../plugins/runtime-modules/builder/page-reference-picker";
import { PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS } from "../../../controls/phi-icon-picker-labels";
import { PhiButtonControl } from "../../../controls/phi-button-control";
import { PhiCheckboxControl } from "../../../controls/phi-checkbox-control";
import { PhiNumberControl } from "../../../controls/phi-number-control";
import { PhiPopoverControl } from "../../../controls/phi-popover-control";
import { PhiSelectControl } from "../../../controls/phi-select-control";
import { PhiTextControl } from "../../../controls/phi-text-control";
import { PhiWidgetIconPickerButton } from "./phi-widget-icon-picker";
import {
  PHI_HTML_WIDGET_EDITOR_EMPTY_STATE,
  resolvePhiHtmlWidgetEditorBridge,
  subscribePhiHtmlWidgetEditorBridge,
  type PhiHtmlWidgetAlignment,
  type PhiHtmlWidgetBlockType,
  type PhiHtmlWidgetEditorBridgeState,
  type PhiHtmlWidgetTextFormat,
} from "../html-editor-bridge";
import { PhiColorWidget } from "../phi-color-widget";
import {
  resolvePhiMarkdownWidgetEditorBridge,
  subscribePhiMarkdownWidgetEditorBridge,
} from "../markdown-editor-bridge";
import { usePhiWidgetScaffoldPopup } from "./phi-widget-scaffold-popup";
import { PhiInternalAssetReferencePickerButton } from "./phi-widget-image-tool-button";
import { PHI_Z_INDEX } from "../../../../theme/phi-tokens";

function stopOverlayEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function stopOverlayMouseEvent(event: { preventDefault?: () => void; stopPropagation: () => void }) {
  event.stopPropagation();
}

function preserveEditorSelectionMouseEvent(event: { preventDefault?: () => void; stopPropagation: () => void }) {
  event.preventDefault?.();
  event.stopPropagation();
}

const PHI_WIDGET_OVERLAY_Z_INDEX = PHI_Z_INDEX.authoringPopup;
const PHI_HTML_WIDGET_TOOL_POPUP_Z_INDEX = PHI_Z_INDEX.authoringPopupNested;

function resolveExternalOrFragmentLink(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.startsWith("#")) return normalized;
  if (/^(?:\/|\.\/|\.\.\/|phi:)/iu.test(normalized)) return null;
  const formatted = formatUrl(normalized);
  try {
    const url = new URL(formatted);
    return ["http:", "https:", "mailto:", "sms:", "tel:"].includes(url.protocol)
      ? formatted
      : null;
  } catch {
    return null;
  }
}

export type PhiWidgetIconToolButtonProps = {
  value?: string | null;
  ariaLabel?: string;
  onChange: (value: string | null) => void;
};

export function PhiWidgetIconToolButton({
  value,
  ariaLabel = "Widget icon",
  onChange,
}: PhiWidgetIconToolButtonProps) {
  return (
    <PhiWidgetIconPickerButton
      value={value ?? null}
      buttonAriaLabel={ariaLabel}
      labels={PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS}
      onChange={onChange}
    />
  );
}

export type PhiWidgetColorToolButtonProps = {
  value?: string | null;
  ariaLabel?: string;
  onChange: (color: string | null) => void;
};

export function PhiWidgetColorToolButton({
  value,
  ariaLabel = "Widget color",
  onChange,
}: PhiWidgetColorToolButtonProps) {
  const currentColor = typeof value === "string" && value.trim().length > 0 ? value : undefined;
  const popup = usePhiWidgetScaffoldPopup();

  return (
    <PhiColorWidget
      value={currentColor}
      defaultValue={currentColor ?? "#1677ff"}
      signalsEnabled={false}
      allowClear
      getPopupContainer={popup.getPopupContainer}
      popupClassName={popup.rootClassName}
      onOpenChange={popup.setOpen}
      renderPanel={(panel) => (
        <div
          onClick={stopOverlayEvent}
          onMouseDown={preserveEditorSelectionMouseEvent}
          onPointerDown={stopOverlayEvent}
          onKeyDown={stopOverlayEvent}
        >
          {panel}
        </div>
      )}
      onChange={(css) => {
        onChange(css);
      }}
      onClear={() => {
        onChange(null);
      }}
    >
      <span
        onMouseDown={preserveEditorSelectionMouseEvent}
        onClick={stopOverlayEvent}
        onPointerDown={stopOverlayEvent}
        style={{ display: "inline-flex" }}
      >
        <PhiButtonControl
          type="text"
          size="small"
          ariaLabel={ariaLabel}
          icon={<BgColorsOutlined style={currentColor ? { color: currentColor } : undefined} />}
          onClick={() => undefined}
        />
      </span>
    </PhiColorWidget>
  );
}

const PHI_FONT_FAMILY_OPTIONS: Array<{ value: PhiWidgetFontFamilyKey; label: string }> = [
  { value: "inherit", label: "Inherit" },
  { value: "system", label: "System" },
  { value: "body", label: "Body" },
  { value: "mono", label: "Mono" },
  { value: "serif", label: "Serif" },
  { value: "accent", label: "Accent" },
  { value: "display", label: "Display" },
];

const PHI_FONT_SIZE_OPTIONS: Array<{ value: PhiWidgetFontSizeKey; label: string }> = [
  { value: "inherit", label: "Inherit" },
  { value: "xs", label: "XS" },
  { value: "sm", label: "SM" },
  { value: "base", label: "Base" },
  { value: "lg", label: "LG" },
  { value: "xl", label: "XL" },
];

export type PhiWidgetTypographyToolButtonProps = {
  fontFamily?: PhiWidgetFontFamilyKey | null;
  fontSize?: PhiWidgetFontSizeKey | null;
  defaultFontSize?: PhiWidgetFontSizeKey;
  ariaLabel?: string;
  onChange: (patch: {
    fontFamily?: PhiWidgetFontFamilyKey | null;
    fontSize?: PhiWidgetFontSizeKey | null;
  }) => void;
};

export function PhiWidgetTypographyToolButton({
  fontFamily,
  fontSize,
  defaultFontSize = "inherit",
  ariaLabel = "Widget typography",
  onChange,
}: PhiWidgetTypographyToolButtonProps) {
  const currentFontFamily = fontFamily ?? "inherit";
  const currentFontSize = fontSize ?? defaultFontSize;
  const popup = usePhiWidgetScaffoldPopup();

  return (
    <PhiPopoverControl
      trigger="click"
      placement="bottomRight"
      getPopupContainer={popup.getPopupContainer}
      rootClassName={popup.rootClassName}
      onOpenChange={popup.setOpen}
      zIndex={PHI_Z_INDEX.authoringPopup}
      content={
        <Flex
          vertical
          gap={8}
          style={{ minWidth: 220 }}
          onClick={stopOverlayEvent}
          onMouseDown={stopOverlayMouseEvent}
          onPointerDown={stopOverlayEvent}
        >
          <label>
            <Typography.Text style={{ display: "block", marginBottom: 4 }}>
              Font
            </Typography.Text>
            <PhiSelectControl<PhiWidgetFontFamilyKey>
              value={currentFontFamily}
              options={PHI_FONT_FAMILY_OPTIONS}
              getPopupContainer={popup.getPopupContainer}
              popupRootClassName={popup.rootClassName}
              popupZIndex={PHI_Z_INDEX.authoringPopupNested}
              onChange={(nextValue) => {
                onChange({
                  fontFamily: nextValue,
                });
              }}
              style={{ width: "100%" }}
            />
          </label>
          <label>
            <Typography.Text style={{ display: "block", marginBottom: 4 }}>
              Size
            </Typography.Text>
            <PhiSelectControl<PhiWidgetFontSizeKey>
              value={currentFontSize}
              options={PHI_FONT_SIZE_OPTIONS}
              getPopupContainer={popup.getPopupContainer}
              popupRootClassName={popup.rootClassName}
              popupZIndex={PHI_Z_INDEX.authoringPopupNested}
              onChange={(nextValue) => {
                onChange({
                  fontSize: nextValue,
                });
              }}
              style={{ width: "100%" }}
            />
          </label>
        </Flex>
      }
    >
      <span
        onMouseDown={stopOverlayMouseEvent}
        onClick={stopOverlayEvent}
        onPointerDown={stopOverlayEvent}
        style={{ display: "inline-flex" }}
      >
        <PhiButtonControl
          type="text"
          size="small"
          ariaLabel={ariaLabel}
          icon={<FontSizeOutlined />}
          onClick={() => undefined}
        />
      </span>
    </PhiPopoverControl>
  );
}

const PHI_HTML_WIDGET_BLOCK_OPTIONS: Array<{ value: PhiHtmlWidgetBlockType; label: string }> = [
  { value: "paragraph", label: "P" },
  { value: "h1", label: "H1" },
  { value: "h2", label: "H2" },
  { value: "h3", label: "H3" },
  { value: "bullet", label: "UL" },
  { value: "number", label: "OL" },
];

const PHI_HTML_WIDGET_ALIGNMENT_OPTIONS: Array<{
  value: PhiHtmlWidgetAlignment;
  label: string;
  icon: ReactNode;
}> = [
  { value: "left", label: "Align left", icon: <AlignLeftOutlined /> },
  { value: "center", label: "Align center", icon: <AlignCenterOutlined /> },
  { value: "right", label: "Align right", icon: <AlignRightOutlined /> },
  { value: "justify", label: "Justify", icon: <MenuOutlined /> },
];

function resolvePhiHtmlWidgetAlignmentIcon(alignment: PhiHtmlWidgetAlignment | null | undefined) {
  return PHI_HTML_WIDGET_ALIGNMENT_OPTIONS.find((option) => option.value === alignment)?.icon ?? <AlignLeftOutlined />;
}

const PHI_HTML_WIDGET_STYLE_TOGGLES: Array<{
  key: "bold" | "italic" | "underline" | "strike" | "code";
  format: PhiHtmlWidgetTextFormat;
  label: string;
}> = [
  { key: "bold", format: "bold", label: "Bold" },
  { key: "italic", format: "italic", label: "Italic" },
  { key: "underline", format: "underline", label: "Underline" },
  { key: "strike", format: "strikethrough", label: "Strike" },
  { key: "code", format: "code", label: "Code" },
];

function usePhiHtmlWidgetEditorState(blockId: PhiCmsInstanceId) {
  const [state, setState] = useState<PhiHtmlWidgetEditorBridgeState | null>(
    () => resolvePhiHtmlWidgetEditorBridge(blockId)?.getState() ?? null,
  );

  useEffect(() => {
    return subscribePhiHtmlWidgetEditorBridge(blockId, setState);
  }, [blockId]);

  return {
    bridge: resolvePhiHtmlWidgetEditorBridge(blockId),
    state,
  };
}

export type PhiHtmlWidgetToolbarToolsProps = {
  blockId: PhiCmsInstanceId;
};

export function PhiHtmlWidgetToolbarTools({
  blockId,
}: PhiHtmlWidgetToolbarToolsProps) {
  const { bridge, state } = usePhiHtmlWidgetEditorState(blockId);
  const blockPopup = usePhiWidgetScaffoldPopup();
  const alignmentPopup = usePhiWidgetScaffoldPopup();
  const stylePopup = usePhiWidgetScaffoldPopup();
  const linkPopup = usePhiWidgetScaffoldPopup();
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const hasActiveTextStyle = Boolean(
    state?.bold || state?.italic || state?.underline || state?.strike || state?.code,
  );
  const handleLinkPopoverOpenChange = (open: boolean) => {
    setLinkPopoverOpen(open);
    linkPopup.setOpen(open);
    if (open) {
      setLinkDraft(state?.linkUrl ?? "");
    }
  };

  return (
    <>
      <span
        onClick={stopOverlayEvent}
        onMouseDown={stopOverlayMouseEvent}
        onPointerDown={stopOverlayEvent}
        style={{ display: "inline-flex", minWidth: 84 }}
      >
        <PhiSelectControl<PhiHtmlWidgetBlockType>
          size="small"
          value={state?.blockType ?? PHI_HTML_WIDGET_EDITOR_EMPTY_STATE.blockType}
          options={PHI_HTML_WIDGET_BLOCK_OPTIONS}
          disabled={!bridge}
          popupMatchSelectWidth={false}
          getPopupContainer={blockPopup.getPopupContainer}
          popupRootClassName={blockPopup.rootClassName}
          popupZIndex={PHI_HTML_WIDGET_TOOL_POPUP_Z_INDEX}
          onOpenChange={blockPopup.setOpen}
          onChange={(value) => {
            bridge?.setBlockType(value);
          }}
          style={{ minWidth: 84 }}
        />
      </span>
      <PhiPopoverControl
        trigger="click"
        placement="bottomRight"
        getPopupContainer={alignmentPopup.getPopupContainer}
        rootClassName={alignmentPopup.rootClassName}
        onOpenChange={alignmentPopup.setOpen}
        zIndex={PHI_WIDGET_OVERLAY_Z_INDEX}
        content={
          <Flex
            gap={4}
            onClick={stopOverlayEvent}
            onMouseDown={preserveEditorSelectionMouseEvent}
            onPointerDown={stopOverlayEvent}
          >
            {PHI_HTML_WIDGET_ALIGNMENT_OPTIONS.map((option) => (
              <PhiButtonControl
                key={option.value}
                type={(state?.alignment ?? PHI_HTML_WIDGET_EDITOR_EMPTY_STATE.alignment) === option.value ? "primary" : "text"}
                size="small"
                ariaLabel={option.label}
                tooltip={option.label}
                icon={option.icon}
                disabled={!bridge}
                onClick={() => {
                  bridge?.setAlignment(option.value);
                  bridge?.focus();
                }}
              />
            ))}
          </Flex>
        }
      >
        <span
          onMouseDown={preserveEditorSelectionMouseEvent}
          onClick={stopOverlayEvent}
          onPointerDown={stopOverlayEvent}
          style={{ display: "inline-flex" }}
        >
          <PhiButtonControl
            type="text"
            size="small"
            ariaLabel="Text alignment"
            tooltip="Text alignment"
            icon={resolvePhiHtmlWidgetAlignmentIcon(state?.alignment ?? PHI_HTML_WIDGET_EDITOR_EMPTY_STATE.alignment)}
            disabled={!bridge}
            onClick={() => undefined}
          />
        </span>
      </PhiPopoverControl>
      <PhiPopoverControl
        trigger="click"
        placement="bottomRight"
        getPopupContainer={stylePopup.getPopupContainer}
        rootClassName={stylePopup.rootClassName}
        onOpenChange={stylePopup.setOpen}
        zIndex={PHI_Z_INDEX.authoringPopup}
        content={
          <Flex
            vertical
            gap={8}
            onClick={stopOverlayEvent}
            onMouseDown={preserveEditorSelectionMouseEvent}
            onPointerDown={stopOverlayEvent}
          >
            {PHI_HTML_WIDGET_STYLE_TOGGLES.map((toggle) => (
              <div key={toggle.key} onMouseDown={preserveEditorSelectionMouseEvent}>
                <PhiCheckboxControl
                  checked={toggle.key === "bold"
                    ? state?.bold
                    : toggle.key === "italic"
                      ? state?.italic
                      : toggle.key === "underline"
                        ? state?.underline
                        : toggle.key === "strike"
                          ? state?.strike
                          : state?.code}
                  disabled={!bridge}
                  label={toggle.label}
                  onChange={() => {
                    bridge?.toggleFormat(toggle.format);
                    bridge?.focus();
                  }}
                />
              </div>
            ))}
          </Flex>
        }
      >
        <span
          onMouseDown={preserveEditorSelectionMouseEvent}
          onClick={stopOverlayEvent}
          onPointerDown={stopOverlayEvent}
          style={{ display: "inline-flex" }}
        >
          <PhiButtonControl
            type={hasActiveTextStyle ? "primary" : "text"}
            size="small"
            ariaLabel="Rich text styles"
            icon={<FormatPainterOutlined />}
            disabled={!bridge}
            onClick={() => undefined}
          />
        </span>
      </PhiPopoverControl>
      {/*
        * Colour sits next to the style tools it belongs with, and both it and the image picker follow the
        * block-type Select rather than preceding it: the toolbar reads left to right as "what this block
        * is", then "how its text looks", then "what to put into it".
        */}
      <PhiWidgetColorToolButton
        value={state?.textColor ?? null}
        ariaLabel="Rich text color"
        onChange={(color) => {
          bridge?.setTextColor(color);
          bridge?.focus();
        }}
      />
      <PhiInternalAssetReferencePickerButton
        blockId={blockId}
        ariaLabel="Insert Site Asset"
        onSelect={(asset) => {
          bridge?.insertImage(
            createPhiAssetUri(asset.id),
            asset.altText?.trim() || asset.title?.trim() || asset.originalName,
          );
          bridge?.focus();
        }}
      />
      <PhiPopoverControl
        open={linkPopoverOpen}
        trigger="click"
        placement="bottomRight"
        onOpenChange={handleLinkPopoverOpenChange}
        getPopupContainer={linkPopup.getPopupContainer}
        rootClassName={linkPopup.rootClassName}
        zIndex={PHI_WIDGET_OVERLAY_Z_INDEX}
        content={
          <Flex
            vertical
            gap={8}
            onClick={stopOverlayEvent}
            onMouseDown={stopOverlayMouseEvent}
            onPointerDown={stopOverlayEvent}
          >
            <PhiBuilderPageReferencePicker
              onSelect={(selection) => {
                bridge?.setLink(createPhiPageUri(selection.reference));
                bridge?.focus();
                handleLinkPopoverOpenChange(false);
              }}
            />
            <PhiTextControl
              size="small"
              value={linkDraft}
              placeholder="https://example.com"
              onChange={(nextValue) => setLinkDraft(nextValue ?? "")}
              onKeyDown={stopOverlayEvent}
            />
            <Flex gap={8} justify="space-between">
              <PhiButtonControl
                size="small"
                disabled={!bridge || !state?.linkUrl}
                label="Remove"
                onClick={() => {
                  bridge?.setLink(null);
                  bridge?.focus();
                  handleLinkPopoverOpenChange(false);
                }}
              />
              <PhiButtonControl
                size="small"
                type="primary"
                disabled={!bridge}
                label="Apply"
                onClick={() => {
                  const nextUrl = resolveExternalOrFragmentLink(linkDraft);
                  if (!nextUrl) {
                    return;
                  }

                  bridge?.setLink(nextUrl);
                  bridge?.focus();
                  handleLinkPopoverOpenChange(false);
                }}
              />
            </Flex>
          </Flex>
        }
      >
        <span
          onMouseDown={stopOverlayMouseEvent}
          onClick={stopOverlayEvent}
          onPointerDown={stopOverlayEvent}
          style={{ display: "inline-flex" }}
        >
          <PhiButtonControl
            type={state?.linkUrl ? "primary" : "text"}
            size="small"
            ariaLabel="Rich text link"
            icon={<LinkOutlined />}
            disabled={!bridge}
            onClick={() => undefined}
          />
        </span>
      </PhiPopoverControl>
    </>
  );
}

export function PhiMarkdownWidgetToolbarTools({
  blockId,
}: {
  blockId: PhiCmsInstanceId;
}) {
  const [, setRegistryVersion] = useState(0);

  useEffect(() => subscribePhiMarkdownWidgetEditorBridge(
    blockId,
    () => setRegistryVersion((current) => current + 1),
  ), [blockId]);

  const bridge = resolvePhiMarkdownWidgetEditorBridge(blockId);
  return (
    <>
      <PhiBuilderPageReferencePicker
        onSelect={(selection) => {
          const label = selection.title.replaceAll("]", "\\]");
          bridge?.insert(`[${label}](${createPhiPageUri(selection.reference)})`);
        }}
      />
      <PhiInternalAssetReferencePickerButton
        blockId={blockId}
        ariaLabel="Insert Site Asset"
        onSelect={(asset) => {
          const alt = (asset.altText?.trim() || asset.title?.trim() || asset.originalName)
            .replaceAll("]", "\\]");
          bridge?.insert(`![${alt}](${createPhiAssetUri(asset.id)})`);
        }}
      />
    </>
  );
}

export type PhiDescriptionWidgetItemsToolButtonProps = {
  value?: string[] | null;
  onChange: (value: string[]) => void;
};

export function PhiDescriptionWidgetItemsToolButton({
  value,
  onChange,
}: PhiDescriptionWidgetItemsToolButtonProps) {
  const itemCount = Array.isArray(value) ? value.length : 0;
  const popup = usePhiWidgetScaffoldPopup();

  return (
    <PhiPopoverControl
      trigger="click"
      placement="bottomRight"
      getPopupContainer={popup.getPopupContainer}
      rootClassName={popup.rootClassName}
      onOpenChange={popup.setOpen}
      zIndex={PHI_Z_INDEX.authoringPopup}
      content={
        <Flex
          vertical
          gap={8}
          onClick={stopOverlayEvent}
          onMouseDown={stopOverlayMouseEvent}
          onPointerDown={stopOverlayEvent}
        >
          <Typography.Text type="secondary">Items</Typography.Text>
          <PhiNumberControl
            min={0}
            max={12}
            precision={0}
            value={itemCount}
            onChange={(nextValue) => {
              const nextCount = Math.max(0, Math.min(12, Math.trunc(nextValue ?? 0)));
              const nextItems = Array.from({ length: nextCount }, (_, index) => value?.[index] ?? "");
              onChange(nextItems);
            }}
            onKeyDown={stopOverlayEvent}
          />
        </Flex>
      }
    >
      <span
        onMouseDown={stopOverlayMouseEvent}
        onClick={stopOverlayEvent}
        onPointerDown={stopOverlayEvent}
        style={{ display: "inline-flex" }}
      >
        <PhiButtonControl
          type="text"
          size="small"
          ariaLabel="Description items"
          tooltip="Description items"
          label={itemCount}
          onClick={() => undefined}
        />
      </span>
    </PhiPopoverControl>
  );
}
