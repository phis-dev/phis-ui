"use client";

import { useState } from "react";

import { FormatPainterOutlined } from "@ant-design/icons";

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
import { usePhiAuthoringToolsLabels } from "../../widgets/client/shared/phi-authoring-tools-labels";
import { resolvePhiSimpleTextWidgetText, type PhiSimpleTextWidgetRenderableConfig } from "../../../plugins/runtime-modules/core/widgets/simple-text/config";
import { resolvePhiWidgetFontFamily } from "../helpers/font-family";
import { resolvePhiWidgetFontSize } from "../helpers/font-size";
import { PHI_Z_INDEX } from "../../../theme/phi-tokens";
import { PhiFlexControl } from "../../controls/phi-flex-control";

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
  const labels = usePhiAuthoringToolsLabels();
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
        <PhiFlexControl
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
        </PhiFlexControl>
      }
    >
      <span style={{ display: "inline-flex" }}>
        <PhiButtonControl
          type="text"
          size="small"
          ariaLabel={labels.text.styles}
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
  const labels = usePhiAuthoringToolsLabels();
  return (
    <PhiWidgetColorToolButton value={config?.color ?? null} ariaLabel={labels.text.color} onChange={onChange} />
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
  const labels = usePhiAuthoringToolsLabels();
  return (
    <PhiWidgetTypographyToolButton
      fontFamily={config?.fontFamily}
      fontSize={config?.fontSize}
      defaultFontSize="lg"
      ariaLabel={labels.text.typography}
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
  const labels = usePhiAuthoringToolsLabels();
  const { fonts, token } = usePhiConfig();
  /*
   * What is being typed, held here and nowhere else until the field is left.
   *
   * The characters belong to the input: it has its own undo while it holds the focus, and the
   * Builder's history has no business recording one entry per keystroke. `null` means nothing is
   * being edited, so the field shows the stored text -- which is what makes an undo visible here at
   * all: a draft kept past the blur would go on showing the typed value while the text underneath
   * had already been taken back.
   */
  const [editedText, setEditedText] = useState<string | null>(null);
  const draftText = editedText ?? text;
  const textDecoration = [
    config?.underline ? "underline" : null,
    config?.delete ? "line-through" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const resolvedFontFamily = config?.code
    ? token.fontFamilyCode
    : resolvePhiWidgetFontFamily(config?.fontFamily, fonts, token);
  const resolvedFontSize = resolvePhiWidgetFontSize(config?.fontSize, token, "lg");

  return (
    <PhiFlexControl
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
        variant="underlined"
        /*
         * Compact, because the field stands in the page and not in a form.
         *
         * A field of the ordinary size keeps a control's worth of room around its text, and that room is
         * what a Widget in a Region does not have: the same sentence would stand taller here than it
         * stands once it is read, and the strip around it would move as soon as it is edited. Small
         * leaves the hairline under the text and nothing else.
         */
        size="small"
        placeholder={labels.text.placeholder}
        readOnly={!onChangeText}
        onFocus={() => setEditedText(text)}
        onChange={(nextText) => setEditedText(nextText)}
        onCommit={(committedText) => {
          setEditedText(null);
          if (committedText !== text) {
            onChangeText?.(committedText);
          }
        }}
        onCancel={() => setEditedText(null)}
        inputStyle={{
          paddingInline: 0,
          /*
           * Stated here and not left to the size, because of when each of the two arrives.
           *
           * `size="small"` puts the room at zero through a class, and that class is in a stylesheet Ant
           * Design injects while the page is already rendering. The text area measures itself for its
           * height in between -- that is what `autoSize` does -- so it can measure a box with the
           * ordinary room in it and then keep that height after the room is gone, which leaves the text
           * at the top of a box too tall for it. An inline zero is there at the first paint.
           */
          paddingBlock: 0,
          fontSize: resolvedFontSize ?? "inherit",
          lineHeight: resolvedFontSize ? 1.6 : "inherit",
          fontWeight: config?.strong ? 600 : undefined,
          fontStyle: config?.italic ? "italic" : undefined,
          textDecoration: textDecoration || undefined,
          color: config?.color ?? undefined,
          fontFamily: resolvedFontFamily,
          /*
           * The page shows through: an edit in place must not paint over what is behind the text.
           *
           * Ant Design's underlined field fills itself with the container colour, which is right for a
           * form and wrong here -- the Widget stands on whatever its Region is painted with. Code text is
           * the exception, because there the fill is part of how the text reads.
           */
          backgroundColor: config?.code ? "var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.04))" : "transparent",
        }}
        fitContent
        style={{
          minWidth: 0,
          flex: "0 0 auto",
          maxWidth: "100%",
        }}
      />
    </PhiFlexControl>
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
  const labels = usePhiAuthoringToolsLabels();
  return (
    <>
      <PhiWidgetIconToolButton value={config.icon ?? null} ariaLabel={labels.text.icon} onChange={(icon) => onChange({ icon: icon ?? undefined })} />
      <PhiSimpleTextWidgetColorButton config={config} onChange={(color) => onChange({ color: color ?? undefined })} />
      <PhiSimpleTextWidgetTypographyButton config={config} onChange={onChange} />
      <PhiSimpleTextWidgetStyleButton config={config} onChange={onChange} />
    </>
  );
}
