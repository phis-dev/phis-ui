# State

This directory contains the shared transient UI state primitives for `@phis/ui`.

## Scoped state store

`components/state/scoped-state-store.ts` is the common in-memory store basis for runtime-only UI state.

The contract is intentionally small:

- `useStore(scopeKey)`
- `getSnapshot(scopeKey)`
- `patch(scopeKey, updater)`
- `replace(scopeKey, nextState)`
- `reset(scopeKey)`
- `deleteScope(scopeKey)`

Rules:

- `storeId` separates store families.
- `scopeKey` separates instances inside one family.
- State is transient and shared only within the current JS runtime.
- The store must not be treated as persistence or as a server-source-of-truth.
- Feature wrappers own the domain logic; the scoped store only provides the state mechanism.

## Public plugin-state facade

`components/state/plugin-state-store.ts` is the public first-class facade for shared plugin/runtime state.

- it wraps `scoped-state-store` internally
- it keeps the public contract small and stable
- it is the preferred entry point for widgets or plugins that need a shared transient scope

Example:

```ts
const store = createPhiPluginStateStore("@phis/example", (scopeKey) => ({
  scopeKey,
  selectedId: null,
}));

const state = store.useStore("default");
```

## Current consumers

- builder workspace state
- builder region drafts
- media preview state, including the dedicated `searchQuery` slice used by the media preview toolbar
- other widget-local runtime state slices that need a shared in-memory bucket
