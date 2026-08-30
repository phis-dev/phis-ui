# Layout contract

This document defines the v1 contract for CMS Regions, Layouts, and slots.

## Core model

The render tree has three structural levels:

1. A Region is an Area- or Page-owned placement container.
2. A Layout is a persisted CMS node that owns child topology and optional visual treatment.
3. A slot is a typed child position owned by its Layout.

There is exactly one Layout node kind, one Layout plugin registration, and one renderer path per
topology. Visual treatment is ordinary Layout config; it never creates another node kind, registry
entry, type-key suffix, renderer, parser, serializer, Builder category, or signal receiver family.

## Identity and type keys

- A Layout type key is `<plugin-key>/<layout-type>`.
- A Layout instance has one canonical `PhiCmsInstanceId`.
- Layout receivers use `cms:<instanceId>` and the mounted Area/Page scope.
- Persisted v1 data using a third presentation segment is invalid. There is no compatibility reader.
- A Region points to at most one root Layout. Nested Layouts use the same contract as root Layouts.

## Layout config

Every Layout combines two independent concerns in one config object:

- topology and geometry, such as direction, gap, columns, widths, wrapping, alignment, and slot policy;
- visual treatment, such as padding, background, border, radius, shadow, and effect.

The shared fields are:

- `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`
- `background`
- `border`
- `borderRadius`
- `shadow`
- `effect`
- the shared renderable-block geometry, visibility, access, and transition fields

Layout-family plugins add only topology-specific or explicitly family-specific fields. A family must
not duplicate shared parsing or serialization.

Canonical defaults are neutral: no padding, no visible background, no border, no radius, no shadow,
and no effect. A first-party creation preset may provide an initial visible-container configuration,
but creation presets are input to the node factory only. Their values are materialized as normal
Layout config and the preset name is never persisted or interpreted at render time.

Effects and standard shadows are selected by semantic ids and resolved globally. Presets store the
chosen id, not CSS implementations. A custom shadow is the sole exception and stores its explicit
value through the documented custom-shadow shape.

### Background motion

The canonical structured Background config may attach motion to its own image base:

```ts
motion?: {
  mode: "static" | "fixed" | "parallax";
  strength?: number;
  direction?: "natural" | "reverse";
}
```

`static` is the default. In v1, `fixed` and `parallax` are valid only when the same Background config owns an
image base; neither mode may implicitly read, inherit, or reuse the Theme Root image or another ancestor's
Background. `strength` is normalized to `0..1` and defaults to the shared Phi Parallax strength. Motion follows
the logical block/scroll axis in v1. The runtime derives required image overscan and clipping; those mechanics
are not persisted presentation fields.

Background motion is visual treatment, not Layout topology and not a semantic Effect. It therefore does not
create a `ParallaxLayout`, another Layout plugin/type, extra slot depth, or a separate parser/renderer family.
Every normal Layout topology may opt into it through its shared Background config, and Region Backgrounds use
the identical value contract. Layout children and Region root Layouts remain in normal flow above the moving
Background layer.

The motion implementation is one shared, UI-library-independent Background renderer. It resolves movement from
the owning Region/Layout box relative to the active scroll viewport, clips inside that owner, uses a central
scroll/frame coordinator rather than React state or one scroll listener per instance, and stops work for
off-screen instances. `prefers-reduced-motion` renders the same image statically. SSR, no-motion Backgrounds,
and the Layout/Region child tree remain server-renderable; only an actively configured moving Background may
mount the small Client enhancement.

Theme Root and Shell-backdrop Backgrounds use this same canonical config when their deferred renderer work is
implemented; they must not create alternate motion fields. Their host-specific coordinate/clip geometry belongs
to those existing Root/Shell contracts.

## Regions

Regions own shell and page placement rather than child topology. They may configure:

- visibility, enabled state, viewport behavior, size bounds, opacity, and z-index;
- sticky/full-height/collapse behavior where the Region family supports it;
- background, border, shadow, and semantic effect;
- `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, and `paddingLeft`.

Region padding is applied to the Region root and is independent of root-Layout padding. It is stored
flat in the Region config, parsed through the shared padding value rules, and edited as a Region
property. The Builder must not synthesize a Layout solely to represent Region padding.

## Slots

- A Layout plugin declares its slots and their stable semantic keys.
- The ordered runtime representation uses `slotIndex`; authoring maps it to the declared slot key.
- A slot declares accepted child kinds, multiplicity, size policy, and optional default anchor.
- Layouts receive `slots` as the primary child API; free-form children are not the public placement API.
- Empty, occupied, preview, and edit rendering use the same slot topology.
- Slot state belongs to the owning Layout receiver. `slot:` is not a public v1 receiver family.
- A title-bearing Layout family stores slot titles as Layout presentation config keyed by its declared
  slot order. A child Widget/Layout label is not a fallback source for that title.
- Moving, replacing, or deleting a child does not move, rewrite, or delete either the source or target
  slot title. Authoring exposes title editing as an explicit Layout operation.
- A title-bearing live renderer may omit an empty slot panel without deleting its configured title;
  inserting a later child reuses that title until the operator changes it.
- The Collapsible Layout is capped at 12 slots (`PHI_CMS_COLLAPSIBLE_LAYOUT_MAX_SLOTS`), one child per
  slot. Compositions that need more panels — including Module Settings pages, whose sections become
  Collapsible panels — must split across Layouts or pages instead of exceeding the cap.

The standard size policies are `fill`, `hug`, `fill-inline`, `fill-block`, `fixed`, and `intrinsic`.
The parent slot policy is authoritative; child defaults cannot override it.

## Rendering and authoring

- Runtime, preview, and authoring resolve the same Layout plugin and parser.
- A Layout's configured visual treatment is rendered on the same root that owns its topology.
- Editor scaffolding is an authoring overlay and must not change persisted topology or runtime depth.
- Insert, select, drag, delete, and title controls operate on the Layout instance and its declared slots.
- The Inspector exposes topology fields and shared visual fields for every Layout.
- Regions expose their own geometry, padding, background (including image motion), border, shadow, and effect
  controls. Layout Background authoring exposes the same motion fields only when the selected Background owns
  an image.

## Sizing and nesting

- Layouts default to filling the available parent slot unless their plugin declares another policy.
- Layout depth counts actual Layout nodes only; visual config never adds depth.
- The Canvas, preview, and published runtime must derive sizing from the same declared policies.
- Responsive behavior belongs to the Layout that knows the actual slot geometry, not to a global
  viewport heuristic.

### Grid slot placement

`PhiGridLayout` owns one 24-unit logical grid. Every populated slot may declare presentation-only
placement with a responsive `span` and `offset`, using the shared `compact`, `medium`, and `wide`
profiles. `span` is an integer from `1` through `24`; `offset` is an integer from `0` through `23`,
defaults to `0`, and counts unused columns from the logical inline start. `offset + span` must not exceed
`24` in any profile. Responsive values use the shared smaller-to-larger cascade.

The effective profile is resolved from the Grid Layout's own available inline size and the same shared
Phi thresholds used by responsive Forms, never from the browser viewport. Runtime, preview, and Builder
must therefore resolve the same placement when the Grid is mounted in a Page, Modal, Drawer, Inspector,
or nested Layout slot. Slot source order remains the logical, focus, accessibility, and authoring order;
offset changes presentation only and must not reorder or synthesize slots.

Placement belongs to the owning Grid Layout config. A Grid must not inspect a child Widget type, Form
descriptor, Provider, Controller, field placement, or submitted values to infer it. Conversely, a child
Form must not inject Buttons into the Grid or expose its internal field grid as parent Layout slots.
External Form actions are ordinary Button Widgets in explicit Grid slots and use the normal Controller,
Form-signal, validation, and result lifecycle. A preset that aligns such a Button with a Form's control
column declares matching responsive values on both independent contracts; no Form-specific Layout family,
implicit action row, margin compensation, or ancestry detection is permitted.

### Stack slot mounting

`PhiStackLayout` declares `mountPolicy: "active" | "keep"`. `active` mounts only the selected slot and is
the default for ordinary content. `keep` mounts every populated slot with the Stack and hides every
inactive slot from layout, focus, pointer interaction, and the accessibility tree. It is required for
tabbed workflows whose Controls must retain draft state while another slot is active. The policy changes
only mounting; `activeSlotKey`, runtime slot signals, and persisted child topology remain unchanged.

The presentation option `slotTransition: "none" | "fade-over"` controls visual changes between active
slots and defaults to `none`. `fade-over` places the inert outgoing slot temporarily above the new
active slot and fades only that outgoing surface with the global Ant Design slow-motion tokens. The
new slot always remains in normal flow and therefore owns the Stack's natural size. Rapid changes
replace the current outgoing surface instead of queueing transitions; reduced-motion preferences and
Builder edit rendering use an immediate switch.

Stack signaling always uses the concrete runtime scope of the Layout instance. An Area-owned Overlay
Stack therefore emits and listens in Area scope, while a Page-owned Stack uses Page scope.

## Styling

- Generic component values use Ant Design tokens or their server-safe resolved equivalents.
- Persisted config contains semantic choices and explicit operator overrides, not copied theme values.
- `--phi-*` variables are reserved for Phi-specific structural or technical contracts.
- Presets select config values only; they must not redefine effects, shadows, or theme algorithms.

## Extension rules

A Layout plugin provides one topology under one type key and must use the common Layout contract.
Third-party code may add Layout families, fields, slots, and render policies, but may not reintroduce a
parallel presentation kind or compatibility suffix. Phi-owned modules must use the same registry,
factory, parser, renderer, Inspector, persistence, and signaling paths as third-party modules.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility
contract. If it cannot express a requirement, implementation stops and asks the operator first.
