"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";

import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $insertNodes,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type BaseSelection,
  type ElementFormatType,
  type LexicalEditor,
  getStyleObjectFromCSS,
  configExtension,
  defineExtension,
} from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { TOGGLE_LINK_COMMAND, $isLinkNode } from "@lexical/link";
import { $removeList, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListNode } from "@lexical/list";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalIsTextContentEmpty } from "@lexical/react/useLexicalIsTextContentEmpty";
import { ReactExtension } from "@lexical/react/ReactExtension";
import { HistoryExtension } from "@lexical/history";
import { LinkExtension } from "@lexical/link";
import { ListExtension } from "@lexical/list";
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode, RichTextExtension } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $patchStyleText } from "@lexical/selection";
import { $findMatchingParent, $getNearestNodeOfType, mergeRegister } from "@lexical/utils";

import { usePhiConfig } from "../../root/phi-config-provider";
import { resolvePhiWidgetFontFamily } from "../helpers/font-family";
import { resolvePhiWidgetFontSize } from "../helpers/font-size";
import { sanitizePhiHtmlWidgetMarkup } from "../helpers/html-content";
import {
  PHI_HTML_WIDGET_EDITOR_EMPTY_STATE,
  registerPhiHtmlWidgetEditorBridge,
  type PhiHtmlWidgetAlignment,
  type PhiHtmlWidgetBlockType,
  type PhiHtmlWidgetEditorBridgeState,
} from "../client/html-editor-bridge";
import type { PhiWidgetFontFamilyKey, PhiWidgetFontSizeKey } from "../../../types/site-theme";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { $createPhiHtmlImageNode, PhiHtmlImageNode } from "./html-editor-image-node";

type PhiHtmlWidgetEditorProps = {
  blockId: PhiCmsInstanceId;
  html?: string | null;
  fontFamily?: PhiWidgetFontFamilyKey | null;
  fontSize?: PhiWidgetFontSizeKey | null;
  onChange?: (html: string) => void;
};

const PHI_HTML_WIDGET_PLACEHOLDER = "Write rich text...";
const PHI_HTML_WIDGET_EDITOR_LINE_HEIGHT = 1.7;
const PHI_HTML_WIDGET_EDITOR_MIN_CONTENT_HEIGHT = `${PHI_HTML_WIDGET_EDITOR_LINE_HEIGHT}em`;
/**
 * The scaffold's drag handle is centered on the Widget's left edge, so half of it sits over the
 * editor. The content keeps clear of it instead of running underneath.
 */
const PHI_HTML_WIDGET_EDITOR_CONTENT_INSET = { block: 4, inlineStart: 16, inlineEnd: 8 } as const;
const PHI_HTML_WIDGET_EDITOR_CONTENT_PADDING =
  `${PHI_HTML_WIDGET_EDITOR_CONTENT_INSET.block}px ${PHI_HTML_WIDGET_EDITOR_CONTENT_INSET.inlineEnd}px`
  + ` ${PHI_HTML_WIDGET_EDITOR_CONTENT_INSET.block}px ${PHI_HTML_WIDGET_EDITOR_CONTENT_INSET.inlineStart}px`;
const PHI_HTML_WIDGET_EDITOR_LIVE_STYLE = `
.phi-html-widget-editor__content strong,
.phi-html-widget-editor__content b,
.phi-html-widget-editor__text--bold {
  font-weight: 600 !important;
}

.phi-html-widget-editor__content em,
.phi-html-widget-editor__content i,
.phi-html-widget-editor__text--italic {
  font-style: italic !important;
}

.phi-html-widget-editor__content u,
.phi-html-widget-editor__text--underline {
  text-decoration: underline !important;
  text-decoration-line: underline !important;
}

.phi-html-widget-editor__content s,
.phi-html-widget-editor__text--strikethrough {
  text-decoration: line-through !important;
  text-decoration-line: line-through !important;
}

.phi-html-widget-editor__text--underline-strikethrough {
  text-decoration: underline line-through !important;
  text-decoration-line: underline line-through !important;
}

.phi-html-widget-editor__text--code {
  font-family: var(--ant-font-family-code, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace);
  background: var(--ant-color-fill-secondary, rgba(0, 0, 0, 0.04));
  border-radius: 4px;
  padding: 0 0.2em;
}
`;

function resolvePhiHtmlWidgetBlockType(selection: BaseSelection | null): PhiHtmlWidgetBlockType {
  if (!$isRangeSelection(selection)) {
    return "paragraph";
  }

  const anchorNode = selection.anchor.getNode();
  const listNode = $getNearestNodeOfType(anchorNode, ListNode);
  if (listNode) {
    return listNode.getListType() === "number" ? "number" : "bullet";
  }

  const topLevelNode = $isRootOrShadowRoot(anchorNode)
    ? anchorNode.getChildAtIndex(selection.anchor.offset) ?? anchorNode.getFirstChild()
    : anchorNode.getTopLevelElementOrThrow();

  if (!topLevelNode || $isRootOrShadowRoot(topLevelNode)) {
    return "paragraph";
  }

  if ($isHeadingNode(topLevelNode)) {
    const tag = topLevelNode.getTag();
    return tag === "h1" || tag === "h2" || tag === "h3" ? tag : "paragraph";
  }

  if ($isQuoteNode(topLevelNode)) {
    return "quote";
  }

  return "paragraph";
}

function resolvePhiHtmlWidgetAlignment(selection: BaseSelection | null): PhiHtmlWidgetAlignment {
  if (!$isRangeSelection(selection)) {
    return "left";
  }

  const anchorNode = selection.anchor.getNode();
  const listNode = $getNearestNodeOfType(anchorNode, ListNode);
  const topLevelNode = listNode ?? ($isRootOrShadowRoot(anchorNode)
    ? anchorNode.getChildAtIndex(selection.anchor.offset) ?? anchorNode.getFirstChild()
    : anchorNode.getTopLevelElementOrThrow());

  if (!$isElementNode(topLevelNode)) {
    return "left";
  }

  const format = topLevelNode.getFormatType();
  return format === "center" || format === "right" || format === "justify" ? format : "left";
}

function applyPhiHtmlWidgetBlockType(editor: LexicalEditor, nextBlockType: PhiHtmlWidgetBlockType) {
  if (nextBlockType === "bullet") {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    return;
  }

  if (nextBlockType === "number") {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    return;
  }

  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }

    const anchorNode = selection.anchor.getNode();
    if ($getNearestNodeOfType(anchorNode, ListNode)) {
      $removeList();
    }

    if (nextBlockType === "paragraph") {
      $setBlocksType(selection, () => $createParagraphNode());
      return;
    }

    if (nextBlockType === "quote") {
      $setBlocksType(selection, () => $createQuoteNode());
      return;
    }

    $setBlocksType(selection, () => $createHeadingNode(nextBlockType));
  });
}

function applyPhiHtmlWidgetAlignment(editor: LexicalEditor, alignment: PhiHtmlWidgetAlignment) {
  editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment as ElementFormatType);
}

function normalizePhiHtmlWidgetTextColor(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readPhiHtmlWidgetStyleColor(style: string | null | undefined) {
  if (typeof style !== "string" || style.trim().length === 0) {
    return null;
  }

  const styleObject = getStyleObjectFromCSS(style);
  if (!styleObject || typeof styleObject.color !== "string") {
    return null;
  }

  return normalizePhiHtmlWidgetTextColor(styleObject.color);
}

function applyPhiHtmlWidgetTextColor(editor: LexicalEditor, color: string | null) {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }

    $patchStyleText(selection, {
      color,
    });
  });
}

function loadPhiHtmlWidgetEditorMarkup(editor: LexicalEditor, html: string) {
  editor.update(() => {
    const root = $getRoot();
    root.clear();

    if (!html) {
      root.append($createParagraphNode());
      return;
    }

    const dom = new DOMParser().parseFromString(html, "text/html");
    const nodes = $generateNodesFromDOM(editor, dom);
    if (nodes.length === 0) {
      root.append($createParagraphNode());
      return;
    }

    root.append(...nodes);
  });
}

function PhiHtmlWidgetEditorContentSyncPlugin({
  html,
  latestHtmlRef,
}: {
  html: string;
  latestHtmlRef: MutableRefObject<string>;
}) {
  const [editor] = useLexicalComposerContext();
  const importedHtmlRef = useRef<string | null>(null);

  useEffect(() => {
    if (importedHtmlRef.current == null) {
      importedHtmlRef.current = html;
      latestHtmlRef.current = html;
      loadPhiHtmlWidgetEditorMarkup(editor, html);
      return;
    }

    if (html === latestHtmlRef.current) {
      importedHtmlRef.current = html;
      return;
    }

    if (importedHtmlRef.current === html) {
      return;
    }

    importedHtmlRef.current = html;
    latestHtmlRef.current = html;
    loadPhiHtmlWidgetEditorMarkup(editor, html);
  }, [editor, html, latestHtmlRef]);

  return null;
}

function PhiHtmlWidgetEditorChangePlugin({
  latestHtmlRef,
  onChange,
}: {
  latestHtmlRef: MutableRefObject<string>;
  onChange?: (html: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const emitChange = useEffectEvent((html: string) => onChange?.(html));

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      const nextHtml = editorState.read(() => sanitizePhiHtmlWidgetMarkup(
        $generateHtmlFromNodes(editor),
        { allowInternalReferences: true },
      ));
      if (nextHtml === latestHtmlRef.current) {
        return;
      }

      latestHtmlRef.current = nextHtml;
      emitChange(nextHtml);
    });
  }, [editor, latestHtmlRef]);

  return null;
}

function PhiHtmlWidgetEditorPlaceholder() {
  const [editor] = useLexicalComposerContext();
  const isEmpty = useLexicalIsTextContentEmpty(editor, true);

  if (!isEmpty) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: PHI_HTML_WIDGET_EDITOR_CONTENT_INSET.block,
        left: PHI_HTML_WIDGET_EDITOR_CONTENT_INSET.inlineStart,
        color: "rgba(0, 0, 0, 0.4)",
        pointerEvents: "none",
        lineHeight: PHI_HTML_WIDGET_EDITOR_LINE_HEIGHT,
      }}
    >
      {PHI_HTML_WIDGET_PLACEHOLDER}
    </div>
  );
}

function PhiHtmlWidgetEditorContentEditable() {
  const [editor] = useLexicalComposerContext();

  return (
    <ContentEditable
      className="phi-html-widget-editor__content"
      aria-placeholder={PHI_HTML_WIDGET_PLACEHOLDER}
      placeholder={<span />}
      onClick={() => editor.focus()}
      onMouseDown={() => editor.focus()}
      style={{
        minHeight: PHI_HTML_WIDGET_EDITOR_MIN_CONTENT_HEIGHT,
        margin: 0,
        padding: PHI_HTML_WIDGET_EDITOR_CONTENT_PADDING,
        outline: "none",
        lineHeight: PHI_HTML_WIDGET_EDITOR_LINE_HEIGHT,
        overflowWrap: "anywhere",
      }}
    />
  );
}

function PhiHtmlWidgetEditorBridgePlugin({
  blockId,
}: {
  blockId: PhiCmsInstanceId;
}) {
  const [editor] = useLexicalComposerContext();
  const stateRef = useRef<PhiHtmlWidgetEditorBridgeState>(PHI_HTML_WIDGET_EDITOR_EMPTY_STATE);
  const listenersRef = useRef(new Set<(state: PhiHtmlWidgetEditorBridgeState) => void>());

  const publishState = useEffectEvent(() => {
    const nextState = stateRef.current;
    for (const listener of listenersRef.current) {
      listener(nextState);
    }
  });

  const refreshBridgeState = useEffectEvent(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        stateRef.current = {
          ...PHI_HTML_WIDGET_EDITOR_EMPTY_STATE,
          canUndo: stateRef.current.canUndo,
          canRedo: stateRef.current.canRedo,
        };
        publishState();
        return;
      }

      const anchorNode = selection.anchor.getNode();
      const linkNode = $findMatchingParent(anchorNode, (node) => $isLinkNode(node));
      stateRef.current = {
        blockType: resolvePhiHtmlWidgetBlockType(selection),
        alignment: resolvePhiHtmlWidgetAlignment(selection),
        bold: selection.hasFormat("bold"),
        italic: selection.hasFormat("italic"),
        underline: selection.hasFormat("underline"),
        strike: selection.hasFormat("strikethrough"),
        code: selection.hasFormat("code"),
        textColor: readPhiHtmlWidgetStyleColor(selection.style),
        canUndo: stateRef.current.canUndo,
        canRedo: stateRef.current.canRedo,
        linkUrl: linkNode && $isLinkNode(linkNode) ? linkNode.getURL() : null,
      };
      publishState();
    });
  });

  useEffect(() => {
    const unregisterBridge = registerPhiHtmlWidgetEditorBridge(blockId, {
      getState: () => stateRef.current,
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
      focus: () => {
        editor.focus();
      },
      setBlockType: (blockType) => {
        applyPhiHtmlWidgetBlockType(editor, blockType);
      },
      setAlignment: (alignment) => {
        applyPhiHtmlWidgetAlignment(editor, alignment);
      },
      toggleFormat: (format) => {
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
      },
      setTextColor: (color) => {
        applyPhiHtmlWidgetTextColor(editor, color);
      },
      setLink: (url) => {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url == null ? null : {
          url,
          target: url.startsWith("phis:page/") || url.startsWith("#") ? null : "_blank",
          rel: url.startsWith("phis:page/") || url.startsWith("#") ? null : "noopener noreferrer",
        });
      },
      insertImage: (src, alt) => {
        editor.update(() => {
          $insertNodes([$createPhiHtmlImageNode(src, alt)]);
        });
      },
      undo: () => {
        editor.dispatchCommand(UNDO_COMMAND, undefined);
      },
      redo: () => {
        editor.dispatchCommand(REDO_COMMAND, undefined);
      },
    });

    return mergeRegister(
      editor.registerUpdateListener(() => {
        refreshBridgeState();
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          refreshBridgeState();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (canUndo) => {
          stateRef.current = {
            ...stateRef.current,
            canUndo,
          };
          publishState();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (canRedo) => {
          stateRef.current = {
            ...stateRef.current,
            canRedo,
          };
          publishState();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      () => {
        unregisterBridge();
      },
    );
  }, [blockId, editor]);

  return null;
}

export function PhiHtmlWidgetEditor({
  blockId,
  html,
  fontFamily,
  fontSize,
  onChange,
}: PhiHtmlWidgetEditorProps) {
  const { fonts, token } = usePhiConfig();
  const editorId = useId();
  const normalizedHtml = useMemo(
    () => sanitizePhiHtmlWidgetMarkup(html, { allowInternalReferences: true }),
    [html],
  );
  const initialHtmlRef = useRef(normalizedHtml);
  const latestHtmlRef = useRef(normalizedHtml);
  const resolvedFontFamily = resolvePhiWidgetFontFamily(fontFamily, fonts, token);
  const resolvedFontSize = resolvePhiWidgetFontSize(fontSize, token, "lg");
  const editable = onChange != null;

  useEffect(() => {
    latestHtmlRef.current = normalizedHtml;
  }, [normalizedHtml]);

  const extension = useMemo(
    () => ({
      extension: defineExtension({
        name: `phi/html-widget-root/${editorId}`,
        dependencies: [
          configExtension(ReactExtension, {}),
          RichTextExtension,
          HistoryExtension,
          LinkExtension,
          ListExtension,
        ],
        nodes: [PhiHtmlImageNode],
        init(editorConfig) {
          editorConfig.namespace = `PhiHtmlWidgetEditor:${editorId}`;
          editorConfig.onError = (error) => {
            throw error;
          };
          editorConfig.editable = editable;
          editorConfig.theme = {
            ...(editorConfig.theme ?? {}),
            link: "phi-html-widget-editor__link",
            text: {
              ...(editorConfig.theme?.text ?? {}),
              bold: "phi-html-widget-editor__text--bold",
              italic: "phi-html-widget-editor__text--italic",
              underline: "phi-html-widget-editor__text--underline",
              strikethrough: "phi-html-widget-editor__text--strikethrough",
              underlineStrikethrough: "phi-html-widget-editor__text--underline-strikethrough",
              code: "phi-html-widget-editor__text--code",
            },
          };
          editorConfig.$initialEditorState = (editor) => {
            loadPhiHtmlWidgetEditorMarkup(editor, initialHtmlRef.current);
          };
        },
      }),
    }),
    [editable, editorId],
  );

  const contentEditable = useMemo(
    () => <PhiHtmlWidgetEditorContentEditable />,
    [],
  );

  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        border: "1px solid var(--ant-color-border, rgba(0, 0, 0, 0.12))",
        borderRadius: 0,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.84)",
        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.06)",
      }}
    >
      <style>{PHI_HTML_WIDGET_EDITOR_LIVE_STYLE}</style>
      <LexicalExtensionComposer extension={extension.extension} contentEditable={contentEditable}>
        <div
          style={{
            position: "relative",
            minHeight: PHI_HTML_WIDGET_EDITOR_MIN_CONTENT_HEIGHT,
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            padding: 0,
            fontFamily: resolvedFontFamily,
            fontSize: resolvedFontSize ?? token.fontSize,
          }}
        >
          <PhiHtmlWidgetEditorPlaceholder />
          <PhiHtmlWidgetEditorBridgePlugin blockId={blockId} />
          <PhiHtmlWidgetEditorContentSyncPlugin
            html={normalizedHtml}
            latestHtmlRef={latestHtmlRef}
          />
          <PhiHtmlWidgetEditorChangePlugin latestHtmlRef={latestHtmlRef} onChange={onChange} />
        </div>
      </LexicalExtensionComposer>
    </div>
  );
}
