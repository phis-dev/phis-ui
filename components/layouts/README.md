# Layouts

This directory implements the canonical Layout contract defined in [`LAYOUTING.md`](../../LAYOUTING.md).

## Implementation rules

- One topology has one plugin, parser, serializer, renderer, Builder metadata entry, and namespaced
  type key: `<plugin-key>/<layout-type>`.
- `PhiBaseLayout` owns shared renderable-block behavior and common visual config.
- Family renderers own topology and explicit slots. They must not introduce a second generic wrapper
  merely to apply padding, background, border, radius, shadow, or effect.
- Shared visual fields are available to every Layout and use neutral canonical defaults.
- Optional creation presets are resolved by the node factory and materialized into ordinary config;
  no preset identity reaches persistence or rendering.
- Runtime, preview, and authoring use the same slot definitions and parsed config.
- Root and nested Layouts share identity, signaling, sizing, and Inspector behavior.
- Grid slots use the canonical 24-unit responsive `span` plus logical-inline-start `offset` placement
  from `LAYOUTING.md`. The Grid resolves `compact`, `medium`, and `wide` from its own inline size and
  never derives placement from child Widgets or a browser-viewport media query.

## Public child contract

Layouts consume ordered `slots`, declared slot metadata, and the shared slot-size policy. A slot owns
accepted child kinds, multiplicity, anchor defaults, and responsive sizing. Free-form `children` is
not the public CMS placement contract.

For title-bearing families such as `PhiCollapsibleLayout`, the title belongs to the owning Layout slot.
It is not derived from the child label and does not move with child DnD. Empty live panels may be omitted
while their configured titles remain persisted for later reuse.

## Regions

`PhiStructureRegionLayout` and `PhiPageRegionLayout` are Builder/preview adapters for Region-owned
composition. Regions remain placement containers and may carry their own padding and chrome config;
they are not alternate Layout kinds.

## Styling

Use Ant Design tokens for generic visual values and the global Phi resolvers for semantic effects and
shadows. Persist only semantic ids and explicit operator overrides. Family plugins may expose extra
visual fields only when those fields are genuinely tied to their topology.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening these rules requires explicit prior operator
approval after the exact gap and affected ABI have been presented. They must not be bypassed through a
parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility contract. If they
cannot express a requirement, implementation stops and asks the operator first.
