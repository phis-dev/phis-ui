"use client";

import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";

export type PhiHtmlWidgetBlockType = "paragraph" | "h1" | "h2" | "h3" | "quote" | "bullet" | "number";

export type PhiHtmlWidgetTextFormat = "bold" | "italic" | "underline" | "strikethrough" | "code";

export type PhiHtmlWidgetAlignment = "left" | "center" | "right" | "justify";

export type PhiHtmlWidgetEditorBridgeState = {
  blockType: PhiHtmlWidgetBlockType;
  alignment: PhiHtmlWidgetAlignment;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  textColor: string | null;
  canUndo: boolean;
  canRedo: boolean;
  linkUrl: string | null;
};

export const PHI_HTML_WIDGET_EDITOR_EMPTY_STATE: PhiHtmlWidgetEditorBridgeState = {
  blockType: "paragraph",
  alignment: "left",
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  code: false,
  textColor: null,
  canUndo: false,
  canRedo: false,
  linkUrl: null,
};

export type PhiHtmlWidgetEditorBridge = {
  getState: () => PhiHtmlWidgetEditorBridgeState;
  subscribe: (listener: (state: PhiHtmlWidgetEditorBridgeState) => void) => () => void;
  focus: () => void;
  setBlockType: (blockType: PhiHtmlWidgetBlockType) => void;
  setAlignment: (alignment: PhiHtmlWidgetAlignment) => void;
  toggleFormat: (format: PhiHtmlWidgetTextFormat) => void;
  setTextColor: (color: string | null) => void;
  setLink: (url: string | null) => void;
  insertImage: (src: string, alt: string) => void;
  undo: () => void;
  redo: () => void;
};

const editorBridges = new Map<string, PhiHtmlWidgetEditorBridge>();
const registryListeners = new Map<string, Set<() => void>>();

function resolveBridgeKey(blockId: PhiCmsInstanceId) {
  return blockId;
}

function notifyRegistryListeners(blockId: PhiCmsInstanceId) {
  const listeners = registryListeners.get(resolveBridgeKey(blockId));
  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener();
  }
}

export function registerPhiHtmlWidgetEditorBridge(
  blockId: PhiCmsInstanceId,
  bridge: PhiHtmlWidgetEditorBridge,
) {
  const key = resolveBridgeKey(blockId);
  editorBridges.set(key, bridge);
  notifyRegistryListeners(blockId);

  return () => {
    if (editorBridges.get(key) !== bridge) {
      return;
    }

    editorBridges.delete(key);
    notifyRegistryListeners(blockId);
  };
}

export function resolvePhiHtmlWidgetEditorBridge(
  blockId: PhiCmsInstanceId,
): PhiHtmlWidgetEditorBridge | null {
  return editorBridges.get(resolveBridgeKey(blockId)) ?? null;
}

export function subscribePhiHtmlWidgetEditorBridge(
  blockId: PhiCmsInstanceId,
  listener: (state: PhiHtmlWidgetEditorBridgeState | null) => void,
) {
  const key = resolveBridgeKey(blockId);
  let unsubscribeBridge: (() => void) | null = null;

  const sync = () => {
    unsubscribeBridge?.();
    unsubscribeBridge = null;

    const bridge = editorBridges.get(key);
    if (!bridge) {
      listener(null);
      return;
    }

    listener(bridge.getState());
    unsubscribeBridge = bridge.subscribe((state) => {
      listener(state);
    });
  };

  const registrySet = registryListeners.get(key) ?? new Set<() => void>();
  registrySet.add(sync);
  registryListeners.set(key, registrySet);
  sync();

  return () => {
    unsubscribeBridge?.();
    const nextRegistrySet = registryListeners.get(key);
    if (!nextRegistrySet) {
      return;
    }
    nextRegistrySet.delete(sync);
    if (nextRegistrySet.size === 0) {
      registryListeners.delete(key);
    }
  };
}
