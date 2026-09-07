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
  /*
   * What is being typed, held here until the field is left; see the same state in the Simple Text
   * editor. The textarea has its own undo while it is focused, and one Builder history entry per
   * keystroke would bury every other edit in the workspace.
   */
  const [editedMarkdown, setEditedMarkdown] = useState<string | null>(null);
  const draftMarkdown = editedMarkdown ?? markdown;
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
      // An insert is a finished gesture of its own, so it is written straight through and the
      // typing draft is given up: what the toolbar produced now stands in the config.
      setEditedMarkdown(null);
      currentValueRef.current = next;
      onChangeRef.current?.(next);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current?.resizableTextArea?.textArea;
        textarea?.focus();
        textarea?.setSelectionRange(caret, caret);
      });
    },
  }), [blockId]);

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
      onChange={(value) => setEditedMarkdown(value ?? "")}
      onBlur={() => {
        const textarea = textareaRef.current?.resizableTextArea?.textArea;
        if (textarea) {
          selectionRef.current = {
            start: textarea.selectionStart,
            end: textarea.selectionEnd,
          };
        }
        setEditedMarkdown(null);
        if (draftMarkdown !== markdown) {
          onChange?.(draftMarkdown);
        }
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
