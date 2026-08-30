# Helpers

This directory contains public runtime helper functions for `@phis/ui`.

## Scope

- `helpers/*` is public package surface.
- Helpers should be pure, narrowly scoped utility functions.
- Helpers may be shared by consuming sites and shared UI internals.
- Helpers must not contain backend adapter logic, hidden network fetches, or mutable singleton state.

## What belongs here

- flag and mask evaluation helpers
- area/access helpers
- value normalization helpers
- small data-shaping helpers that are not tied to React rendering

## What does not belong here

- site-config loading
- translation gateways
- raw `phi-server` API adapters
- widget registries
- React components

## Current contracts

- CMS visibility and area matching helpers belong here.
- Access helpers such as `resolveAreaFromPath()` and `canAccessPage()` belong here when they are runtime-safe and UI-consumable.
- If a helper becomes server-only, move it into a dedicated server namespace instead of keeping it in `helpers/*`.
