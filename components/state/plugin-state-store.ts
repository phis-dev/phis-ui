"use client";

import { createScopedStateStore } from "./scoped-state-store";

export type PhiPluginStateScope = string;

export type PhiPluginStateStore<TState> = {
  useStore(scopeKey: PhiPluginStateScope): TState;
  useStoreSelector<TSelected>(scopeKey: PhiPluginStateScope, selector: (state: TState) => TSelected): TSelected;
  subscribe(scopeKey: PhiPluginStateScope, listener: () => void): () => void;
  getSnapshot(scopeKey: PhiPluginStateScope): TState;
  getHydrationSnapshot(scopeKey: PhiPluginStateScope): TState;
  patch(scopeKey: PhiPluginStateScope, updater: (current: TState) => TState): void;
  replace(scopeKey: PhiPluginStateScope, nextState: TState): void;
  reset(scopeKey: PhiPluginStateScope): void;
  deleteScope(scopeKey: PhiPluginStateScope): void;
};

export function createPhiPluginStateStore<TState>(
  pluginKey: string,
  createDefaultState: (scopeKey: PhiPluginStateScope) => TState,
  options?: {
    storeId?: string;
  },
): PhiPluginStateStore<TState> {
  const storeId = options?.storeId ?? `@phis/ui/plugin-state/${pluginKey}`;
  return createScopedStateStore<TState>(storeId, createDefaultState);
}
