"use client";

import { useEffect, useRef, useState } from "react";
import type { TextAreaRef } from "antd/es/input/TextArea";

import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiCmsMarkdownWidgetConfig } from "../../../plugins/runtime-modules/core/widgets/markdown/config";
import { PhiTextControl } from "../../controls/phi-text-control";
import { PhiExternalDocumentEditor } from "./external-document-editor";
import { registerPhiMarkdownWidgetEditorBridge } from "./markdown-editor-bridge";

const MARKDOWN_EDITOR_WIDTH = 520;
const MARKDOWN_EDITOR_HEIGHT = 260;

export type PhiMarkdownWidgetEditorProps = {
  blockId: PhiCmsInstanceId;
  config?: PhiCmsMarkdownWidgetConfig | null;
  onChange?: (markdown: string) => void;
  onSourceLocaleChange?: (sourceLocale: string) => void;
};

export function PhiMarkdownWidgetEditor({
  blockId,
  config,
  onChange,
  onSourceLocaleChange,
}: PhiMarkdownWidgetEditorProps) {
  const sourceMode = config?.sourceMode ?? (config?.sourceUrl?.trim() ? "url" : "inline");
  const sourceUrl = config?.sourceUrl?.trim() ?? "";
  const markdown = config?.markdown ?? "";
  const sourceLocale = config?.sourceLocale?.trim() ?? "";
  const [draftState, setDraftState] = useState(() => ({ source: markdown, value: markdown }));
  const draftMarkdown = draftState.source === markdown ? draftState.value : markdown;
  const textareaRef = useRef<TextAreaRef>(null);
  const currentValueRef = useRef(draftMarkdown);
  const selectionRef = useRef({ start: draftMarkdown.length, end: draftMarkdown.length });
  const onChangeRef = useRef(onChange);

  // The insert bridge is invoked from toolbar events, never during render, so it reads the current
  // value and callback through refs synchronized after commit. Registering the bridge itself on every
  // keystroke would tear down and rebuild the editor binding while the operator is typing.
  useEffect(() => {
    currentValueRef.current = draftMarkdown;
    onChangeRef.current = onChange;
  });

  useEffect(() => registerPhiMarkdownWidgetEditorBridge(blockId, {
    insert: (content) => {
      const current = currentValueRef.current;
      const start = Math.min(selectionRef.current.start, current.length);
      const end = Math.min(Math.max(selectionRef.current.end, start), current.length);
      const next = `${current.slice(0, start)}${content}${current.slice(end)}`;
      const caret = start + content.length;
      selectionRef.current = { start: caret, end: caret };
      setDraftState({ source: markdown, value: next });
      currentValueRef.current = next;
      onChangeRef.current?.(next);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current?.resizableTextArea?.textArea;
        textarea?.focus();
        textarea?.setSelectionRange(caret, caret);
      });
    },
  }), [blockId, markdown]);

  if (sourceMode === "url") {
    return (
      <PhiExternalDocumentEditor
        format="markdown"
        sourceUrl={sourceUrl}
        sourceLocale={sourceLocale}
        onSourceLocaleChange={onSourceLocaleChange}
      />
    );
  }

  return (
    <PhiTextControl
      presentation="textarea"
      textareaRef={textareaRef}
      value={draftMarkdown}
      readOnly={!onChange}
      variant="borderless"
      placeholder="Write markdown..."
      onChange={(value) => {
        const nextMarkdown = value ?? "";
        setDraftState({ source: markdown, value: nextMarkdown });
        onChange?.(nextMarkdown);
      }}
      onBlur={() => {
        const textarea = textareaRef.current?.resizableTextArea?.textArea;
        if (!textarea) return;
        selectionRef.current = {
          start: textarea.selectionStart,
          end: textarea.selectionEnd,
        };
      }}
      style={{
        width: MARKDOWN_EDITOR_WIDTH,
        height: MARKDOWN_EDITOR_HEIGHT,
        maxWidth: "100%",
        minWidth: 0,
        padding: "var(--ant-padding-sm)",
        border: "1px solid var(--ant-color-border-secondary)",
        borderRadius: "var(--ant-border-radius)",
        background: "var(--ant-color-bg-container)",
        resize: "none",
        fontFamily:
          "var(--ant-font-family-code, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace)",
        lineHeight: 1.6,
      }}
    />
  );
}
