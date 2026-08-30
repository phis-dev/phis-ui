"use client";

import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";

export type PhiMarkdownWidgetEditorBridge = {
  insert: (content: string) => void;
};

const bridges = new Map<PhiCmsInstanceId, PhiMarkdownWidgetEditorBridge>();
const listeners = new Map<PhiCmsInstanceId, Set<() => void>>();

function notify(blockId: PhiCmsInstanceId) {
  for (const listener of listeners.get(blockId) ?? []) listener();
}

export function registerPhiMarkdownWidgetEditorBridge(
  blockId: PhiCmsInstanceId,
  bridge: PhiMarkdownWidgetEditorBridge,
) {
  bridges.set(blockId, bridge);
  notify(blockId);
  return () => {
    if (bridges.get(blockId) !== bridge) return;
    bridges.delete(blockId);
    notify(blockId);
  };
}

export function resolvePhiMarkdownWidgetEditorBridge(blockId: PhiCmsInstanceId) {
  return bridges.get(blockId) ?? null;
}

export function subscribePhiMarkdownWidgetEditorBridge(
  blockId: PhiCmsInstanceId,
  listener: () => void,
) {
  const current = listeners.get(blockId) ?? new Set<() => void>();
  current.add(listener);
  listeners.set(blockId, current);
  return () => {
    current.delete(listener);
    if (current.size === 0) listeners.delete(blockId);
  };
}
