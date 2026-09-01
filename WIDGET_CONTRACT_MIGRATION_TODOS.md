# Widget contract migration findings

This file contains only open or explicitly deferred work. Completed migration history lives in
[WIDGET_CONTRACT_MIGRATION_COMPLETED.md](./WIDGET_CONTRACT_MIGRATION_COMPLETED.md).

Binding contracts are documented in `AGENTS.md`, `README.md`, `BUILDER.md`, the component-family
READMEs, and the shared TypeScript types. Do not duplicate or widen those contracts here. Contract
extensions and new design decisions require operator approval before implementation.

## P0 - Add the App-side Media Space selector

The Folder migration, group claims, active Space context, Collection View retention, and delivery
projection are implemented and archived in
[WIDGET_CONTRACT_MIGRATION_COMPLETED.md](./WIDGET_CONTRACT_MIGRATION_COMPLETED.md#group-aware-media-spaces-and-folders);
the contract regressions are archived in
[Media Space contract regressions](./WIDGET_CONTRACT_MIGRATION_COMPLETED.md#media-space-contract-regressions).

- Add the App-side Space selector once `phi-server` exposes its authorized Space result. The active Space
  already reaches the Provider and Binding context, but the server currently reports only the Site Space,
  so the selector has no source. Builder, Editor, Picker, Inspector, and CMS Asset references stay pinned
  to the Site Space; Widget config and preset params must still never persist or claim ownership.
- The selector is the first surface that will name a Space in a request. Extend
  `scripts/validate-media-space-contracts.ts` with it: today that script asserts the opposite -- that the
  Collection data source is parameterless and the query surface carries no Space field -- because the
  server decides the Space alone. Both halves must be restated together, or the selector will look like
  a regression.

## P2 - Collapsible Layout open-state emit capability

The Collapsible Layout listens to open/active-slot signals but never emits its open state. A
symmetric openChange emit would let other blocks react to panel toggles. No current consumer:
the Settings shell's per-panel Save buttons are the operator-accepted final v1 state (decided
2026-08-19), so this is a generic-capability gap only, not a Settings prerequisite.

## P2 - Generic float-button Widget

Operator-requested future Widget: a generic float-button Widget (antd FloatButton behind a proper
Control, config-driven placement/icon/badge, signal-emitting activation like the button Widget).
No consumer is blocked on it today; build it with the Control layer, never with direct antd usage.

## P1 - Verify Region and Layout Background motion in production

`browser-test/scripts/check-motion-runtime.mjs` covers the modes on the local Public route and exits
non-zero on a failure. It asserts the invariant the transforms exist to serve rather than the transforms
themselves: **the drawn image always covers the host box.** The layer bleeds beyond the host only as far
as the original has surplus material, so no scroll position and no viewport size may expose a gap. That
is checked at three scroll positions and two viewport sizes, plus:

- Multiple visible instances at once, in more than one mode, including a Layout Background nested inside
  a Region shell.
- Clipping: every host clips its layer.
- Hydration: the host is server-rendered and the client reports no mismatch.
- Reduced motion: no layer is displaced and every layer collapses back onto its host.
- Off-screen and back: coverage holds again after returning to the top.

The positive control for lazy loading stays in `check-motion-chunk.mjs`: the Public route declares Hero
motion and requests the motion chunk. Re-running the archived negative half needs an Area whose shell has
no motion, because the shared Public shell declares it on every route.

Parallax is covered as of 2026-08-21. It was not before: of the three motion hosts on `/en`, two --
the parallax root node inside `header_main` and the `fixed` one inside `footer_main` -- pointed at Asset
`23`, which does not exist (the Site holds Assets 1-13), so `/api/site/media/23/content` answered 404 and
both layers correctly stayed in their static host-covering form. The Builder gives a Region's root node
no chrome of its own, and the Region inspector edits the Region Background rather than the root node's,
so both were repointed at Asset 5 through the Builder's own save body, captured from the Save button and
replayed with only `assetId`, `focalRect`, and the parallax direction changed
(`browser-test/scripts/repoint-motion-assets.mjs`). All three hosts now activate, and the header runs
`parallax` with `direction: "reverse"`.

That surfaced one real gap in the check itself: a `fixed` layer is the viewport, so a host reaching past
the fold can never be covered by it below the fold -- and there is nothing to cover there, because that
part is off screen and the layer follows as soon as it is scrolled into view. The 55px header host never
crossed the fold, so the assertion had never been asked the question. A `fixed` layer is now held to the
visible part of its host; every other mode is still held to the whole box.

The sticky and Hero cases are covered as of 2026-08-21, and covering them found a real defect. A Region
comes to rest by sticking an ANCESTOR of the motion host -- the host itself stays `absolute` -- but
`viewportAnchored` was derived from the host's own computed position. It was therefore false for every
authored sticky Region, so the anchored branch, which drives the layer from scroll progress, never ran.
Once such a Region parked, its distance from the viewport centre stopped changing and its parallax froze
mid-page. The flag now comes from an ancestor walk (`isPhiMotionHostViewportAnchored`), pinned in
`scripts/validate-image-presentation-contracts.ts`.

The fixture authors both shapes on one route so the assertion has a control: `header_bottom` is sticky
with `parallax` at `direction: "reverse"`, the Hero is not
(`browser-test/scripts/author-hero-motion.mjs`). Measured at 1280x620, the anchored layer's travel while
its host sits still at the top of the viewport:

| scroll | 120 | 160 | 200 | 250 | 300 | 400 | 700 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| before | -56 | -56 | -56 | -56 | -56 | -56 | -56 |
| after | -24 | -32 | -40 | -50 | -60 | -68 | -68 |

The last two readings are the bleed clamp, not a freeze: an anchored layer travels on total scroll rather
than on a viewport-bounded distance, so it reaches the surplus the original actually has and stops there.
That dead end is now an authoring choice rather than the only behaviour. `PhiBackgroundMotion` carries a
`travel` field, approved on 2026-08-21:

- `rate` -- what every Background authored before the field existed means, and the default. `strength` is
  a speed: pixels of layer travel per pixel of progress, cut off once the original runs out of surplus.
  Constant across pages, but it can dead-end.
- `range` -- `strength` is a proportion. The whole progress the effect is live for is laid onto the
  surplus that exists, so it never dead-ends. The cost is that speed then depends on how long the page
  is, and it has to be re-measured when content or viewport changes. Its default is `1`, because the rate
  default of `0.2` would read as almost no motion when it means a share rather than a speed.

Nothing converts between the two numbers, and nothing should: that would need the viewport, the host box,
and how much material the original has beyond the crop, none of which the Control or the parser can see.
So each travel mode keeps its own dial in the Control -- switch away, adjust, switch back, and the value
you set is still there -- and each takes its starting value from the contract rather than from the
Control.

Progress means the same thing in both, and is measured differently only because the two host kinds live
differently: an anchored host is alive for the whole scroll, a travelling one for its own crossing of the
viewport. `readMotionScrollRange` mirrors `readMotionScrollOffset` container for container, so a
proportion is taken against the distance the offset is actually read from.

The fixture puts one of each on the same route -- its own sticky Region on `range`, the shell header on
`rate`, both anchored -- so the difference is measured rather than asserted. Layer travel down the page:

| scroll | 120 | 200 | 300 | 400 | 700 | 1184 |
| --- | --- | --- | --- | --- | --- | --- |
| `rate` | -24 | -40 | -60 | -68 | -68 | -68 |
| `range` | -45 | -75 | -112 | -149 | -261 | -442 |

Covering that found one more gap in the check, the same one as before taken a step further: a host pushed
entirely below the fold intersects the viewport in nothing, so a `fixed` layer has nothing to cover there
and the question is not meaningful. Only a route long enough to push a motion host right out of view ever
asks it.

A scroll container other than the document is covered as of 2026-08-21, and covering it found two more
defects. The only such container the renderer authors is a `fullHeight` Sider, and it puts
`overflowY: auto` on the very shell that hosts the motion -- so the host does not sit inside a scroller,
it IS one. Nothing on any route had that shape before, which is why the container walk had never been
observed. The fixture now authors it: `sider_right` is `fullHeight` at 420x200 with a column of filler
widgets past its own height (`browser-test/scripts/author-sider-scroll-motion.mjs`). The box is short and
wide on purpose -- a full-height Sider column is 0.42 against a 4:3 original, so its focal cover crop
bleeds sideways only and a vertical parallax would have nothing to travel through.

- **The layer rode the scrolled content out of its host.** It is absolutely positioned, so the host is
  its containing block and it moves with what the host scrolls -- while a static CSS background stays on
  the element. At `scrollTop: 800` the layer sat 857px above the box it was supposed to fill. The
  clipping wrapper is now put back on the visible box each frame, which fixes every mode at once because
  all of them measure from it.
- **The container's scroll drove nothing.** `readMotionScrollOffset` and `readMotionScrollRange` started
  their walk at `host.parentElement`, so a host that is itself the scroller contributed neither offset
  nor range -- the same off-by-one node as the sticky defect above, one step earlier in the chain. A
  reader who never touches the document scrollbar saw a frozen effect.

Both now come from `collectPhiMotionScrollContainers`, resolved once at registration like
`viewportAnchored` rather than re-walked every frame, and it counts only elements whose `overflow-y` is
`auto` or `scroll`: `visible` reports a `scrollHeight` past its box whenever content overflows, and
counting that would hand every oversized host a journey it never travels. Measured at 1280x620 with the
document held at 0, the Sider on `range` at full strength:

| container scrollTop | 0 | 150 | 400 | 800 |
| --- | --- | --- | --- | --- |
| layer travel | 0 | 5 | 13 | 26 |
| layer top relative to host | -57 | -52 | -44 | -31 |
| before, layer top relative to host | -57 | -207 | -457 | -857 |

The Sider is authored `range` rather than `rate` for a reason worth keeping: it only comes to rest
halfway down the page, and a rate always reaches its own cap after the same ~410px of scroll regardless
of strength, because the cap is proportional to it. It would have been spent before the host parked.
Fitted travel also gives the container's own scroll a share of the range, not just of the offset.

Covering it needed one correction in the check itself: `inspect` measured the clipping wrapper as the
host box. The two sit on top of each other until the host scrolls its own content -- at which point the
wrapper rides that content along with the layer, and comparing them reports coverage that is not there.
It now measures the Region.

Undo/Redo over a motion edit is covered as of 2026-08-22 by
`browser-test/scripts/check-motion-history.mjs`, which edits through the real Inspector and unwinds
through the real toolbar. The edit itself survives the round trip whole -- mode, strength and travel all
come back on redo, because a motion edit travels the same inspector action as any other Region patch.

What did not hold was granularity. The strength slider emits on `onChange`, so every 0.05 stop it passes
reached the history store on its own: a single drag left 11 entries behind, out of a history that holds
50, and unwinding one movement took 11 undos. The store now collapses consecutive records that carry the
same `coalesceKey` -- the node and the field being edited -- into one entry, keeping the gesture's
starting point and its latest value. A first attempt bounded this by time, but a slider dragged slowly
outlives any window worth setting; what ends a gesture is an event instead: a different field, an undo,
or the Inspector being put away, whose standing value is the one the entry keeps
(`phiBuilderHistory.endGesture()`). Measured after: one drag, one undo. This fixes every slider in the
Inspector at once -- padding, opacity and border radius all had the same shape.

Two defects surfaced beside it, neither about motion, both fixed on 2026-08-22:

- **The Undo and Redo buttons never went inactive.** Delivery requires the receiver's address to be
  registered in the signal's own scope, and a toolbar button is addressed as a subcontrol. The scope for
  that registration came from the signal identity context, which is populated inside an Overlay and
  nowhere else -- so every toolbar outside one left its buttons unregistered and each `enabled` signal
  was dropped before it reached a listener. Both buttons stayed clickable on an empty history and did
  nothing when pressed, which misleads rather than breaks. The scope now comes from the listen routes
  that address the button, with the identity scope standing in only where no route names one. Measured:
  fresh page both inactive, after an edit undo only, after undoing redo only.
- **A stale label set emptied a control's labels.** The Travel segmented rendered with no label and two
  blank options until the label-set module happened to reload. `LABEL_SET_CACHE` was keyed by locale and
  set key alone, so a process that cached a set before a label was added kept serving the old object and
  the new keys read as `undefined`. The key now carries a fingerprint of the labels themselves. A deploy
  restarts the process and would never have shown it, which is the point: the key described where a set
  came from rather than what was in it. Verified both ways -- with the fingerprint a changed label takes
  effect on the next request; without it the old text survives any number of reloads.

## P1 - Decide whether the Media Inspector should hand over to the generated variant

The rest of the image-variant pass is done; what remains is one product decision.

`simulateVariantCrop` now has a producer. The Media Inspector is the surface it exists for: it previews a
variant while the focal rectangle is still being authored, so the stored variant carries the previous
framing and the preview has to draw the original and reproduce the crop. It did that with its own call
into the focal helpers -- the second framing rule
`scripts/validate-image-presentation-contracts.ts` exists to prevent -- and now routes through
`resolvePhiImagePresentation`. That surfaced a resolver defect on the way: a `contain` variant
letterboxes rather than crops, so simulating one produced a crop of an image that will never be cropped.
The resolver answers with no crop style and the variant's own fit there.

The open question: **the Inspector simulates permanently.** It never shows the bytes the server actually
generated, so an author cannot see the real variant -- only Phi's reproduction of it. Handing over after
the save needs a source for "this focal edit is still unsaved", which no component owns today. Either the
Inspector keeps simulating and the contract says so, or the dirty state gets an owner and the preview
switches to the invalidated variant once the save lands.

Verified in the browser on 2026-08-20 (`browser-test/scripts/check-variant-preview.mjs`,
`check-inspector-simulation.mjs`):

- Preview (`/en?revision=…`) and the Theme's Live preview (`/en?reviewKind=theme&…`) deliver every shared
  Asset from byte-identical URLs, including `/api/site/media/5/variants/2?v=4&r=1`. The Asset SET differs
  because Preview renders a draft revision, which is expected; the delivery URL for a shared Asset may
  not.
- No surface upscales or stretches: each background is drawn at its source's own aspect and below its own
  pixel count.
- The Inspector previews the original for every variant, places a `cover` variant with the simulated crop,
  and letterboxes a `contain` variant.

## P2 - Add the separate Groups administration package

- Publish `@phis/groups` as a separate `phis-cli`-installable Module package tree. Keep all Groups
  Admin/App pages, presets, Providers, Controllers, Forms, Tables/Trees/Collections, path injections,
  labels, and signals out of `@phis/ui`.
- Bind the Module only to Core `@phis/server/groups:v1`. Render local and future Directory-managed
  users, groups, fields, and memberships through the same provider-neutral authority/provenance and
  per-operation capability projection; never branch on LDAP, SCIM, Entra, or another package id.
- Keep provider connection setup, protocol clients, synchronization, writeback, secrets, and health in
  physical `*-server` Add-ons. The Module may present server-returned diagnostics and capabilities but
  must not query a Directory directly or ship a provider SDK to a browser.
- Disabling or uninstalling the Module removes its UI contributions only. Core identities, group access
  policies, membership assertions, Media Spaces, and external Directory bindings remain intact and fail
  according to the server provider lifecycle.

## P2 - Add parameterized Region shape dividers

- Define one canonical Region-edge/shape-divider contract for independently optional top and bottom decorations.
  Keep it separate from Background, Effect, Layout, Widget, and content-slot contracts; render it centrally from
  the Region container so Server/live, preview, and Builder use the same path.
- Scope the initial Region contract to the Page-owned content boundaries that have a clear visual adjacency:
  `header_bottom.bottom`, `hero.top`, `hero.bottom`, and `footer_top.top`. Do not expose Region dividers on
  `header_top`, `header_main`, either Sider, `content`, `footer_main`, or `footer_bottom`. Decorative boundaries
  between sections inside `content` are a possible future Layout-divider concern, not another Region path.
- Start with a closed built-in shape catalog such as wave, layered wave, zigzag, curve, and slope. Persist only
  validated shape ids and bounded parameters such as height, frequency, amplitude, phase, flip/invert, canonical
  Phi fill, opacity, layer count, and content stacking. Do not persist arbitrary SVG markup or raw path data.
- Render static dividers as decorative, responsive inline SVG with normalized view boxes, no pointer events, no
  accessibility semantics, and centrally owned edge overscan to prevent antialiasing seams. Keep the decoration
  out of Region layout metrics and make any required content clearance explicit rather than silently rewriting
  Region padding.
- Add an optional reduced-motion-safe animation mode for seamless layered waves. Prefer transform-only periodic
  drift of repeatable over-wide paths, with deterministic per-layer speed, direction, phase, and opacity derived
  from one bounded motion configuration. Reserve path morphing for an explicitly supported compatible-path mode;
  do not introduce frame-by-frame JavaScript path generation.
- Pause or omit animation when the divider is off screen, disable it for `prefers-reduced-motion`, and ensure a
  static Region does not fetch a divider-animation Client chunk. Authoring may load the complete shape preview
  catalog, while Public rendering receives only the active shape data.
- Keep `header_bottom` Page-owned while placing its bottom divider at the outside edge of the final visible Header
  stack; it must follow the shared Header-backdrop geometry without creating seams against `header_top` or
  `header_main`. Cover Hero/Content/Footer adjacency, sticky Headers, light/dark tokens, responsive geometry,
  hydration, and Undo/Redo in regressions.

## P2 - Add count-aware plural translation

- Extend the central translation and placeholder formatter with one explicit plural contract before Widgets
  add singular/plural branches locally. Locale-resolved Table footer templates currently reorder `%1`, `%2`,
  and subsequent scalar placeholders, but do not select a grammatical variant from a count.
- Keep plural selection in the shared translation path. Providers continue to return typed scalar counts and
  must never select locale-specific footer text.

## P2 - Add Theme Root Background and continuous Shell backdrops

- Implement the [Root Background and Shell Backdrop contract](./SHELL.md#root-background-and-shell-backdrop-layers):
  a site-owned light/dark Theme Root Background plus Area-owned shared Header and Sider backdrop layers.
- Add `/builder/theme` authoring for the Root Background and selectable Shell-backdrop scaffolds in
  `/builder/shells`. Do not model either concern as a Page, Content Region, hidden Region slot, Widget, or Overlay.
- Compose the Header backdrop only in the final `PhiCmsShell`, where Area-owned `header_top`/`header_main` and
  Page-owned `header_bottom` are all available. Preserve Page ownership and adapt the common visible backdrop
  geometry when sticky Header Regions enter or leave the viewport.
- Reuse the canonical Background, Effect, and Shadow contracts. Render a Header Shadow once at the outer lower
  edge of the complete currently visible Header stack and a Sider Shadow once at its outer logical inline edge;
  make both follow sticky/mounted/collapsed geometry and RTL without requiring a Background or Effect.
- Migrate first-party presets that intend continuous glass or one composite Shadow from separate Header/Sider
  Region effects/Shadows to the appropriate Shell backdrop, while retaining deliberately configured additive
  Region paint, effects, and Shadows.
- Cover live, preview, and editor rendering; light/dark switching; Page-owned `header_bottom`; scrolling and
  sticky transitions; and full-height, embedded, and collapsed Sider variants. Assert that Header and Sider
  backdrop filters do not overlap, composite Shadows create no inter-Region seams, and the Theme fallback remains
  `colorBgLayout`.

## P2 - Add a user-profile Tooltip preference

- Add a user-specific preference in the User Space/Profile for enabling or disabling optional Tooltips.
- Resolve the preference centrally for the active user and apply it through the canonical Phi Control adapters;
  individual Widgets and Modules must not introduce parallel Tooltip switches or call Ant Design directly.
- Treat Ant Design `ConfigProvider.tooltip.trigger` only as an adapter-level safeguard. It has no native
  `enabled`/`disabled` property, can be overridden by an explicit component trigger, and does not cover native
  HTML titles, controlled Tooltips, Popovers, or Popconfirms.
- Keep essential validation, warning, confirmation, and accessibility text available when optional hover/focus
  Tooltips are disabled.

## P2 - Normalize Preset Content roots to vertical Flex Layouts

- Audit first-party Page presets and use a vertical Flex Layout as the standard Content Region composition
  root. Presets should express spacing, padding, and child ordering through the shared Layout contract instead
  of retaining legacy Content Layout paths.
- Keep a different root Layout only when the Page has an explicit semantic layout requirement; do not preserve
  parallel renderer paths merely for historical preset structure.

## P2 - Add full Overlay authoring to Builder

- Implement the `OVERLAYS.md` authoring boundary after the runtime and preset ABI is stable: separate Area/Page
  Overlay lists, forced-open editor presentation, generic Modal/Drawer Inspector, root Layout picker, tree canvas,
  DnD, Undo/Redo, preview transport, and publish validation.
- Keep every Overlay outside normal Region/Layout-slot flow. Cross-container moves are allowed only inside the
  same Area or Page ownership scope and must remain one atomic history transaction.
- Migrate Builder workspace Drawer hosts only after they can be represented by the same Overlay tree; do not add
  another Builder-only persisted dialog model in the meantime.

## P2 before horizontal Skeleton scaling - Move transient Builder previews to shared storage

- The current Builder preview handoff stores each materialized snapshot in a process-local `globalThis` Map and
  passes only its opaque id to the following server render. This is intentionally not CMS Draft persistence.
- This contract is valid while the Skeleton runs as exactly one frontend Node.js process. `phi-server` may be
  load-balanced independently because it does not own the current snapshot Map.
- Before enabling multiple Skeleton workers, instances, serverless handlers, or rolling request handoff, replace
  the Map with a shared TTL-backed transient store in
  `phi-server` or equivalent shared infrastructure. Bind every entry to the Site and authorized Builder session,
  preserve the short-lived opaque-id transport, and reject cross-session reads.
- Process restarts currently discard in-flight preview snapshots by design. Sticky sessions may reduce
  cross-instance misses but do not satisfy the target contract across restarts or deployments.
- The stable `/builder/api/[[...path]]` Skeleton route remains a transport-only wrapper. Storage, dispatch,
  validation, authorization, and cleanup belong to shared/backend code so new Builder endpoints do not require a
  Skeleton route update.

## P2 - Add repeatable module-graph and generated-output checks

- Keep the 2026-07-18 cold Production browser baseline reproducible: Public `/en` requested 56 scripts,
  1,021,675 encoded bytes, and 3,230,968 decoded bytes; Builder `/builder/pages` requested 66 scripts,
  1,072,042 encoded bytes, and 3,446,750 decoded bytes. Builder-only route chunks were requested only
  by Builder. Development remains intentionally much broader under Turbopack/HMR (79 versus 100 scripts,
  with lazy candidates present in fetched development chunks), so Dev source paths must not be treated
  as Production payload evidence.
- Keep the 2026-07-26 post-P1 Production baseline as the current regression reference: Public `/en` requested
  38 initial scripts, 700,732 transferred bytes, and 2,147,655 decoded bytes; authenticated Builder Pages requested
  51 initial scripts, 890,434 transferred bytes, and 2,812,133 decoded bytes.
- Keep the 2026-07-29 post-Collection-provider baseline as the current regression reference: Public `/en`
  requested 41 initial scripts, 705,618 transferred bytes, and 2,154,259 decoded bytes; authenticated Builder
  Pages requested 57 initial scripts, 918,979 transferred bytes, and 2,896,153 decoded bytes; authenticated
  Admin Users requested 41 initial scripts, 707,426 transferred bytes, and 2,166,389 decoded bytes.
- Keep the 2026-07-30 post-Data-Provider-Client-manifest baseline as the current Public reference: Public
  `/en` requested 41 initial scripts, 698,588 transferred bytes, and 2,130,418 decoded bytes. Authenticated
  Builder Media requested 57 initial scripts, 912,609 transferred bytes, and 2,871,386 decoded bytes plus
  28 demand-loaded scripts, 76,949 transferred bytes, and 201,799 decoded bytes.
- Keep the 2026-08-17 post-reference baseline as the current Public reference: Public `/en` requested 44 initial
  scripts, 717,855 transferred bytes, and 2,199,745 decoded bytes, plus 18 late scripts, 94,244 transferred
  bytes, and 249,264 decoded bytes. The delta against 2026-07-30 is +3 initial scripts and +19,267 transferred
  bytes and covers the stable Page/Asset reference work, the authoring pickers, and the shared Background-motion
  boundary. Authenticated Builder and Admin routes were not recaptured in this run.
- Keep `pnpm audit:graph` in package verification once its output budget and failure thresholds are frozen.
- Add a generated-output budget report for the skeleton's development build. Separate Turbopack cache,
  source maps, server chunks, and browser chunks; `.next` was about 619 MB during this audit, but that
  number alone is not a route-performance metric.
- Keep `noUnusedLocals` and `noUnusedParameters` enabled and include all TypeScript/TSX source files in
  the package typecheck.

## P2 - Optional visual Form Builder

Descriptor adoption, module-owned Preset Forms, and the runtime contract are complete through the
visual Form Builder boundary. Platform Core owns the versioned descriptor parser, generic renderer,
base providers, label resolution, and demand-driven runtime controller. Domain modules own their
Preset Forms, handlers, and additional providers. The visual Form Builder is not required to ship or
execute a module-owned Form and is intentionally deferred to P2.

Required work:

- Define the visual Form Builder canvas and its draft/publish persistence protocol before adding
  persistence capabilities to `controller:@phis/ui/form-builder:default`.
- Define canvas selection, field insertion/reordering, responsive placement editing, preview state,
  undo/redo, and the atomic Draft/Publish request shape together before implementation.
- Keep visible Inspector setting forms under the Builder controller; the visual Form Builder edits Form
  definitions through its own controller and never reuses Inspector or public runtime state.
- Reuse the existing revision table contract: status `0` is the single Working Draft, `1` is the single
  Published revision, and `2` is an archived Published revision per Site/Form. Add APIs and optimistic
  concurrency when authoring is implemented; do not add another Form table or alter preset identity.

### Input-family gate before Form Builder

The 2026-07-31 input-family audit and migration are complete. The retained dependency direction is:

```text
CMS Widget (config, local/controlled state, runtime signals, provider resolution)
└── Phi *Control (presentation and Ant Design adaptation only)
    └── Ant Design primitive

Form field provider / Inspector
└── the same Phi *Control
```

The complete reusable input family, generic option-provider ABI, dedicated CMS widgets, Inspector
Controls, Form providers, package export, and automated boundary check now follow this direction.
Pagination, Upload, Color, geometry editors, and domain compound editors intentionally keep their own
value/lifecycle contracts. This gate no longer blocks the visual Form Builder.

## P2 - Complete optional control badge adoption only from real use cases

The shared badge contract and button/toolbar implementation are complete. Do not spread badge config to
every control by default.

- Evaluate basket, support inbox, and similar domain buttons individually.
- Migrate only when the behavior fits the generic button/subcontrol badge receiver contract without
  losing domain semantics.

## P2 - Decide whether public JSON schemas need machine-readable definitions

All public JSON signal routes now require namespaced `valueSchema` identifiers and known shared payloads
use centralized schema IDs. Exact shapes are still enforced by TypeScript readers/emitters rather than a
machine-readable schema registry.

- Add a runtime schema registry only after the controller/widget schema inventory stabilizes.
- Any such registry is a contract extension and requires operator approval before implementation.

## P2 - Add CMS backup/restore and portable transfer orchestration

- Add exact backup/restore that preserves canonical CMS instance ids and DB sequences.
- Add portable export/import that creates a target Draft, allocates target ids centrally, and atomically remaps
  structural, signal-route, controller/form, and module-owned references through declared module hooks.
- Define the transfer scope before implementation, including whether media binaries, Site configuration, and
  content records travel with the portable archive.

## P2 - Keep `scopeKey` separate from signal routing

Most remaining `scopeKey` use is legitimate transient provider/store identity in media, search,
collection, navigation, and options-provider code.

- Continue auditing new uses.
- Never derive a signal scope or receiver from `scopeKey`.
- Options-provider `scopeKey` remains data-source/provider identity only.
