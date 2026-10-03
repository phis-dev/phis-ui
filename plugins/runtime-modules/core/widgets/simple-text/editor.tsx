"use client";

import { useState } from "react";


import { PhiInlineTextEditor } from "../../../../../components/controls/phi-inline-text-editor";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiCheckboxControl } from "../../../../../components/controls/phi-checkbox-control";
import { PhiPopoverControl } from "../../../../../components/controls/phi-popover-control";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import {
  PhiWidgetColorToolButton,
  PhiWidgetIconToolButton,
  PhiWidgetTypographyToolButton,
} from "../../../../../components/widgets/client/shared/phi-widget-tool-buttons";
import { usePhiWidgetScaffoldPopup } from "../../../../../components/widgets/client/shared/phi-widget-scaffold-popup";
import { usePhiAuthoringToolsLabels } from "../../../../../components/widgets/client/shared/phi-authoring-tools-labels";
import { PHI_SIMPLE_TEXT_MARKS, type PhiSimpleTextMark } from "../../../../../types/core-widget-placements";
import {
  resolvePhiSimpleTextWidgetText,
  type PhiSimpleTextWidgetRenderableConfig,
} from "./config";
import { hasPhiSimpleTextMark } from "./marks";
import { resolvePhiWidgetFontFamily } from "../../../../../components/widgets/helpers/font-family";
import { resolvePhiWidgetFontSize } from "../../../../../components/widgets/helpers/font-size";
import { PHI_Z_INDEX } from "../../../../../theme/phi-tokens";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";

export type PhiSimpleTextWidgetEditorProps = {
  text: string;
  config?: PhiSimpleTextWidgetRenderableConfig | null;
  onChangeText?: (text: string) => void;
};

const STYLE_TOGGLES: ReadonlyArray<{ key: PhiSimpleTextMark; label: string }> = [
  { key: "bold", label: "Strong" },
  { key: "italic", label: "Italic" },
  { key: "underline", label: "Underline" },
  { key: "strike", label: "Delete" },
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
              checked={hasPhiSimpleTextMark(config, toggle.key)}
              label={toggle.label}
              onChange={(checked) => {
                const marks = PHI_SIMPLE_TEXT_MARKS.filter((mark) =>
                  mark === toggle.key ? checked : hasPhiSimpleTextMark(config, mark));
                onChange({ marks });
              }}
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
          icon={<PhiIcon name="format-painter" size="inherit" />}
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
    hasPhiSimpleTextMark(config, "underline") ? "underline" : null,
    hasPhiSimpleTextMark(config, "strike") ? "line-through" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const resolvedFontFamily = hasPhiSimpleTextMark(config, "code")
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
          paddingBlock: 0,
          /*
           * No control line as a floor, because this field is a text and not a control.
           *
           * Ant Design gives a text area `min-height: controlHeight` -- one whole control line, and inside
           * an affix wrapper that minus its two borders (`input/style/textarea.js`). It hangs on
           * `controlHeight` and on nothing else, so no size takes it back: measured in the Builder, the
           * field kept a 32px box around a 22.4px line while `autoSize` had written the right 22px
           * beside it, and the text sat at the top of the remaining ten pixels. That is what a text in
           * a header strip stood higher than everything beside it for.
           */
          minHeight: 0,
          fontSize: resolvedFontSize ?? "inherit",
          lineHeight: resolvedFontSize ? 1.6 : "inherit",
          fontWeight: hasPhiSimpleTextMark(config, "bold") ? 600 : undefined,
          fontStyle: hasPhiSimpleTextMark(config, "italic") ? "italic" : undefined,
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
          backgroundColor: hasPhiSimpleTextMark(config, "code") ? "var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.04))" : "transparent",
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
