"use client";

import { useState } from "react";

import { FormatPainterOutlined } from "@ant-design/icons";
import { Flex } from "antd";

import { PhiInlineTextEditor } from "../../../plugins/runtime-modules/builder/clients/inline-text-editor";
import { PhiButtonControl } from "../../controls/phi-button-control";
import { PhiCheckboxControl } from "../../controls/phi-checkbox-control";
import { PhiPopoverControl } from "../../controls/phi-popover-control";
import { usePhiConfig } from "../../root/phi-config-provider";
import { PhiIcon } from "../../shell/phi-icon";
import {
  PhiWidgetColorToolButton,
  PhiWidgetIconToolButton,
  PhiWidgetTypographyToolButton,
} from "../../widgets/client/shared/phi-widget-tool-buttons";
import { usePhiWidgetScaffoldPopup } from "../../widgets/client/shared/phi-widget-scaffold-popup";
import { resolvePhiSimpleTextWidgetText, type PhiSimpleTextWidgetRenderableConfig } from "../../../plugins/runtime-modules/core/widgets/simple-text/config";
import { PhiSimpleTextWidgetClient } from "../../../plugins/runtime-modules/core/widgets/simple-text/client";
import { resolvePhiWidgetFontFamily } from "../helpers/font-family";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { resolvePhiWidgetFontSize } from "../helpers/font-size";
import { PHI_Z_INDEX } from "../../../theme/phi-tokens";

export type PhiSimpleTextWidgetEditorProps = {
  text: string;
  config?: PhiSimpleTextWidgetRenderableConfig | null;
  onChangeText?: (text: string) => void;
};

type PhiStyleToggleKey = "strong" | "italic" | "underline" | "delete" | "code";

const STYLE_TOGGLES: ReadonlyArray<{ key: PhiStyleToggleKey; label: string }> = [
  { key: "strong", label: "Strong" },
  { key: "italic", label: "Italic" },
  { key: "underline", label: "Underline" },
  { key: "delete", label: "Delete" },
  { key: "code", label: "Code" },
];

export type PhiSimpleTextWidgetStyleButtonProps = {
  config?: PhiSimpleTextWidgetRenderableConfig | null;
  onChange: (patch: Partial<PhiSimpleTextWidgetRenderableConfig>) => void;
};

export function PhiSimpleTextWidgetStyleButton({
  config,
  onChange,
}: PhiSimpleTextWidgetStyleButtonProps) {
  const [open, setOpen] = useState(false);
  const popup = usePhiWidgetScaffoldPopup();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    popup.setOpen(nextOpen);
  };

  return (
    <PhiPopoverControl
      open={open}
      trigger="click"
      placement="bottomRight"
      onOpenChange={handleOpenChange}
      getPopupContainer={popup.getPopupContainer}
      rootClassName={popup.rootClassName}
      zIndex={PHI_Z_INDEX.authoringPopup}
      content={
        <Flex
          vertical
          gap={8}
        >
          {STYLE_TOGGLES.map((toggle) => (
            <PhiCheckboxControl
              key={toggle.key}
              checked={config?.[toggle.key] === true}
              label={toggle.label}
              onChange={(checked) => onChange({ [toggle.key]: checked })}
            />
          ))}
        </Flex>
      }
    >
      <span style={{ display: "inline-flex" }}>
        <PhiButtonControl
          type="text"
          size="small"
          ariaLabel="Text styles"
          icon={<FormatPainterOutlined />}
          onClick={() => undefined}
        />
      </span>
    </PhiPopoverControl>
  );
}

export type PhiSimpleTextWidgetColorButtonProps = {
  config?: PhiSimpleTextWidgetRenderableConfig | null;
  onChange: (color: string | null) => void;
};

export function PhiSimpleTextWidgetColorButton({
  config,
  onChange,
}: PhiSimpleTextWidgetColorButtonProps) {
  return (
    <PhiWidgetColorToolButton value={config?.color ?? null} ariaLabel="Text color" onChange={onChange} />
  );
}

export type PhiSimpleTextWidgetIconButtonProps = {
  config?: PhiSimpleTextWidgetRenderableConfig | null;
  onChange: (icon: string | null) => void;
};

export function PhiSimpleTextWidgetIconButton({
  config,
  onChange,
}: PhiSimpleTextWidgetIconButtonProps) {
  return (
    <PhiWidgetIconToolButton value={config?.icon ?? null} ariaLabel="Text icon" onChange={onChange} />
  );
}

export type PhiSimpleTextWidgetTypographyButtonProps = {
  config?: PhiSimpleTextWidgetRenderableConfig | null;
  onChange: (patch: Partial<PhiSimpleTextWidgetRenderableConfig>) => void;
};

export function PhiSimpleTextWidgetTypographyButton({
  config,
  onChange,
}: PhiSimpleTextWidgetTypographyButtonProps) {
  return (
    <PhiWidgetTypographyToolButton
      fontFamily={config?.fontFamily}
      fontSize={config?.fontSize}
      defaultFontSize="lg"
      ariaLabel="Text typography"
      onChange={({ fontFamily, fontSize }) => onChange({
        ...(fontFamily !== undefined ? { fontFamily: fontFamily ?? undefined } : {}),
        ...(fontSize !== undefined ? { fontSize: fontSize ?? undefined } : {}),
      })}
    />
  );
}

export function PhiSimpleTextWidgetEditor({
  text,
  config,
  onChangeText,
}: PhiSimpleTextWidgetEditorProps) {
  const { fonts, token } = usePhiConfig();
  const [draftTextState, setDraftTextState] = useState(() => ({ source: text, value: text }));
  const [isFocused, setIsFocused] = useState(false);
  const draftText = draftTextState.source === text ? draftTextState.value : text;
  const textDecoration = [
    config?.underline ? "underline" : null,
    config?.delete ? "line-through" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const inputWidthCh = Math.max(draftText.length + 1, isFocused ? 12 : 2);
  const resolvedFontFamily = config?.code
    ? token.fontFamilyCode
    : resolvePhiWidgetFontFamily(config?.fontFamily, fonts, token);
  const resolvedFontSize = resolvePhiWidgetFontSize(config?.fontSize, token, "lg");

  return (
    <Flex
      align="center"
      gap={8}
      style={{
        width: "fit-content",
        maxWidth: "100%",
        minWidth: 0,
        fontSize: resolvedFontSize ?? "inherit",
        lineHeight: resolvedFontSize ? 1.6 : "inherit",
        color: config?.color ?? undefined,
        fontFamily: resolvedFontFamily,
      }}
    >
      {config?.icon ? <PhiIcon name={config.icon} size="1.25em" /> : null}
      <PhiInlineTextEditor
        value={draftText}
        variant="borderless"
        placeholder="Text"
        readOnly={!onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(nextText) => {
          setDraftTextState({ source: text, value: nextText });
          onChangeText?.(nextText);
        }}
        onCommit={() => undefined}
        onCancel={() => {
          setDraftTextState({ source: text, value: text });
          onChangeText?.(text);
        }}
        styles={{
          input: {
            borderBottom: "1px solid var(--ant-color-border, rgba(0, 0, 0, 0.15))",
            borderRadius: 0,
            paddingInline: 0,
            paddingBlock: 4,
            fontSize: resolvedFontSize ?? "inherit",
            lineHeight: resolvedFontSize ? 1.6 : "inherit",
            fontWeight: config?.strong ? 600 : undefined,
            fontStyle: config?.italic ? "italic" : undefined,
            textDecoration: textDecoration || undefined,
            color: config?.color ?? undefined,
            fontFamily: resolvedFontFamily,
            backgroundColor: config?.code ? "var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.04))" : undefined,
          },
        }}
        style={{
          width: `${inputWidthCh}ch`,
          minWidth: 0,
          flex: "0 0 auto",
          maxWidth: "100%",
        }}
      />
    </Flex>
  );
}

export function renderPhiSimpleTextWidgetEditor(
  config: PhiSimpleTextWidgetRenderableConfig | undefined,
  fallbackText = "Text",
  onChangeText?: (text: string) => void,
) {
  const text = resolvePhiSimpleTextWidgetText(config, { preferConfigText: true }, fallbackText);

  return (
    <PhiSimpleTextWidgetEditor
      text={text}
      config={config}
      onChangeText={onChangeText}
    />
  );
}

export function renderPhiSimpleTextWidgetBody(
  blockId: PhiCmsInstanceId,
  config: PhiSimpleTextWidgetRenderableConfig | undefined,
  fallbackText = "Text",
) {
  const text = resolvePhiSimpleTextWidgetText(config, { preferConfigText: true }, fallbackText);
  return <PhiSimpleTextWidgetClient blockId={blockId} labels={{ text }} config={config} />;
}


export function PhiSimpleTextWidgetEditorPluginBody({
  label,
  config,
  onChange,
}: {
  label?: string | null;
  config: PhiSimpleTextWidgetRenderableConfig;
  onChange?: (patch: Partial<PhiSimpleTextWidgetRenderableConfig>) => void;
}) {
  return renderPhiSimpleTextWidgetEditor(
    { ...config, label: label ?? undefined },
    "Text",
    onChange ? (text) => onChange({ text }) : undefined,
  );
}

export function PhiSimpleTextWidgetEditorPluginTools({
  config,
  onChange,
}: {
  config: PhiSimpleTextWidgetRenderableConfig;
  onChange: (patch: Partial<PhiSimpleTextWidgetRenderableConfig>) => void;
}) {
  return (
    <>
      <PhiWidgetIconToolButton value={config.icon ?? null} ariaLabel="Text icon" onChange={(icon) => onChange({ icon: icon ?? undefined })} />
      <PhiSimpleTextWidgetColorButton config={config} onChange={(color) => onChange({ color: color ?? undefined })} />
      <PhiSimpleTextWidgetTypographyButton config={config} onChange={onChange} />
      <PhiSimpleTextWidgetStyleButton config={config} onChange={onChange} />
    </>
  );
}
