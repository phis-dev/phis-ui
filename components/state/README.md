# State

Shared transient UI state primitives for `@phis/ui`. All files here are Client modules.

## Scoped state store

`scoped-state-store.ts` (`createScopedStateStore(storeId, createDefaultState)`) is the in-memory store
basis for runtime-only UI state. Buckets live on `globalThis`, so every bundle of the page shares them.

- `storeId` separates store families; `scopeKey` separates instances inside one family (an empty key is
  `default`).
- The store offers `useStore`, `useStoreSelector`, `subscribe`, `getSnapshot`, `getHydrationSnapshot`,
  `patch`, `replace`, `reset`, and `deleteScope`, each by `scopeKey`.
- State is transient and shared only within the current JS runtime. It is not persistence and not a
  source of truth for server data.
- Feature code owns the domain logic; the store provides only the state mechanism.

## Plugin-state facade

`plugin-state-store.ts` is the public entry, exported as `@phis/ui/state`:

```ts
const store = createPhiPluginStateStore("@phis/example", (scopeKey) => ({
  scopeKey,
  selectedId: null,
}));

const state = store.useStore("default");
```

Its `storeId` defaults to `@phis/ui/plugin-state/<pluginKey>`. `history-store.ts` builds undo/redo history
on the same facade.

## Consumers

Builder workspace, navigation, plugin-meta, and demand-controller stores
(`plugins/runtime-modules/builder/*-store.ts`), the workspace catalog store, and the media image preview
store.
