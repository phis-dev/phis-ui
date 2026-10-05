"use client";

import { stopPhiOverlayEvent } from "../../../../helpers/overlay-events";
import { useEffect, useState, type ReactNode } from "react";

import { formatUrl } from "@lexical/link";

import type { PhiWidgetFontFamilyKey, PhiWidgetFontSizeKey } from "../../../../types/site-theme";
import { PHI_WIDGET_FONT_FAMILY_OPTIONS } from "../../helpers/font-family";
import { PHI_WIDGET_FONT_SIZE_OPTIONS } from "../../helpers/font-size";
import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import { createPhiAssetUri, createPhiPageUri } from "../../../../types/references";
import { PhiPageReferencePicker } from "./phi-page-reference-picker";
import { usePhiAuthoringToolsLabels } from "./phi-authoring-tools-labels";
import { resizePhiDescriptionItems } from "./description-items";
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
import { PhiColorFieldControl } from "../../../controls/phi-color-field-control";
import {
  resolvePhiMarkdownWidgetEditorBridge,
  subscribePhiMarkdownWidgetEditorBridge,
} from "../markdown-editor-bridge";
import { usePhiWidgetScaffoldPopup } from "./phi-widget-scaffold-popup";
import { PhiInternalAssetReferencePickerButton } from "./phi-widget-image-tool-button";
import { PHI_Z_INDEX } from "../../../../theme/phi-tokens";
import { PhiFlexControl } from "../../../controls/phi-flex-control";
import { PhiTypographyControl } from "../../../controls/phi-typography-control";
import { PhiIcon } from "../../../shell/phi-icon";

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
  if (/^(?:\/|\.\/|\.\.\/|phis:)/iu.test(normalized)) return null;
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
  ariaLabel,
  onChange,
}: PhiWidgetIconToolButtonProps) {
  const labels = usePhiAuthoringToolsLabels();
  return (
    <PhiWidgetIconPickerButton
      value={value ?? null}
      buttonAriaLabel={ariaLabel ?? labels.iconPicker.buttonAriaLabel}
      labels={labels.iconPicker}
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
  ariaLabel,
  onChange,
}: PhiWidgetColorToolButtonProps) {
  const labels = usePhiAuthoringToolsLabels();
  const currentColor = typeof value === "string" && value.trim().length > 0 ? value : undefined;
  const popup = usePhiWidgetScaffoldPopup();

  return (
    <PhiColorFieldControl
      value={currentColor}
      defaultValue={currentColor ?? "#1677ff"}
      allowClear
      getPopupContainer={popup.getPopupContainer}
      popupClassName={popup.rootClassName}
      onOpenChange={popup.setOpen}
      renderPanel={(panel) => (
        <div
          onClick={stopPhiOverlayEvent}
          onMouseDown={preserveEditorSelectionMouseEvent}
          onPointerDown={stopPhiOverlayEvent}
          onKeyDown={stopPhiOverlayEvent}
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
        onClick={stopPhiOverlayEvent}
        onPointerDown={stopPhiOverlayEvent}
        style={{ display: "inline-flex" }}
      >
        <PhiButtonControl
          type="text"
          size="small"
          ariaLabel={ariaLabel ?? labels.fallbacks.widgetColor}
          icon={<PhiIcon name="bg-colors" size="inherit" style={currentColor ? { color: currentColor } : undefined} />}
          onClick={() => undefined}
        />
      </span>
    </PhiColorFieldControl>
  );
}

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
  ariaLabel,
  onChange,
}: PhiWidgetTypographyToolButtonProps) {
  const labels = usePhiAuthoringToolsLabels();
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
        <PhiFlexControl
          vertical
          gap={8}
          style={{ minWidth: 220 }}
          onClick={stopPhiOverlayEvent}
          onMouseDown={stopPhiOverlayEvent}
          onPointerDown={stopPhiOverlayEvent}
        >
          <label>
            <PhiTypographyControl style={{ display: "block", marginBottom: 4 }}>
              Font
            </PhiTypographyControl>
            <PhiSelectControl<PhiWidgetFontFamilyKey>
              value={currentFontFamily}
              options={PHI_WIDGET_FONT_FAMILY_OPTIONS}
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
            <PhiTypographyControl style={{ display: "block", marginBottom: 4 }}>
              Size
            </PhiTypographyControl>
            <PhiSelectControl<PhiWidgetFontSizeKey>
              value={currentFontSize}
              options={PHI_WIDGET_FONT_SIZE_OPTIONS}
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
        </PhiFlexControl>
      }
    >
      <span
        onMouseDown={stopPhiOverlayEvent}
        onClick={stopPhiOverlayEvent}
        onPointerDown={stopPhiOverlayEvent}
        style={{ display: "inline-flex" }}
      >
        <PhiButtonControl
          type="text"
          size="small"
          ariaLabel={ariaLabel ?? labels.fallbacks.widgetTypography}
          icon={<PhiIcon name="font-size" size="inherit" />}
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
  { value: "left", label: "Align left", icon: <PhiIcon name="align-left" size="inherit" /> },
  { value: "center", label: "Align center", icon: <PhiIcon name="align-center" size="inherit" /> },
  { value: "right", label: "Align right", icon: <PhiIcon name="align-right" size="inherit" /> },
  { value: "justify", label: "Justify", icon: <PhiIcon name="menu" size="inherit" /> },
];

function resolvePhiHtmlWidgetAlignmentIcon(alignment: PhiHtmlWidgetAlignment | null | undefined) {
  return PHI_HTML_WIDGET_ALIGNMENT_OPTIONS.find((option) => option.value === alignment)?.icon ?? <PhiIcon name="align-left" size="inherit" />;
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
  const labels = usePhiAuthoringToolsLabels();
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
        onClick={stopPhiOverlayEvent}
        onMouseDown={stopPhiOverlayEvent}
        onPointerDown={stopPhiOverlayEvent}
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
          <PhiFlexControl
            gap={4}
            onClick={stopPhiOverlayEvent}
            onMouseDown={preserveEditorSelectionMouseEvent}
            onPointerDown={stopPhiOverlayEvent}
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
          </PhiFlexControl>
        }
      >
        <span
          onMouseDown={preserveEditorSelectionMouseEvent}
          onClick={stopPhiOverlayEvent}
          onPointerDown={stopPhiOverlayEvent}
          style={{ display: "inline-flex" }}
        >
          <PhiButtonControl
            type="text"
            size="small"
            ariaLabel={labels.richText.alignment}
            tooltip={labels.richText.alignment}
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
          <PhiFlexControl
            vertical
            gap={8}
            onClick={stopPhiOverlayEvent}
            onMouseDown={preserveEditorSelectionMouseEvent}
            onPointerDown={stopPhiOverlayEvent}
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
          </PhiFlexControl>
        }
      >
        <span
          onMouseDown={preserveEditorSelectionMouseEvent}
          onClick={stopPhiOverlayEvent}
          onPointerDown={stopPhiOverlayEvent}
          style={{ display: "inline-flex" }}
        >
          <PhiButtonControl
            type={hasActiveTextStyle ? "primary" : "text"}
            size="small"
            ariaLabel={labels.richText.styles}
            icon={<PhiIcon name="format-painter" size="inherit" />}
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
        ariaLabel={labels.richText.color}
        onChange={(color) => {
          bridge?.setTextColor(color);
          bridge?.focus();
        }}
      />
      <PhiInternalAssetReferencePickerButton
        blockId={blockId}
        ariaLabel={labels.richText.insertAsset}
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
          <PhiFlexControl
            vertical
            gap={8}
            onClick={stopPhiOverlayEvent}
            onMouseDown={stopPhiOverlayEvent}
            onPointerDown={stopPhiOverlayEvent}
          >
            <PhiPageReferencePicker
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
              onKeyDown={stopPhiOverlayEvent}
            />
            <PhiFlexControl gap={8} justify="space-between">
              <PhiButtonControl
                size="small"
                disabled={!bridge || !state?.linkUrl}
                label={labels.richText.linkRemove}
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
                label={labels.richText.linkApply}
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
            </PhiFlexControl>
          </PhiFlexControl>
        }
      >
        <span
          onMouseDown={stopPhiOverlayEvent}
          onClick={stopPhiOverlayEvent}
          onPointerDown={stopPhiOverlayEvent}
          style={{ display: "inline-flex" }}
        >
          <PhiButtonControl
            type={state?.linkUrl ? "primary" : "text"}
            size="small"
            ariaLabel={labels.richText.link}
            icon={<PhiIcon name="link" size="inherit" />}
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
  const labels = usePhiAuthoringToolsLabels();
  const [, setRegistryVersion] = useState(0);

  useEffect(() => subscribePhiMarkdownWidgetEditorBridge(
    blockId,
    () => setRegistryVersion((current) => current + 1),
  ), [blockId]);

  const bridge = resolvePhiMarkdownWidgetEditorBridge(blockId);
  return (
    <>
      <PhiPageReferencePicker
        onSelect={(selection) => {
          const label = selection.title.replaceAll("]", "\\]");
          bridge?.insert(`[${label}](${createPhiPageUri(selection.reference)})`);
        }}
      />
      <PhiInternalAssetReferencePickerButton
        blockId={blockId}
        ariaLabel={labels.richText.insertAsset}
        onSelect={(asset) => {
          const alt = (asset.altText?.trim() || asset.title?.trim() || asset.originalName)
            .replaceAll("]", "\\]");
          bridge?.insert(`![${alt}](${createPhiAssetUri(asset.id)})`);
        }}
      />
    </>
  );
}

export type PhiWidgetCountToolButtonProps = {
  /** How many there are now; the button shows it. */
  count: number;
  min: number;
  max: number;
  /** The button's tooltip and the caption over the field. */
  label: string;
  onChange: (count: number) => void;
};

/**
 * How many of something a Widget has, set from its scaffold: a button showing the number, and a field
 * behind it. The Description's items and the Command Toolbar's buttons are counted this way.
 */
export function PhiWidgetCountToolButton({
  count,
  min,
  max,
  label,
  onChange,
}: PhiWidgetCountToolButtonProps) {
  const popup = usePhiWidgetScaffoldPopup();
  /*
   * What is being typed, apart from what is stored. The field reported every keystroke, and each one
   * resized the list: typing "10" committed "1" first and dropped entries two onwards before the "0"
   * arrived. The number is taken when the field is left or Enter is pressed.
   */
  const [draft, setDraft] = useState({ stored: count, count: count as number | null });
  if (draft.stored !== count) {
    // A change from elsewhere -- an undo, another editor -- replaces what was being typed, adjusted
    // during render so the field never shows the stale number for a frame.
    setDraft({ stored: count, count });
  }
  const draftCount = draft.stored === count ? draft.count : count;
  const setDraftCount = (next: number | null) => setDraft({ stored: count, count: next });
  /* An emptied field on the way to a new number is not a count; out of range is held to the range. */
  const commit = () => {
    if (draftCount == null || !Number.isFinite(draftCount)) return;
    const nextCount = Math.max(min, Math.min(max, Math.trunc(draftCount)));
    if (nextCount === count) return;
    onChange(nextCount);
  };

  return (
    <PhiPopoverControl
      trigger="click"
      placement="bottomRight"
      getPopupContainer={popup.getPopupContainer}
      rootClassName={popup.rootClassName}
      onOpenChange={popup.setOpen}
      zIndex={PHI_Z_INDEX.authoringPopup}
      content={
        <PhiFlexControl
          vertical
          gap={8}
          onClick={stopPhiOverlayEvent}
          onMouseDown={stopPhiOverlayEvent}
          onPointerDown={stopPhiOverlayEvent}
        >
          <PhiTypographyControl type="secondary">{label}</PhiTypographyControl>
          <PhiNumberControl
            min={min}
            max={max}
            precision={0}
            value={draftCount}
            onChange={setDraftCount}
            onBlur={commit}
            onKeyDown={(event) => {
              stopPhiOverlayEvent(event);
              if (event.key === "Enter") commit();
            }}
          />
        </PhiFlexControl>
      }
    >
      <span
        onMouseDown={stopPhiOverlayEvent}
        onClick={stopPhiOverlayEvent}
        onPointerDown={stopPhiOverlayEvent}
        style={{ display: "inline-flex" }}
      >
        <PhiButtonControl
          type="text"
          size="small"
          ariaLabel={label}
          tooltip={label}
          label={count}
          onClick={() => undefined}
        />
      </span>
    </PhiPopoverControl>
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
  const labels = usePhiAuthoringToolsLabels();
  return (
    <PhiWidgetCountToolButton
      count={Array.isArray(value) ? value.length : 0}
      min={0}
      max={12}
      label={labels.descriptions.items}
      onChange={(count) => onChange(resizePhiDescriptionItems(value, count))}
    />
  );
}
