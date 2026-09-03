# @phis/ui

The normative translation-client contract for explicit source locales and structured external documents
lives in [TRANSLATIONS.md](./TRANSLATIONS.md).

## Purpose

`@phis/ui` provides reusable frontend building blocks for the Phi workspace. It owns shared shells, regions, widgets, forms, navigation, theme helpers, runtime constants, and selected server-only helpers. It does not own Next.js route registration, site branding, backend security state, or site-specific content.

Third-party authors should start with [THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md). It provides
the end-to-end package guide for Modules, Controllers, Widgets, Theme presets, Preset Forms, manifests,
Site composition, and verification.

The normative target v1 viewer-access, provider-role, and responsive-visibility ABI lives in
[ACCESS.md](./ACCESS.md).
The normative target v1 Auth Module, Auth UI provider, Account Widget, and Admin settings ABI lives in
[AUTHENTICATION.md](./AUTHENTICATION.md).
The normative target v1 Runtime Module structure and contribution ABI lives in
[MODULES.md](./MODULES.md).
The normative target v1 Table, Table Provider, static resource, tree-table, and Table signaling ABI
lives in [TABLES.md](./TABLES.md).
The normative target v1 Tree, Tree Provider, binding, editing, action, and DnD ABI lives in
[TREES.md](./TREES.md).
The normative target v1 visual Collection View, Collection Provider, self-contained tools, pagination,
and integrated tool-panel ABI lives in [COLLECTIONS.md](./COLLECTIONS.md).
The normative target v1 Area-/Page-owned Modal and Drawer Overlay ABI lives in
[OVERLAYS.md](./OVERLAYS.md).
The normative target v1 guided Tour, visual-anchor resolution, signaling, and user-progress ABI lives in
[TOURS.md](./TOURS.md).
The normative target v1 mutable Page path and structured Page/Asset reference ABI lives in
[REFERENCES.md](./REFERENCES.md).
The normative target v1 Settings container, Settings page shell, and Module configuration ABI lives in
[SETTINGS.md](./SETTINGS.md).
General Site groups, Media Spaces, folders, quotas, Storage Profiles, and protected Asset delivery are
server-owned by `phi-server/GROUPS_AND_STORAGE.md`; this package consumes that contract only through the
shared access snapshot and registered Asset Providers.
Provider-neutral user/group administration and future LDAP, Active Directory, SCIM, or Entra bindings
are server-owned by `phi-server/DIRECTORY_PROVIDERS.md`. The optional feature UI is the separate P2
package `@phis/groups`, not a `@phis/ui` Runtime Module.
The normative Next.js Site/Skeleton ownership and static entrypoint contract lives in
[NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md).

The package is intended as the reusable business-logic and UI composition layer for the workspace:

- check existing helpers, contracts, presets, and wrappers before adding new behavior
- prefer extending reusable shared contracts over introducing site-specific special cases
- do not add one-off logic unless it is explicitly requested and clearly reusable across consuming sites

### Contract governance

Changing, extending, replacing, reinterpreting, or widening any normative contract referenced or defined
in this document requires explicit prior operator approval after the exact gap and affected ABI have been
presented. No implementation task, adjacent approval, local type, Module path, Provider path, fallback,
compatibility branch, or other parallel contract may bypass that gate. If the active contracts cannot
express a requirement, implementation stops and asks the operator first.

## Development tooling

### Ant Design CLI

`@ant-design/cli` is pinned as a development dependency for Ant Design research. Agents should use it before guessing Ant Design APIs, migration behavior, best practices, or do-and-don't guidance.

Preferred commands:

- `pnpm exec antd info <Component> --format json` for props, defaults, version metadata, and deprecations
- `pnpm exec antd doc <Component>` for component documentation
- `pnpm exec antd demo <Component> [name]` for official demo source
- `pnpm exec antd token [Component]` for theme token research
- `pnpm exec antd semantic <Component>` for `classNames` / `styles` structure
- `pnpm exec antd lint <target>` and `pnpm exec antd doctor` for project-level checks

Use CLI findings as the local source of truth for Ant Design implementation decisions in this package, especially when reviewing API questions, deprecated props, SSR behavior, accessibility notes, or migration constraints.

## Architectural model

### Routing and composition

- Physical Next.js App Router registration stays in each consuming Site repository; reusable route,
  bridge, proxy, metadata, and per-Area Client-boundary behavior lives under the separate
  `@phis/ui/next/*` entrypoints.
- Consuming site repositories should stay thin wrappers for:
  - `app/[root]/layout.tsx`
  - `app/[root]/[[...path]]/page.tsx`
  - site-local proxy `route.ts` entrypoints when a thin bridge is unavoidable
- Site repositories should not host business logic that can already live in `@phis/ui`; wrappers and proxies should delegate, not re-implement.
- Those proxy entrypoints should delegate to shared gateway helpers rather than hardcode upstream target logic in the site repo.
- The preferred long-lived site bridge surface is a small fixed set of explicit route entrypoints, not a catch-all `api/v1/*` browser proxy.
- Admin log ingestion, parsing, and filtering should be served by `phi-server`; shared UI should only render and consume the resulting `/api/site/admin/logs` feed through the existing catch-all route surface.
- All CMS logic must live in `@phis/ui`.
  - CMS resolution
  - area and page fallback resolution
  - form registry resolution
  - submit dispatch resolution
  - shared CMS plugin contracts
  - shared fallback tree synthesis
  - shared runtime normalization
  - shared access-boundary logic
  - shared renderable-block plugin chrome fields such as `maxSize` and `shadow` are centralized and reused across layout and widget plugins; family plugins add only specialized fields
  - simple widget editor dimensions may reuse `PHI_WIDGET_DIMENSION_PLUGIN_FIELDS` for `width` and `height`, but runtime geometry should still normalize to `size`
- Site repositories should not reimplement CMS-specific branching or fallback behavior once the wrapper entrypoints have been wired up.
- Site repositories should not hardcode proxy target selection once the thin bridge entrypoint has been wired up.
- For standard CMS pages, the preferred site-owned entrypoint is a single root resolver:
  - `app/[root]/layout.tsx`
  - `app/[root]/[[...path]]/page.tsx`
- For page-owned shell slots that must stay navigation-reactive under a stable `[root]` layout, the preferred site-owned shape is explicit parallel-route wrappers:
  - `app/[root]/@headerBottom/[[...path]]/page.tsx`
  - `app/[root]/@hero/[[...path]]/page.tsx`
  - `app/[root]/@siderRight/[[...path]]/page.tsx`
  - `app/[root]/@footerTop/[[...path]]/page.tsx`
  - these wrappers stay transport-only and delegate to shared CMS slot rendering
- `root` should resolve to either:
  - a public locale such as `en`, `de`, `fr`, `es`
  - or a controlled special-area key such as `app`, `admin`, `builder`, `editor`, or `accounting`
- Special-area resolution should follow a stable contract:
  - `app` for authenticated non-staff users
  - `admin`, `builder`, `editor`, and `accounting` only for matching site-role users
- Canonical CMS Areas are exactly `public`, `app`, `admin`, `builder`, `editor`, and `accounting`.
- Authentication, commerce, and site-specific behavior are Modules rather than fixed Core Areas. The
  first-party Auth Module is eligible for `public`, `admin`, and `app`: authenticated Areas consume the
  Core-owned Site session without Auth, while the optional App projection owns account security and
  in-place reauthentication.
- Non-staff CMS areas `public` and `app` should fall back in this order:
  - own DB-backed shell instance
  - public DB-backed shell instance
  - area-appropriate code-owned shell preset
- If an area has no dedicated code-owned shell preset in `phis-ui`, it should fall back to the public shell preset on read.
- That fallback does not change persistence ownership: saving in an area must still create or update that area's own revision-backed shell state.
- Staff role to area mapping must follow this contract:
  - `Admin -> /admin`
  - `Developer -> /admin`
  - `Builder -> /builder`
  - `Author -> /editor`
  - `Publisher -> /editor`
  - `Supporter -> /app`
  - `Accountant -> /accounting`
- `builder` is the structural and design-authoring area.
- `editor` is the content and publishing area.
- `admin` is the shared control-plane host; contribution policies distinguish Admin-only surfaces
  from Developer tooling.
- Staff Areas remain role-selected; authenticated non-staff users resolve to `app`.
- Missing CMS pages should resolve to a normal `404`, not to a fallback shell guess.
- `app/[root]/layout.tsx` should stay a thin site-owned wrapper that calls shared CMS root rendering.
- `app/[root]/[[...path]]/page.tsx` should stay a thin site-owned wrapper that calls shared page rendering.
- `PhiCmsRootLayout` owns root resolution, locale/special-area normalization, request runtime resolution, the stable area shell, access boundary, and stable shell slot placement.
- `PhiCmsRootPage` should primarily resolve and supply page payload for the shell's page-capable slots and reuse the already-resolved root/runtime scope.
- `PhiCmsRootSlotPage` owns shared rendering for one page-owned shell slot and is the intended target for thin site-owned parallel-route wrappers.
- Shell slot placement and page payload are separate concerns:
  - the outer shell owns placement, sticky behavior, offset handling, z-index, and shell-relative sizing
  - the page owns the payload tree and region config for page-capable slots
- The stable shell must expose placeholder slots for:
  - `header_bottom`
  - `hero`
  - `sider_right`
  - `footer_top`
  - `content`
- In the target contract, `content` is the only truly page-internal region; the other page-capable regions are shell-mounted placeholders that receive page-owned payload.
- Under a stable `[root]` layout, those page-owned shell slots should be delivered through dedicated App Router parallel routes rather than by resolving page payload directly inside the stable layout render, so client navigation refreshes the slot payload correctly without a client fetch workaround.
- Shared CMS resolution must keep two explicit runtime classes:
  - fast published-live path for normal live requests
  - authoring/preview path for builder and `revision=<id>` requests
- Normal published-live requests must not pay draft-preview or builder overhead.
- `/public` and `/app` are the primary live-performance paths and should stay published-only unless an explicit preview request is active.
- Authoring and preview requests may pay extra cost for cookies, role checks, draft reads, and additional request metadata.
- Layout and page resolution must consume one shared normalized request context for the active request.
- The consuming site may transport normalized request metadata into shared code through thin wrappers or proxies, but it must not re-implement CMS area/page resolution, redirect rules, or preview semantics.
- If a header bridge is unavoidable, it must stay one small fixed request-context transport surface, not multiple competing transport channels for the same fact.
- Public routes should look like `/{locale}/...`.
- Special-area routes should look like `/app/...`, `/admin/...`, `/builder/...`, `/editor/...`, and `/accounting/...`.
- These root classes are mutually exclusive: a Special Area must never be prefixed by a locale. Its
  effective locale comes from the resolved request/profile/cookie fallback rather than its URL path.
- Shared shells in `@phis/ui` place resolved region slots into one neutral CMS shell surface.
- Shared server helpers should bind to a request-scoped runtime contract rather than reading environment variables implicitly.
- v1 favors explicit contract changes over compatibility shims. Do not preserve old and new shapes in parallel when a contract can be updated directly.
- `@phis/ui` must not define real App Router entries such as site-owned `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, or `error.tsx`.

### Layering

- `shells`: high-level shell orchestration.
- `regions`: CMS area and page regions such as `header_top`, `header_main`, `header_bottom`, `hero`, `content`, `sider_left`, `sider_right`, `footer_top`, `footer_main`, `footer_bottom`, and `drawer_right`, rendered through one shared CMS shell and generic region containers.
- `layouts`: internal structural composition components and CMS layout plugin implementations. Raw implementation files live under `components/layouts/*`; interactive client inners live under `components/layouts/clients/*`.
- `plugins/runtime`: shared renderer-owned runtime helpers such as slot-size policy resolution and slot-child framing. These are infrastructure, not layout or widget implementations.
- Layouts own both topology and optional visible-container config. `layoutKind` identifies the structural topology (`flex`, `stack`, `grid`, `split`, `threecol`, `masonry`, `content`, `form`).
- `widgets`: internal high-level widget implementations and CMS widget plugin implementations.
  - normal CMS-backed widgets are split across `components/widgets/config/*`, `components/widgets/server/*`, `components/widgets/client/*`, and `components/widgets/builder/*`
  - widget-owned canonical content persistence metadata such as `contentBinding` belongs in `components/widgets/config/*`
  - lower-level interactive client inners may still live under `components/widgets/client/*`, including shared helpers under `components/widgets/client/shared/*`
  - special non-standard runtime helpers live under `components/widgets/built-in/*`
  - rich-text widgets should keep their editor foundation on MIT-safe OSS dependencies only
  - do not introduce shared runtime dependencies on plan-gated or Pro editor UI packages when the same behavior can be built on top of OSS editor cores
- `modals`: self-contained modal containers.
- `forms`: low-level presentational form building blocks.
- `navigation`: shared navigation components and link primitives.
- `state`: transient scoped UI/runtime state helpers shared across widgets, builder surfaces, and other client-side integrations.

## Drag And Drop Contract

- Drag and drop must reuse the existing shared contracts:
  - `RenderableBlock.capabilities.draggable`
  - `RenderableBlock.capabilities.droppable`
  - `runtimeSignals`
  - the shared runtime signal bus
- Do not introduce a second isolated widget-local drag/drop contract when the shared block and signal contracts already cover the same ownership.
- Low-level pointer orchestration may use `dnd-kit`, native browser DnD, or another local interaction engine.
  - That engine is an implementation detail.
  - It must not become the public shared DnD contract.
  - In the builder, `dnd-kit` is the preferred default for new DnD interactions unless a stronger reason requires a different engine.
  - That preference still does not change the public contract; plugins and backend-facing contracts must stay engine-agnostic.
- The shared contract is semantic:
  - `capabilities` answers whether a block or subpart participates at all
  - `runtimeSignals.dragDrop` declares what payload types a plugin exposes or accepts
  - runtime signals transport semantic drag/drop state and committed outcomes, not pixel-level pointer movement
- New widgets and layouts that participate in DnD must follow this split:
  - interaction engine locally
  - semantic contract in shared types
  - semantic lifecycle on the signal bus
- Shared payload types should be stable and namespaced strings such as:
  - `navigation:item`
  - `navigation:page`
  - `cms:widget`
  - `cms:layout`
  - `cms:slot`
  - `media:asset`
- Shared drop modes should use the stable set:
  - `before`
  - `after`
  - `child`
  - `replace`
  - `append`
- `channel: "drag"` is the shared renderable-block drag channel.
  - Drag start uses `action: "start"` and semantic JSON metadata.
  - Drag updates use `action: "change"` and semantic JSON metadata.
  - Drag end/cancel uses `action: "stop"`.
- `channel: "drop"` is the shared committed drop channel.
  - Drop commits use `action: "drop"` and semantic JSON metadata.
  - Drop-target hover or acceptance state may use `action: "change"` on `drop` when needed.
- Drag/drop values may carry payload type, sender key, receiver key, drop mode, and acceptance state.
- Drag/drop signals must not be used as a high-frequency pointer transport stream.
- New widget or layout code must not invent ad hoc `onWidgetDrop`, `dragPayload`, `dropKind`, or similar parallel contracts when the existing shared contract can express the same intent.
- A shared widget editor scaffold may expose a drag handle when the widget declares `capabilities.draggable`.
  - the handle and pointer sensors belong to the builder interaction layer, not to each widget implementation
  - moving a widget between slots remains a builder draft mutation governed by the parent slot contract
  - semantic drag lifecycle and committed drop outcomes still use the shared DnD capabilities and signal protocols above
  - pointer coordinates and engine-local collision state never become persisted CMS or runtime signal data

## Root Theme And CSS Contract

- `PhiRootLayout` is the global provider host only.
  - It wires Ant Design, locale, fonts, CSS variables, and runtime theme resolution.
  - It must not become the owner of shell topology.
- `site.theme` is the dynamic visual contract loaded per request.
  - It may contain site-owned fonts, Ant Design token overrides, shell defaults, and other explicit theme values.
  - A later active-theme selector may be added without breaking the current contract.
- `site.themeRevision` carries the resolved default Theme scope pointers separately from the visual Theme payload.
  - Builder preset selection uses only `publishedRevisionId` and `workingDraftRevisionId` to distinguish a Site-owned Theme from immutable preset choices; it never infers ownership from Theme contents or the stored preset key.
  - If either pointer exists, the internal selection is `site:<siteKey>` and its visible label is the Site name. If neither pointer exists, the initial selection is the `phi` preset.
- The `/builder/theme` page-local Light/Dark switch selects the preview and color-authoring mode only.
  - It resolves mode-specific preset seeds, derived Ant Design colors, and the matching custom-color palette without changing the global Area Theme mode.
  - Explicit flat `site.theme.antd.token` values remain global overrides in both modes.
- The published `site.theme.phi.customColors` palette is the canonical custom-color source for live rendering, Builder canvases, inspectors, and normal CMS widgets.
  - `PhiColorWidget` consumes that palette through `usePhiConfig().customColors`; consumers must not reconstruct it from CSS variables or substitute semantic Ant Design tokens.
  - The `/theme` authoring workspace is the only path that supplies its current draft palette explicitly, because it must preview colors before they are published.
- `site.runtime` may later carry the active theme selection, but the current live rendering path should keep reading the resolved `site.theme` contract.
- `site.theme.antd.token` remains the source of truth for Ant Design design tokens.
  - If the root provider enables Ant Design `cssVar`, the runtime CSS variables are derived from that same token source.
  - `px2remTransformer` remains a separate bridge for rem conversion and should not be treated as a token source.
  - `site.theme.rem` contains only `rootValue`; typography is not persisted under `rem`.
  - The shared Ant Design `fontSize` seed is `12`. Ant Design's token algorithm derives `fontSizeSM`, `fontSizeLG`, headings, and line heights; any of those derived aliases may still be overridden explicitly in `site.theme.antd.token`.
  - Theme authors may override size tokens as canonical numeric values such as `padding = 21`, `paddingMD = 34`, or `paddingXL = 89`.
  - Ant Design consumes the numeric token value directly and emits both CSS-in-JS rules and SSR-extracted `--ant-*` variables.
  - Phi may additionally project a value only when it represents a distinct Phi-owned shell or layout contract, for example a sidebar width expressed in `rem`.
  - Do not mirror Ant Design colors, spacing, radii, typography, shadows, control sizes, or motion values into `--phi-*`.
- The root theme has one server projection and one client projection, both resolved from the same published Theme input.
  - `AntdRegistry` extracts Ant Design styles during SSR, including the configured `--ant-*` token variables used by Server Component markup and plain CSS.
  - `resolvePhiPublishedRootTheme(...)` emits only SSR-safe Phi-owned structural variables that have no Ant Design token.
  - `PhiConfigProvider` is the single Client Component boundary for Ant Design locale/theme configuration and the Phi-only `fonts`, `layout`, `customColors`, `mode`, and `presets` values.
  - The Server Root passes only serializable locale, Theme, font, preset, and custom-color data across that boundary. Client theme modules must not import server resolvers, server barrels, request helpers, or `server-only` modules.
  - Server theme projection modules remain protected with `server-only`; the package module-graph audit must report no Client-to-server-only reachability.
  - Client Components consume Ant Design semantics from `usePhiConfig().token` (or `theme.useToken()` inside a nested Ant Design provider).
  - Plain CSS consumes the corresponding Ant Design-owned `--ant-*` variables.
  - Client code must not resolve Ant Design semantics from `--phi-*` or maintain a parallel Phi token map.
  - `--phi-*` is reserved for true Phi-only structural or technical CSS contracts. Custom theme colors are data in `usePhiConfig().customColors`, not global CSS variables.
  - CSS-in-JS remains enabled while live Theme mode changes are projected through Ant Design runtime tokens. Ant Design `zeroRuntime` is a separate packaging decision, not part of this contract.
- The shell stays a region-level live rendering concern.
  - The current live shell contract remains unchanged.
  - New editor and preview layout systems should be parallel, not destructive.
- `root.css` should stay minimal.
  - Ant Design reset CSS should be imported directly in `PhiRootLayout`, not via `@import` in `root.css`.
  - It should hold the global reset, base `html` / `body` rules, live effect rules, and small utilities only.
  - It should not encode shell topology.
- `shell.css` defines the shared shell topology.
  - It should hold reusable region-grid templates such as `header_*`, `footer_*`, and `sider_*`.
  - It also owns the structural page-content viewport and the stable placeholder slots for page-capable regions.
  - It should not own region chrome such as background, border, or shadow.
  - See `SHELL.md` for the canonical shell contract.
- `LAYOUTING.md` defines the canonical layouting contract.
- `layout.css` defines reusable live/preview layout primitives and runtime geometry such as slot flow, anchors, fill behavior, slot-child frames, widget fallbacks, CMS region shells, and the variant contract for built-in layouts.
- `layout-authoring-scaffold.css` contains Builder-only debug and editor chrome such as slot frames, empty-slot state, edit drawers, selection frames, and the shared `--phi-debug-layer-*` palette.
- `layout-affordances.css` defines Builder-only insert/delete affordance styling.
- Builder scaffold and affordance styles are imported only by the Builder Authoring module, never by the global Root or a Public runtime entry.
- Sequential flow layouts compact their `slotIndex` order after delete; sparse slot layouts keep their positions stable.
- Typography remains configurable through `site.theme.antd.token`, the active font selection in `site.theme`, and the rem bridge in `site.theme.rem`.
- Root rem scaling and Phi-only structural variables are resolved and emitted by `PhiRootLayout` on the server.
- Client Ant Design token updates remain inside `PhiConfigProvider`; generated `--ant-*` variables are Ant Design's
  canonical CSS projection, while mirrored `--phi-color-*` output is forbidden.

## Metadata Contract

- Page metadata is owned by the CMS page record.
  - The concrete page title and description should come from the page record, for example through `titleMsgId` and `descriptionMsgId`.
  - Page metadata has the highest priority and should override all area and site defaults.
  - Code-owned route presets return resolved title and description through `pageMeta`. When a preset has no title label or explicit metadata, its descriptor title is resolved through the normal Site-scoped translation path before becoming the runtime title.
  - A Page Title Widget reads `runtime.page.title` automatically and receives stable-shell navigation updates through the Core Page-context projection without persisted signal routes.
- Area metadata is the contextual fallback layer.
  - Public, App, Admin, Developer, and Editor Areas may define their own fallback title and description behavior.
  - Internal areas may also choose stronger defaults such as `noindex`.
- Site metadata is the global fallback layer.
  - `site.name` and `site.theme.brand` are the most natural site-level fallback sources.
  - Site metadata should not replace a concrete page title when the page provides one.
- The root layout composes metadata only.
  - It should set the shared app-level defaults such as `metadataBase`, `title.template`, and `applicationName`.
  - It should not own concrete page copy.
- Recommended priority:
  1. Page metadata
  2. Area metadata
  3. Site metadata
  4. Generic product fallback
- `site.theme` remains a visual contract, not the primary page-metadata owner.
  - If a future theme-level title or description default is ever needed, it should be treated as a fallback only.
- Shared spacing scale:
  - `xxs = 3`
  - `xs = 8`
  - `sm = 13`
  - `base = 21`
  - `md = 34`
  - `lg = 55`
  - `xl = 89`
  - `xxl = 155`
- `theme`: shared theme/token helpers.
- `constants`: public runtime constants, enums, and flag definitions.
- `helpers`: public runtime helper functions.
- `helpers/site-runtime`: server-only site runtime loader for repo-local `config/site-runtime.json`.
- `server-helpers`: public server-only helpers.
- `net`: public network/proxy helpers.
- `gateway`: internal-only Phi-server adapter layer for site config, navigation, generic label-set infrastructure, form guards, form registry resolution, translation requests, and the shared data-source contract.

Practical meaning of the main rendering layers:

- `widget`
  - one editorial or functional unit such as brand, locale switch, quick links, markdown, account
- `layout`
  - structural slot composition only
  - no implicit padding, no shell ownership
  - edit mode renders structural slots plus drop zones and insert affordances
- `edit` render order
  - outer shell or region first
  - then layout scaffold
  - then occupied child content
  - then the widget content inside each occupied slot
  - then the widget selection/interaction layer
  - then optional widget-owned authoring chrome
  - then shared editor tools
- `edit` renderer contract
  - plugins provide slot topology and occupancy
  - shared scaffolds provide the common edit chrome
  - the minimal shape should describe `kind`, `variant`, `slots`, `occupied`, and `insertPoints`
  - `flex` uses sequential slots with one open append slot after the last occupied slot
  - named layouts use one fixed zone per semantic slot key
  - `stack` exposes one zone per section slot and only the active section renders live content
  - `grid` derives zones from visible cells or spans
  - a minimal render call can be thought of as `renderEdit({ kind, slots, occupied, insertPoints, runtime })`
  - widget content remains visually live-like but is inert by default; editor mode must not be simulated by setting every control to its runtime-disabled state
  - the widget interaction layer owns selection, hover, and a future shared DnD handle, while widget-owned authoring chrome stays above that layer
  - layout scaffolds must not cover their full descendant content because their slots and nested child scaffolds remain independently interactive
- builder selection terms
  - `selectedRegionKey` names the active region shell
  - `selectedRootRegionKey` names the region that currently hosts the selected layout root
  - `selectedStructureNodeKey` names the selected layout or widget node inside the structure tree
- builder inspector contract
  - inspector sections are persisted globally per selected structure node key so reopening the same node restores the previous collapse state
  - layout roots expose `rootNodeBackground` and `rootNodeBorder` as separate draft fields; they are sibling chrome controls, not a nested `nodeBackground` object
  - the layout Inspector exposes background, border, shadow, effect, and padding on the same level
  - editor draft state and preview snapshot stay separate, but both normalize through the shared builder root-node helper before rendering; the snapshot is not the editor data source
  - root layouts keep their `rootNodeConfig` blob in the draft so editor, preview, and Inspector see the same default shape until an explicit override is stored
  - the shared padding Inspector exposes `top`, `left`, `right`, `bottom`, and `gap`
- `area preset`
  - the default CMS tree for a whole Area such as `public` or `app`
- `shell`
  - the stable root-level frame that mounts header, sider, footer regions across a `[root]`
  - it also owns the structural page-content viewport
  - that viewport is not the same thing as the page-owned CMS region named `content`

Server/client boundary for those layers:

- `shell`
  - framework-facing infrastructure
  - should stay server-safe and must not depend on Ant Design layout/context internals in the RSC path
- `layout`
  - slot structure contract first
  - may be implemented without Ant Design when the slot contract is sufficient
- `widget`
  - primary UI integration layer
  - first-party Phi Widgets compose canonical Phi Controls for interactive primitives; direct Ant Design
    interaction imports remain inside the corresponding Phi Control adapter

### Shared component rules

- General naming rule:
  - public API components, public API helpers, and public API libraries use the `Phi` prefix
  - internal implementation files, helpers, and structural primitives that are not public exports must not use the `Phi` prefix
- Public `Phi*Layout` and `Phi*Widget` components should be self-contained within their documented
  ownership boundary. A domain Widget must not privately mount a structural Modal or Drawer.
- Persisted Modal/Drawer workflows are Area-/Page-owned CMS Overlays. `PhiModalControl` and
  `PhiDrawerControl` are provider-free presentation adapters used by the CMS Overlay renderer and by the
  explicitly permitted transient prompt/editor boundary. Immediate Pickers use only their canonical
  `Phi*Control`; that Control privately adapts a native UI-library primitive or composes
  `PhiPopoverControl`. Pickers never use Modal or Drawer presentation.
- Guided learning follows [TOURS.md](./TOURS.md). `PhiTourControl` is the provider-free presentation
  adapter; the owning Tour Controller uses ordinary Phi signaling and resolves existing visual signal
  addresses through the active Runtime partition. Tours do not occupy hidden CMS slots, expose Ant Design
  target refs, or resolve targets through global DOM selectors.
- Public `Phi*Layout` components should usually be server components.
- Naming contract:
  - `*Layout` means structural composition plus optional configured visual treatment
- React/Next boundary contract:
  - Server Components are the default.
  - Client Components are used only for browser interaction or client-only React features.
  - Shared shell/region infrastructure in the RSC path must not import Ant Design modules that rely on client-only context or css-in-js runtime internals.
  - Ant Design remains a private implementation detail of canonical Phi Controls and root/theme adapters;
    first-party feature Widgets and Forms do not create parallel primitive paths.
- Browser interaction belongs in internal `clients/*` implementations.
- Site code should pass control, context, explicit override, and composition props only.
- If a site has to preload shared labels, shared navigation trees, or shared config only to satisfy a shared widget/modal, the shared boundary is too low-level and should be raised.
- `*Form` components remain low-level and presentational. They should not own site-aware translation loading, endpoint selection, legal-link construction, or widget-level orchestration.
- Public form building blocks may be consumed by shared widgets, site widgets, and third-party widgets as long as they stay on the low-level form contract.
- Shared layouts and widgets should follow a server-wrapper/client-inner split when they need both runtime data and browser interaction.
- The server wrapper is responsible for loading site/theme/runtime config and filtering it down to a small widget-specific config slice.
- Server wrappers may work with a normalized runtime context that includes site, locale, area, and viewer state.
- That normalized runtime context is primarily a server-side contract.
- When shared CMS root rendering resolves runtime once for a root, shared helpers and special pages under the same root should reuse that scope instead of rebuilding it.
- Shared transient state should use the scoped store helper under `components/state/scoped-state-store.ts`.
  - the store is scoped by `storeId` and `scopeKey`
  - it is intended for runtime-only UI state, not persistence
  - the public store contract should stay small:
    - `useStore(scopeKey)`
    - `getSnapshot(scopeKey)`
    - `patch(scopeKey, updater)`
    - `replace(scopeKey, nextState)`
    - `reset(scopeKey)`
    - `deleteScope(scopeKey)`
  - builder-specific workspace state may use the shared scoped store basis, but builder orchestration and signal handling stay in the builder wrapper
  - widgets and plugins may use the same store basis for local or shared runtime slices when they need stable in-memory state across instances
- Viewer authorization uses the provider-scoped role claims and single access-policy evaluator defined
  in `ACCESS.md`; do not add direct Base/Custom flag branches or feature-permission arrays.
- Role-dependent capability inside an authorized surface is a controller permission projection bound to
  `disabledWhen` conditions, never a role branch in a widget; see `ACCESS.md` section 6.
- Client implementations should receive only the runtime slice they actually need, not the whole request/runtime object by default.
- Client implementations should receive only the widget-relevant config they need; do not pass raw site/theme JSON into client components.
- Renderable blocks are the shared data contract for Layouts, Widgets, and Regions. Regions
  use concrete `region:<region-key>` runtime addresses and inherit the same standard receiver channels;
  their signal scope is derived from canonical shell/page ownership.
  - `renderMode` defaults to `live`.
  - `renderMode` is a transient renderer hint owned by `render()`, `renderPreview()`, and `renderEditor()` wrappers. It is not persisted and must not be controlled through runtime signals.
  - `visibility` defaults to `visible`.
  - `enabled` defaults to `true`.
  - `size` is the canonical public preferred geometry form; `minSize`, `maxSize`, and `collapsedSizeHint` are the semantic geometry constraints.
  - Renderers normalize geometry, spacing, and padding to longhand DOM properties only.
  - Do not mix shorthand and longhand for the same CSS value on the same rendered element.
  - `capabilities` describe what the block can do, such as `selectable`, `draggable`, `hoverable`, `activatable`, `focusable`, and `droppable`.
  - `runtime` describes the host runtime context and interaction state for the current session, such as `siteKey`, `publicUrl`, `defaultLang`, `area`, `pageKey`, `selected`, `hovered`, `dragging`, `focused`, and `active`.
  - `zIndex` may be part of the common render contract when a block needs stacking control; renderers should normalize an unset `zIndex` to `0`.
  - `className` is the supported external styling hook when a consumer needs CSS-level extension.
  - `style` is not part of the public block contract; inline styling stays inside the concrete renderer implementation.
  - CMS renderers should pass each block's full `config` object to `PhiSlotChildFrame`, which reads only the common renderable block slice it needs.
  - `enabled: false` means the block remains present but should not accept interaction.
  - `hidden` means no layout participation.
  - `collapsed` means reduced participation with a collapsed size hint.
  - `visible` means the normal layout state.
- Block control commands use `action: "change"` on channels such as `visibility`, `enabled`, and `size`, and should address concrete renderable receivers.
  - Public v1 wiring routes every Widget and Layout to `receiver: "cms:<instanceId>"`; subcontrols append `:<subcontrolKey>`.
  - The receiver's mounted Page/Area context derives route scope. Node family is registry metadata, not an address or scope discriminator.
  - `receiver: null` or an omitted receiver means not wired and must not emit a runtime signal.
  - `receiver: "broadcast"` is the only public v1 broadcast form inside the selected `scope`, `channel`, and runtime context.
  - Any `scope: "block"` or `receiver: "block:<id>"` usage is a v1 contract violation.
  - `visibility` commands use canonical `value` values `visible`, `collapsed`, or `hidden`.
  - UI helper verbs such as show, hide, expand, collapse, and toggle must emit those canonical states instead of inventing separate widget-local commands.
  - CMS widgets inherit this receiver through the shared slot child frame; individual widgets must not implement duplicate hide/show/collapse receivers.
- Shared styling uses Ant Design tokens for every semantic Ant Design models and Phi layout classes for structure.
- `PHI_*` constants define seed/default content only; they are not an active runtime theme source.
- Reusable Client widgets, layouts, and Region containers consume `usePhiConfig().token`. Component CSS consumes Ant Design-owned `--ant-*` variables.
- A component-scoped CSS custom property may bridge a live token into a selector or pseudo-element, but it is an implementation detail rather than a second global theme API.
- `--phi-*` may represent only a distinct Phi-owned structural or technical value, for example shell geometry, Builder scaffold geometry, or runtime effects.
- Use inline styles mainly for geometry and per-instance layout values such as width, height, spacing, transforms, and positioning.
- Reusable server-side components may read `runtime.site.theme` only for explicit site-owned contracts that Ant Design does not model, for example shell, brand, or other site-specific behavior.
- Reusable Server Components and plain CSS use the SSR-extracted Ant Design `--ant-*` variables for generic UI semantics.
- Server-side theme resolution contract:
- Server Components must not depend on Ant Design runtime context such as `ConfigProvider` or other client-side theme hooks.
  - They use `var(--ant-...)` in styles or classes when a generic theme value is required.
  - Server resolvers may project only Phi-specific values that Ant Design does not model.
- Stable area/region/shell dimensions are not Ant Design theme concerns. Values such as header height, sidebar width, footer height, sticky offsets, and similar shell sizing should come from the DB-backed site shell contract, typically `runtime.site.theme.shell`, with `PHI_*` only as shared defaults.
- Shared default CMS trees may intentionally use stable `PHI_*` fallback values. Those tree defaults act as conservative starter values and remain valid even if a site developer later overrides the corresponding DB-backed CMS structure or shell sizing.
- Shell implementation rule:
  - Ant Design `Layout/Header/Sider/Content/Footer` are valid UI primitives, but they are not a required contract for shared shell infrastructure.
  - If a shell/region path must stay RSC-safe under Next App Router, prefer plain React/HTML structure over pulling Ant Design layout internals into that path.
  - This does not prohibit Ant Design inside widgets, forms, or interactive client inners.
- Hardcoded colors, radii, typography values, or bespoke visual tuning are exceptions and should be introduced only on explicit request or when the required result cannot be expressed cleanly through Ant Design tokens/components.
- For CMS-driven pages, `@phis/ui` should resolve shared/internal namespaced widget type keys into shared widget implementations.
- Site-custom CMS widget type keys must go through a fixed site bridge component instead of leaking site-specific registry logic into the backend.
- Layout nodes must be implemented under `components/layouts/*`.
- Content and flow widgets must be implemented under `components/widgets/*`.
- Slot-based structure and runtime collections are different contracts.
  - Layouts under `components/layouts/*` arrange persisted CMS child nodes through `slots[]`.
  - Runtime-derived collections such as asset grids, product listings, galleries, and search results should be modeled as registered widgets under `components/widgets/*`.
  - Those collection widgets may expose view modes such as `grid`, `masonry`, or `stack`, but they do not become layout kinds just because they reuse those visual patterns.
  - Collection widgets should consume a shared collection scope, typically keyed by `scopeKey`, and render items through an explicit item-renderer contract.
- Client-only implementations belong only in sibling `clients/*` directories.
- CMS-facing widgets and layouts must have exactly one canonical truth.
- A public `Phi*` widget or layout may itself be the portable plugin implementation.
- A CMS widget or layout must not expose one set of defaults via a public `Phi*` component and a different set of defaults via its plugin definition.
- Public CMS/shared components use the `Phi*` prefix.
- Internal implementation helpers must not use the `Phi` prefix.
- If shared shell or region rendering needs non-editorial structural helpers, those may live directly under `components/layouts/*`, but they should be internal-only helpers rather than CMS plugins.
- Such internal shell/region helpers should not use the `Phi` CMS component naming convention.
- Shells orchestrate slots; they must not pass widget-specific site-theme modes as bespoke props when those modes belong to the shared site-config contract.
- Widgets that need no site/theme data should not load it.
- Widgets may define stable internal defaults when a config field is absent, but they must not start hidden replacement fetches for site/theme/runtime config.
- Shared config persistence must stay sparse: if a field is absent, empty, or equal to the canonical default, it should not be written to JSON. Readers normalize sparse data back to the full runtime shape.
- Complex widgets may fetch their own domain data, for example table rows, detail records, news entries, or product lists. They must not fetch site/theme/runtime config on their own.
- Generic option controls use `optionsProvider` for dynamic choices.
  - widget config stores a strict namespaced `providerKey`; provider descriptors are owned by the active runtime module
  - the selected option is still emitted as the canonical signal `value`
  - provider implementations live in a React-scoped active-module boundary; global registries and registration import side effects are forbidden
  - live runtime loads the active module's executable provider Client; Canvas receives descriptors for configuration but executes only providers explicitly declared as static authoring data
  - DB-, API-, controller-store-, and subscription-backed providers are live-only and never expose their records in Canvas
  - built-in keys use the `@phis/ui/options/*` namespace
- Shared remote data loading should use a normalized data-source descriptor with:
  - `kind: api | serverAction | inline`
  - `cache.mode: no-store | force-cache | revalidate`
  - `cache.revalidateSeconds`
  - `cache.tags`
  - request/query mapping fields when the source is API-backed
- `cache.tags` are part of the contract and are intended to pair with Next.js tag invalidation.
- The same data-source contract should later be reused by tables, list views, and form bootstrap reads instead of introducing per-widget fetch abstractions.

### CMS rendering contract

- Shared rendering assumes a deterministic CMS tree:
  - area preset
  - region
  - root layout node
  - nested layout/content widgets
- Area presets own the default region set for an area.
- Regions without any occupied layout/widget slots must render `null`.
- Empty regions must not leave behind wrappers, placeholders, spacers, or reserved layout space.
- Do not add structural wrapper elements only to carry a React `key`, class, or trivial layout prop when the existing top-level rendered element can own that responsibility directly.
- Generic structural layouts should default to `margin: 0`.
- `*Layout` types own structure and optional visual treatment in one contract:
  - named slots or sequential `slots[]`
  - `gap`
  - alignment
  - distribution
  - width/height/min/max box constraints
  - optional outer layout spacing when that spacing is part of page composition rather than slot content treatment
- `*Layout` types are visually neutral by default:
  - transparent
  - no background
  - no border
  - no shadow
  - no glass/blur treatment
  - no implicit inner padding
- `*Layout` types must not add implicit inner slot padding for arbitrary child content.
- Configure padding and other visual fields directly on the Layout when a Region needs padded inner composition.
- Public layout component contracts should not use free-form `children` as the primary slot API.
- Named layouts should use explicit slot props only for genuinely semantic sides such as `left`, `middle`, or `right`.
- Single-slot layouts should use positional slots, for example `slots[0]`, not a named alias such as `defaultSlot`.
- Sequential layouts should use `slots: ReactNode[]`.
- Layout config may own:
  - inner padding
  - background
  - shadow
  - a semantic effect
  - border
  - borderRadius
- Reusable layouts expose visible treatment through config/props rather than hardcoded values.
- If a layout has multiple semantic sides or slots, side-specific treatment such as left/right background or padding is explicit in the family contract.
- Regions have a split contract:
  - `Region Core`
    - placement, visibility, ordering, root node binding, and allowed injections
    - examples: `regionType`, `rootLayoutInstanceId`, `sortOrder`, `visibilityMask`
  - `Region Shell`
    - outer region behavior and chrome such as sticky placement, viewport offset, width, height, collapse, padding, background, border, shadow, effect, and full-height behavior
    - examples: `sticky`, `offsetTop`, `zIndex`, `width`, `height`, `maxWidth`, `border`, `shadow`, `effect`
    - for sidebars, `height: "100%"` means the available shell space between the fixed outer header/footer bounds, while `fullHeight: true` is reserved for browser-height spanning shell behavior
    - builder-only preview adapters such as `PhiStructureRegionLayout` remain Region-shell adapters
  - `Layout`
    - inner structure and slot composition
    - examples: `gap`, named slots, sequential slots, alignment, distribution
- Regions may own shell behavior such as sticky placement, viewport offset, width, height, collapse, padding, background, border, shadow, a semantic effect, and full-height behavior.
- Static and client-enhanced Region renderers resolve that chrome through the same Region-shell resolver. Presets and Builder drafts persist only the closed effect ids `glass`, `blur`, `dim`, or `tint`, and only the closed shadow ids `none`, `soft`, or `strong`. Their CSS definitions are global Phi policy and must never be copied into a preset, module, renderer, or Area-specific path. A custom shadow is the sole exception and persists as `{ kind: "custom", value: "<box-shadow>" }`; arbitrary effect parameters and arbitrary strings in the standard shadow field are invalid v1 ABI.
- Widgets should own only their own content rendering and should not need to know the surrounding layout box.
- Regions must never contain content widgets directly.
- Every active region must point to exactly one root layout node.
- Layout nodes may contain further layout nodes and content widgets.
- Content widgets are leaf nodes.
- A layout defines slots.
- Each slot may contain at most one direct child node.
- That direct child node may be either one layout node or one content widget.
- Layout-specific flexibility comes from how many slots a layout exposes, not from multiple direct children in the same slot.
- Generic layout types such as `vertical`, `flex`, and `stack` should expose sequential `slots[]`.
- Specialized layout types such as `three-column` expose a fixed semantic slot set, but those semantic names should resolve from stable slot indexes such as `0`, `1`, `2`.
- Generic sequential layouts should use `slot_index` rather than numbered global slot enums or multiple direct children in one `default` slot.
- Regions always start with a root layout node; they do not need an additional allowed-kind contract.
- Page-level CMS records currently provide payload for `hero`, `header_bottom`, `sider_right`, `footer_top`, `drawer_right`, and `content`.
- `hero_root_layout_node_id = NULL` means the page currently has no hero tree; that is a valid state.
- `header_bottom_root_layout_node_id = NULL` means the page currently has no page-owned header bottom tree; that is a valid state.
- `sider_right_root_layout_node_id = NULL` means the page currently has no page-owned right sidebar tree; that is a valid state.
- `footer_top_root_layout_node_id = NULL` means the page currently has no page-owned footer top tree; that is a valid state.
- `content_root_layout_node_id = NULL` means the page currently has no content tree; that is a valid empty-page state.
- `hero`, `header_bottom`, `sider_right`, `footer_top`, `drawer_right`, and `content` are page-owned payload channels, but their placement belongs to stable shell slots.
- `content` is the only truly page-internal region in the target contract.
- In `/builder/pages`, any workspace-level header chrome above the canvas is not the selected page's `header_bottom` region.
- The selected page's `header_bottom` remains a normal page-owned CMS region with its own root layout tree inside the canvas.
- `drawer_right` remains a page-owned payload channel for page content that intentionally uses that Region. Builder Inspectors are not page content: their three Area-owned Drawer Overlays mount through the resolved Builder Area `overlays[]` collection independently of Region occupancy.
- Builder chrome and controllers have stable responsibilities:
  - the Builder workspace controller is a headless controller owned and mounted by the active Builder module; it must not be placed as a visible CMS widget in a layout slot.
  - a regular `select-box` Widget in stable Builder chrome selects the target Area through a declarative route to the Builder Controller, currently in `header_main` left.
  - `builder-mode-switch` is a visible builder mode control widget; pages may place it where the active workspace needs that control.
  - the Region, Layout, and Widget Inspector section Widgets render only their declared section inside the matching Area-owned Drawer Overlay; there is no Inspector-host Widget or hidden Drawer Region.
  - `builder-chrome-controls` controls builder chrome visibility/state through signals; it is not a header-main host.
- Builder command and Inspector Overlay orchestration belongs to the Builder workspace controller or page/workspace controllers. Inspector section Widgets own only their declared section presentation and controller routes.
- `page.layoutConfig.disabledRegionTypes: number[]` may explicitly suppress inherited fallback regions by `regionType`.
- Page-level payload must not redefine shell topology; it only fills the shell's page-capable placeholders.
- Controlled page-level slot injections into area-owned regions are a planned contract when the area contract explicitly exposes those slots, for example `header_main.actions`.
- Slot injections target layout-owned slots; the injected node itself may be either a layout node or a content widget.
- `allowedPageSlotInjections` is currently contract metadata only; the merge/injection runtime is not implemented yet.
- Widget instance config belongs to CMS widget nodes in revision `tree_json`, not to `site.theme.widgets.*`.
- If a widget persists canonical CMS content through `content_id`, its shared definition must declare that contract explicitly through `contentBinding`.
- Builder CMS write payloads must forward `contentBinding` as declarative metadata.
- `phi-server` persists namespaced widget types in revision nodes, but it must not branch on concrete widget `typeKey`s for content persistence when the payload already declares `contentBinding`.
- `site.theme` remains reserved for global design defaults such as fonts, colors, shell defaults, and Ant Design deltas.
- Region and preset data should be normalized into stable shared interfaces before rendering.
- `PhiCmsLayoutRenderer` is the generic region/layout tree renderer for area-owned regions.
- `PhiCmsPageRenderer` should stay a thin content-focused wrapper over `PhiCmsLayoutRenderer`.
- Shared fallback presets should not introduce bespoke layout wrappers; they should synthesize a CMS tree and go through the same renderer path as DB-backed presets.
- Every layout, widget, overlay, and resolved Navigation item instance has exactly one canonical `PhiCmsInstanceId`: an opaque 96-bit value serialized as exactly 16 Base64URL characters. The same id is used in Draft, preview, published runtime, persistence, history, structural references, and signaling where applicable; UUIDs, numeric CMS node ids, and parallel runtime identity fields are not part of v1.
- Codec v1 uses one version/origin header byte and one explicit domain byte. The closed domains are `area`, `page`, and `navigation`. Draft-origin ids then encode a safe 48-bit owning Draft revision id and one 32-bit Draft-local sequence. The complete id is text/bytes, never one JavaScript number. Each owning Draft persists one monotonic `nextNodeSequence`, and deleted values are never reused.
- CMS node identities do not encode Draft or Published state. Publish validates the selected revision and updates revision state/pointers atomically without remapping node identities.
- Layout-parent and Page/Region root-layout references use `PhiCmsInstanceId`. Signal addresses use `cms:<instanceId>` and `cms:<instanceId>:<subcontrolKey>`; widget/layout kind remains registry metadata.
- The central CMS instance creator/codec is the only identity authority. Third-party packages provide definitions and authoring requests, never caller-generated ids or assembled concrete CMS nodes. Inserting or duplicating consumes the owning Draft sequence; moving, editing, saving, reviewing, and publishing preserve the id.

### Module descriptor identity and instantiation

Area-shell, route, and theme presets are separate descriptor families. The generic preset-kind registry,
multi-target contributions, and arbitrary route plugins are not v1 extension surfaces. Every descriptor
has one stable `(ownerModuleId, presetKey)` identity and a positive integer version. A route preset belongs
to exactly one Area, one stable Area-local `pageKey`, and one immutable effective normalized path. `pageKey`
is the Builder/Draft identity (for example `home`), while the effective `path` is the routed URL (for
example `/`); neither is derived from the other. Duplicate `pageKey` values within one Area are rejected.

An Area may explicitly export a route mount such as `settings`. The mount binds a stable `mountKey` and
normalized `basePath` to an exported href-less navigation container. A route that opts into that mount
declares a normalized mount-relative `path`; the descriptor compiler materializes its effective path as
`<basePath>/<module-segment><relativePath>`. The module segment encodes the complete runtime module id by
removing the leading scope marker and joining its package/module parts with `+`: `@acme/status/auth`
becomes `acme+status+auth`. The `+` character is reserved and cannot occur in an encoded identity part.
Mounts are explicit injection points, never an automatic response to a route collision, and the Area base
module must own an exact route at every mount base path.

Route paths are exact or contain at most one whole-segment parameter such as `/news/:id`. Catch-alls,
optional segments, regexes, arbitrary matcher callbacks, and multiple dynamic segments are rejected.
The metadata-only descriptor compiler validates Area base ownership, route-mount exports, shell and route
versions, module ownership, route syntax, active-set collisions after mount expansion, theme identity, and
Area-shell composition before any tree loader runs. Its active route table resolves requests by effective
`path` and Builder targets independently by `pageKey`; callers must use the matching resolver instead of
treating either value as the other.

Preset templates contain no numeric CMS node IDs. Their structure and wiring use stable local node keys.
The central codec derives one canonical 96-bit `instanceId` from
`(contractVersion, domain, ownerModuleId, presetKey, nodeKey)`. Preset version, Site, concrete Area key,
request path, node type, and catalog order never participate. The domain prevents independent Area,
Page, and Navigation revision sequences from sharing an identity namespace. Preset authors never generate ids, retry
collisions, or construct concrete CMS instances.

Navigation descriptor `itemKey` values remain package-owned compile and injection anchors only. After
descriptor resolution, every Navigation item is addressed by its deterministic Navigation-domain
`PhiCmsInstanceId`; Site-authored items use Navigation Draft-origin ids from the central allocator.

Preset instantiation is in-memory and requires neither a DB row nor a Draft. Once an Area or route tree is
saved, its Draft/Published snapshot is independent of later descriptor versions. Untouched Live routes use
the currently installed descriptor; existing snapshots retain their source identity and version until the
operator explicitly replaces them.

Every Theme descriptor declares a required `themeKey` and `title` plus an optional `description`. Theme
selection consumes only active module descriptor bindings. Global mutable registries, registration side
effects, and parallel first-party discovery arrays are invalid.

The Builder Theme selector also exposes the concrete Site-owned Theme as `site:<siteKey>`, labelled with
the Site key. Preset choices are immutable bases and reusable apply actions. The Site entry is
selected exactly when the Theme scope has a Working Draft or Published revision pointer; clients never
infer that state by comparing Theme payloads. The applied preset remains provenance while the concrete
result is saved and published through the Site Theme Draft lifecycle. Selecting the Site entry restores
the current Site-owned snapshot.

Concrete persistence ownership remains target-specific: an Area target belongs to `(site, area)`, a
Page target belongs to `(site, area, canonical page scope)`, and other preset kinds use their own typed
target identity. Drafting, publishing, and resetting one target never mutates another target of the same
preset.

### Backup, restore, and portable import

Exact backup/restore reproduces the same installation state and preserves CMS instance ids, Draft and
Published revisions, pointers, and the relevant database sequences. It performs no identity remapping.

Portable CMS export/import is a content-transfer operation. Import creates a target Draft, re-derives
deterministic preset ids from their recorded `(ownerModuleId, presetKey, nodeKey)` provenance,
allocates new target-Draft ids for authored nodes, and atomically remaps structural references, signal
routes, controller/form bindings, and other declared node references. Module-owned domain data such as
Media, News, or Tickets participates only through declared module export/import hooks. Third-party code
never performs identity remapping itself.

- Area/page resolution must obey this visibility contract:
  - every area resolves only its own DB-backed pages or explicit area-owned fallback pages
  - no area may resolve pages from another non-public area
  - public pages and public shell roots do not auto-supply other areas
  - explicit area-owned fallbacks such as admin dashboard or admin users/logs stay local to that area
- Shared types should define the canonical region/preset contract, for example:
  - `PhiCmsRegionKey`
  - `PhiCmsRegionConfig`
  - `PhiCmsResolvedRegion`
  - `PhiCmsAreaPreset`
- Preview and live Region containers are visually neutral when `border` is missing or `null`. A Region border must come from explicit Region config; implicit header, footer, or Sider separators are not part of runtime rendering. Canvas and Editor outlines belong only to Builder scaffold chrome.
- A Layout `borderRadius` shorthand is normalized into the Border control's four corner-radius values for Inspector display. Explicit per-corner values override that common radius.
- Widgets, layouts, and route resolvers should move toward explicit plugin definitions with:
  - `kind`
  - `pluginKey`
  - `typeKey`
  - plugin-specific contract fields
- Synthetic CMS trees should be assembled through small factory helpers rather than by hardcoding built-in enum values inside presets:
  - `buildPhiCmsLayoutNode(...)`
  - `buildPhiCmsWidgetNode(...)`
  - `buildPhiCmsLayoutNamespacedTypeKey(pluginKey, typeKey)`
  - `buildPhiCmsWidgetTypeKey(...)`
  - the factories take `pluginKey` and `typeKey` and emit the namespaced CMS node type used by the registry
  - built-in `PhiCmsLayoutType.*` and `PhiCmsWidgetType.*` constants remain convenience shortcuts for shared built-ins, not the only valid CMS contract
  - concrete layout/widget instances use only canonical 96-bit `PhiCmsInstanceId` values created by the central CMS instance service
  - preset templates use local `nodeKey` references and never numeric CMS node IDs
  - third-party type resolution continues through plugin-key/type-key, while deterministic preset instance identity derives only from contract version plus module-key/preset-kind/preset-key/node-key
- Plugins may additionally expose inert future-facing monetization metadata such as:
  - `commercial.vendor`
  - `commercial.website`
  - `commercial.plan`
  - `commercial.licenseRequired`
- Widget and layout plugins should additionally expose:
  - `category`
  - `tags`
  - `icon`
  - `defaultConfig`
  - `fields`
  - `parseConfig`
  - `render`
- A CMS widget should usually consist of:
  - a public `Phi*Widget` implementation component
  - and a `PhiCmsWidgetPlugin` definition that adapts it into the CMS/plugin registry
- A CMS layout may likewise consist of:
  - a public `Phi*Layout` implementation component
  - and a layout plugin definition that adapts it into the CMS/plugin registry
- For CMS rendering, widget and layout plugins are the only supported public integration surface.
- Shared sites, editors, presets, and future plugin providers should target the canonical plugin contract.
- When a public `Phi*Widget` or `Phi*Layout` component is the plugin implementation, it must remain self-contained and idempotent.
- Layout plugins should additionally declare their slot contract for editor and validation use.
- Builder/editor metadata should come from the plugin definition itself:
  - `title`
  - `description`
  - `category`
  - `tags`
  - `icon`
  - `defaultConfig`
  - `fields`
  - and for layouts also `slots`
- Built-in shared layouts and widgets may seed `defaultConfig` from a common shared defaults file, but runtime callers should still read defaults through the plugin contract rather than a second caller-local fallback.
- For layout plugins, `defaultConfig` remains the public neutral default entrypoint. Optional creation presets materialize normal config before persistence.
- Third-party plugins own their own `defaultConfig` and parser defaults and must not be forced onto the shared built-in defaults file.
- Draft consumers in the Builder merge the plugin `defaultConfig` with the current draft through the shared helper before reading derived values.
- Plugin `render` is server-first; client inners remain an internal implementation detail of the plugin.
- Widget and layout execution contexts may later receive an optional `license` object.
- CMS page contracts may also use a dedicated `redirect` page type for non-content pages.
- Redirect pages should carry a target contract in page config with `area + path` and an optional status code.
- CMS page delete is modeled as a normal page revision with `status = Deleted` and a deleted revision flag; publishing that revision makes the live route resolve as not found while retaining revision history for restore.
- Route presets provide CMS trees inside the Area base shell. They never replace the outer shell or return
  arbitrary React nodes.
- The shared catch-all route is only the site-owned transport into the central exact/dynamic route resolver.
- `public` should continue to prefer CMS/DB-driven shell regions and navigation by default.
- Navigation translation scope is part of the `navKey` contract:
  - `builder:*` is reserved for Phi-owned builder chrome navigation and must resolve from shared presets with global shared UI translations.
  - all other navigation keys remain site-owned navigation content and must use site-scoped navigation lookup and site-scoped translations.
  - do not move user/site navigation labels into global label sets to fix Builder UI wording.
- `app` uses its own CMS/DB-driven shell baseline; optional modules contribute its routes and navigation.
- Area base modules declare navigation surfaces and exported anchors. Optional modules may inject only
  into those surfaces through declarative navigation descriptors; they cannot create navKeys.
- Route mounts bind routing to one exported Area-owned navigation container, but navigation overlays remain
  presentation-only: reordering or reparenting a contribution never changes its effective route path.
- An overlay may tombstone an Area-owned container. Runtime navigation then hides the container and its
  remaining subtree, while Builder navigation authoring continues to show those source items disabled.
  A child explicitly reparented outside that tombstoned subtree remains visible.
- Installed Module packages extend the immutable runtime-module catalog through `phis-cli`-generated
  external build state; renderers accept only request-resolved active registries.
- `@phis/ui/cms` remains the explicit aggregate CMS API. Route entry modules must use the
  narrow `cms/root-layout`, `cms/root-page`, `cms/root-slot-page`, `cms/error-page`, and `cms/request`
  subpaths so importing one App Router boundary does not load unrelated presets and registries.
- `@phis/ui/cms/plugins` exports the site-bridge and plugin integration surface.
- The preferred site integration surface is a `PhiCmsSiteBridge` object.
- The stable generic Area host owns the bridge instance and consumes the generated build-time Module
  projection; Site/Skeleton source must not reconstruct that catalog or import optional package names.
- Catch-all admin/builder/editor paths rendered from shared UI receive that generic bridge instead of
  importing site-local plugin or Module files.
- Backend payloads, shared fallback presets, renderer input, and future editor output should all converge on that same normalized contract.
- Layout and widget type IDs must come from central shared registry constants, not from local component-level hardcodes.
- Keep separate registry constants for layout types and content/widget types.
- A duplicate-ID validation check in CI or test tooling is recommended and should fail on collisions.
- The future stable CMS type identity is the pair `(plugin_key, type_key)`.
- Shared core entries should use:
  - `@phis/ui/widgets + <type-key>` for widgets
  - `@phis/ui/layouts + <type-key>` for layouts
- Registries should expose both:
  - the current technical runtime id
  - and canonical `pluginKey` / `typeKey` metadata for future DB/plugin resolution
- A consuming site should keep its CMS catch-all `layout.tsx` and `page.tsx` thin and deterministic; layout and content resolution should flow from the site wrapper to `@phis/ui` to `phi-server`.

Example site bridge:

```ts
import {
  PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG,
  type PhiCmsSiteBridge,
} from "@phis/ui/cms/plugins";
export const SITE_CMS_BRIDGE: PhiCmsSiteBridge = {
  runtimeModuleCatalog: PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG,
};
```

Then pass that bridge into the thin shared root entrypoint:

```tsx
<PhiCmsRootLayout root={root} cmsBridge={SITE_CMS_BRIDGE}>
  {children}
</PhiCmsRootLayout>
```

### Client Runtime Signal Contract

Client-only cross-component coordination uses the consolidated `PhiSignal` contract from `types/signals`.

- `PhiSignal` is the only public signal shape; do not introduce feature-local message contracts.
- The v1 ABI target is a flat signal shape: `{ scope, channel, action, valueType, value, valueSchema?, sender?, receiver, correlationId, timestamp, meta? }`.
- `scope`, `action`, and `valueType` are closed contracts. `channel` is the configured channel that connects emitters and listeners.
- Public JSON signals require a named schema.
  - `valueType: "json"` capabilities and routes must declare `valueSchema`.
  - `valueSchema` uses the namespaced form `<npm-package>/<schema-key>`.
  - Core schemas must use `PHI_SIGNAL_VALUE_SCHEMAS`; new core schema ids are created with `createPhiSharedSignalValueSchema(...)`, not by repeating the package-name prefix at call sites.
  - JSON wiring matches only when `scope`, `channel`, `action`, `valueType`, and `valueSchema` are compatible.
  - Non-JSON signals must not use `valueSchema`.
- `scope` is the signal routing level. `scopeKey` is not a routing scope and must not be used as a fallback for signal delivery; it may name a concrete transient store, provider, collection, or data-source namespace.
- `sender` is `PhiSignalAddress | null`; it identifies the concrete sending instance or controller and must never be `broadcast`.
- `receiver` is `PhiSignalAddress | "broadcast" | null`.
  - `null` means not wired and no runtime signal should be emitted.
  - `"broadcast"` means explicit broadcast within the selected `scope` and current runtime context.
  - a concrete address means targeted delivery.
- Public v1 scopes are exactly `widget`, `layout`, `region`, `page`, `area`, and `site`.
  - `runtime` identifies an execution environment or Registry partition, not a signal routing scope.
  - Live Area, active Page, and Builder Canvas runtimes remain isolated through their Registry context.
- Public v1 address families are exactly:
  - `cms:<instanceId>[:<subcontrolKey>]` for Widget and Layout instances
  - `region:<regionKey>` for a concrete Region inside the route's active context
  - `controller:<npm-package>/<controller-key>:<instance-key>` for Controller instances
  - Widget/Layout kind is Registry metadata and must not create separate `widget:` or `layout:` address families.
  - `object:`, `runtime:`, `site:`, `area:`, `page:`, `slot:`, and `block:` are not public v1 address
    families.
- Controller receivers are first-class `PhiSignalAddress` values, not a second signal system.
  - The only valid controller address form is `controller:<npm-package>/<controller-key>:<instance-key>`.
  - Singleton controllers use `default` as their instance key, for example `controller:@phis/ui/asset:default` or `controller:@phis/ui/builder:default`.
  - Non-namespaced controller addresses such as `controller:asset:default` and short addresses such as `controller:<controller-key>` are not valid v1 ABI.
  - The `<npm-package>/<controller-key>` segment matches the existing widget/layout `pluginKey/typeKey` registry style; third-party controllers must use their npm package name as `pluginKey`.
  - Controller settings may restrict a controller to the single `default` instance or allow additional named instances, but the serialized address form stays the same.
  - `scopeKey` may name the controller's internal store, provider, collection, or data-source namespace; it must not replace the controller instance key in signal routing.
- Plugin metadata has four separate declaration surfaces:
  - `fields` declares inspector-editable config and persistence shape.
  - renderable-block `capabilities` declares only binary interaction participation, such as selectable, draggable, focusable, or droppable.
  - `runtimeSignals.emits/listens` declares semantic signal capabilities.
  - `runtimeSignals.dragDrop` declares semantic drag/drop payload types and drop modes.
- Concrete instance signal routes are serialized with the CMS widget/layout/object instance config, not in `runtimeSignals`.
  - `runtimeSignals` declares what the plugin can emit or listen to.
  - `signalRoutes` declare how one concrete instance is connected.
  - Each `runtimeSignals.emits/listens` capability must have a stable `id`.
  - Each `signalRoutes.emits/listens` route must have a stable `routeKey`, unique across the owning instance's complete route set.
  - Each route has a required `capabilityId`. In `signalRoutes.emits`, it references one declared sender capability from `runtimeSignals.emits`; in `signalRoutes.listens`, it references one declared receiver capability from `runtimeSignals.listens`.
  - Route CRUD and table identity use `routeKey`; capability dispatch uses `capabilityId` and may resolve several explicit routes.
  - Presets use explicit stable route keys. Builder-created routes use the central `createPhiSignalRouteKey()` helper. Route keys are never derived from array indexes, route contents, receiver addresses, or timestamps and remain stable through edit, publish, and receiver remapping.
  - Do not persist or parse legacy `sourceKey` route fields.
  - The runtime sender is derived from the current instance address; persisted routes should store only a stable subcontrol/source key when needed.
- The inspector must not infer settings from signal capabilities, and signaling must not infer wiring from inspector fields.
- Stable actions are exactly `activate`, `change`, `toggle`, `start`, `stop`, `clear`, `open`, `close`, `reload`, `flush`, `filter`, and `drop`.
- A channel has one canonical `valueType` per receiver capability. If one concept needs multiple value families, use distinct channels.
- Naming convention:
  - entity `id` means numeric persisted/runtime identity
  - capability metadata `id` is the stable string identifier of that declared capability
  - route `capabilityId` references capability metadata `id`
  - route `routeKey` is the stable string identity of one concrete persisted route
  - `key` means stable string key.
  - `index` means positional number.
- Command names such as `save`, `publish`, `preview`, `undo`, `redo`, `reset`, `createPage`, and `deleteSelected` are channels with `action: "activate"`, not signal actions.
- Generic lifecycle actions keep their domain in the channel:
  - reload data: domain channel plus `action: "reload"`
  - focus state: `channel: "focused"`, `action: "change"`, `valueType: "boolean"`
  - effects: `channel: "effects"`, `action: "start" | "stop" | "clear"`
  - drag: `channel: "drag"`, `action: "start" | "change" | "stop"`
  - drop: `channel: "drop"`, `action: "drop"`
- Runtime receivers register while their instance is mounted and unregister on unmount. The bus must treat a receiver as active only while it is inside the current runtime context, such as the current page, area, or region. A mounted container or lazy fallback does not prove that its concrete signal consumer is ready: orchestration that sends an initial payload after lazy mounting must wait until both the receiver instance and at least one concrete listener for that address are registered.
- Runtime delivery state is provider-owned, never module-global. The Root owns the Site partition, each
  mounted Area owns one Area partition, and each Builder Canvas owns an isolated Canvas partition.
  Subscriptions and mounted-instance registries are destroyed with their provider; browser tabs do not
  exchange runtime signals and v1 does not use `BroadcastChannel`.
- Page-owned endpoints register their concrete Page/Region context inside their current Area partition and
  unregister on unmount. This keeps shell-to-current-page routes possible without a second global current-page
  singleton or a parallel signal bus.
- `correlationId` is required on delivered runtime signals. The signal bus/controller creates it centrally when no existing correlation is supplied. Feedback or state-change signals produced by handling a command must keep the initiating correlation id.
- Listen routes are read-only with respect to the signal graph: they may update local UI/control state, but must not implicitly emit another runtime signal. If relay/automation is needed later, it requires an explicitly approved contract extension.
- Controllers must suppress no-op state changes instead of emitting redundant feedback.
- Context matching is part of routing:
  - `page` routes only to instances in the current page composition.
  - `area` routes only inside the current site area.
  - `region` routes only inside the current region context.
  - `site` routes only to the concrete required Core Runtime Controller endpoint `controller:@phis/ui/core:default`; they never target CMS/Region instances or broadcast.
  - `cms:<instanceId>[:<subcontrolKey>]` addresses a concrete mounted CMS receiver; the registry resolves widget/layout kind.
  - `controller:<npm-package>/<controller-key>:<instance-key>` addresses mounted runtime controller instances in the current context.
  - Area module settings persist only optional eligible module ids; the locked base module comes from the Area definition and must not be persisted.
  - Concrete multi-instance controller mount descriptors are materialized from the CMS structures that require them, not manually duplicated in an area module selector.
  - Shell/area-owned widgets, layouts, and objects materialize controller instances with `mountScope: "area"`.
  - Page-owned widgets, layouts, and objects materialize controller instances with `mountScope: "page"` only when the controller's owner module is active for the owning area.
  - Runtime plugins may declare required controller instances, but must not mount controller plugins directly; the generic runtime controller host is the only controller mount path.
  - A missing or null `receiver` is not connected and must not be treated as broadcast.
  - Broadcast must use `receiver: "broadcast"`.
  - `slot` is not a public v1 signal scope or receiver family; slot state routes through the owning layout receiver.
  - `block:<id>` is not a public v1 wiring address; cached or hidden instances outside the current context must not receive active-context signals.
  - Area registries remain isolated: no signal travels laterally from one Area to another. Explicit Area/Page-to-Site-Core routes and Site-Core outputs to concrete receivers in the currently active Area/Page context are the only v1 boundary crossing. Builder Canvas Registry partitions must never reach the live Site endpoint.
- Slot switching and slot-local state must target the owning layout receiver with channels such as `activeSlotIndex` or `activeSlotKey`; do not use `scope: "slot"` or `receiver: "slot:<key>"`.
- Standard renderable-block signal channels are:
  - `visibility/change` with canonical values `visible`, `collapsed`, or `hidden`
  - `enabled/change` with `valueType: "boolean"`
  - `size/change`, `minSize/change`, and `maxSize/change` with `valueType: "size"`
  - `background/change` with `valueType: "json"`, `valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.backgroundConfig`, and the shared background config shape
  - `border/change` with `valueType: "json"`, `valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.borderConfig`, and the shared border config shape
  - `shadow/change` with `valueType: "string"` and one of the semantic shadow ids `none`, `soft`, or `strong`; custom CSS shadows are persisted configuration and are not transported through this string signal
  - `zIndex/change` with `valueType: "number"`
  - `opacity/change` with `valueType: "number"` and a CSS opacity value from `0` through `1`, defaulting to `1`
  - `effects/start`, `effects/stop`, and `effects/clear` for renderer-supported effect state
- `opacity: 0` keeps layout participation; use `visibility` when the block should become hidden or collapsed.
- Top-level block `opacity` and `effects.opacity` are separate settings. `opacity/change` updates the block's base opacity; effect opacity remains part of the effect/animation configuration.
- Widgets emit their native control values. A switch emits booleans, a select emits selected values, and activation controls emit activation without embedding domain-specific values in the control value.
- Plugin capabilities are declared with `runtimeSignals.emits` and `runtimeSignals.listens`; old binding maps are legacy and should not be extended.
- Provider-backed structured tables follow [TABLES.md](./TABLES.md). `PhiTableWidget` owns persisted
  presentation, source binding, CMS identity, and standard signal routing. The reusable Core
  `PhiTableBinding` owns Provider resolution, normalized query/request state, mutations, and edit
  reconciliation; the provider-free `PhiTableControl` renders the resulting controlled view model. A
  module-owned Table Provider resource owns row identity, typed field schema, validation, authorization,
  queries, and domain mutations. Editable static rows are versioned Provider resources, not a
  Widget-specific config or Core identity branch.
- Provider-backed pure hierarchies follow [TREES.md](./TREES.md). `PhiTreeWidget` owns persisted
  presentation and source binding, `PhiTreeBinding` owns Provider lifecycle and reconciliation, and the
  provider-free `PhiTreeControl` renders the controlled hierarchy. Domain Tree wrappers are forbidden.
- Provider-backed visual collections follow [COLLECTIONS.md](./COLLECTIONS.md). The generic Widget and
  Binding own the shared view lifecycle while the selected module Provider supplies domain item and panel
  adapters; self-contained filters, toolbar, integrated panels, and pagination are never loose preset
  Widgets.
- Layouts and Widgets share the same signal bus, `cms:` receiver family, and renderable-block controls.
- Full widget-level rules live in `components/widgets/README.md`.

### Site Core Runtime Controller

The mandatory Core module mounts exactly one site-owned Core Runtime Controller in the shared application
Root Layout above all Area layouts at `controller:@phis/ui/core:default`. It has
`mountScope: "site"`, is not an optional Area selection, and remains mounted during client navigation
between Areas that share that Root Layout. A deployment with multiple Next.js Root Layouts mounts one
Core instance per Root Layout lifetime; crossing those roots performs a full page load and starts a new
client runtime.

The controller is the adapter between already-resolved CMS/Site state and browser-wide runtime effects;
it is not the source of Theme, Page metadata, Locale, or persistence state. Area layouts remain responsible
for Area modules, controllers, Shells, Regions, and active Page context. Child Area/Page contexts explicitly
publish their resolved snapshot to the Core instance when they mount or become active.

Its closed state inputs and mount/context-activation snapshot outputs are:

- `pageTitle/change` with `valueType: "string"`
- `pageDescription/change` with `valueType: "string"`
- `openGraphImage/change` with `valueType: "image"`
- `canonicalUrl/change` with `valueType: "string"`
- `theme/change` with `valueType: "json"` and a namespaced runtime-theme `valueSchema`
- `themeMode/change` with `valueType: "boolean"`; `true` selects the live dark projection and `false` the live light projection without persisting Site Theme configuration
- `locale/change` with `valueType: "string"`, validated against the resolved Site locale set

Optional `pageDescription`, `openGraphImage`, and `canonicalUrl` state additionally declares
`action: "clear"` with `valueType: "none"`; absence is never encoded as an invalid string/image value.

The controller receives resolved persisted values, applies the effective browser/runtime state, and
emits the current snapshot when the Site or active Area/Page context mounts. A `PhiPageTitleWidget` or
another explicit current-context receiver can therefore initialize from the controller without making
the controller the persistence source. Inputs are idempotent and must not be echoed automatically;
mount snapshots start a new correlation, while a deliberately correlated apply flow preserves its
existing correlation id.

The receive-only transient application-service inputs are:

- `notification/activate` with `valueType: "json"` and a closed namespaced notification schema
- `message/activate` with `valueType: "json"` and a closed namespaced message schema

Both inputs use the same closed `level` vocabulary: `success`, `info`, `warning`, or `error`.
Their exact values are deliberately small and serializable:

```ts
type PhiCoreRuntimeNotificationValue = {
  level: "success" | "info" | "warning" | "error";
  title: string;
  description?: string | null;
  durationSeconds?: number | null;
  placement?: "top" | "topLeft" | "topRight" | "bottom" | "bottomLeft" | "bottomRight" | null;
  showTimeoutProgress?: boolean | null;
};

type PhiCoreRuntimeMessageValue = {
  level: "success" | "info" | "warning" | "error";
  content: string;
  durationSeconds?: number | null;
};
```

`title` and `content` must be non-empty trimmed text. `description`, when supplied, must also be
non-empty trimmed text; `durationSeconds` is a finite number greater than or equal to zero. Notification
`placement` uses only the six application-level viewport positions above, and `showTimeoutProgress`
controls the visible timeout progress. Unknown fields invalidate the payload. There are no arbitrary
Ant Design props, React nodes, keys, actions, callbacks, persistence, or state rebroadcasts in this
contract. Hover pause, stacking, maximum counts, offsets, icons, containers, and RTL are application
defaults, not per-signal fields. Notification accessibility roles are derived from `level`.

The Root boots one Core-owned application-service adapter directly below the `App` context. It remains
outside lazy Runtime-Controller projections so application-context updates cannot invalidate controller,
Provider, or Table lifecycles. Feature code emits these values through `usePhiApplicationFeedback`; it
never calls Ant Design Message or Notification APIs directly. Builder Canvas partitions cannot address the live Site Core instance;
Canvas-only diagnostics therefore remain inline Phi Controls or cross the established Builder callback
boundary.

The explicit Page-context snapshot is `pageMeta/change:json` with the existing namespaced `page-meta`
schema. It contains `area`, `pageKey`, `pageTitle`, `pageDescription`, `pagePath`, and `pageType`, each
as a concrete value or `null`. It is emitted only as a Page-scope broadcast from the Core controller into
the currently active Page partition. It is a projection for current-context receivers, not a persisted
route, and uses a new correlation id on mount/context activation. Site-state inputs remain targeted,
idempotent Core inputs; an intentional correlated apply flow retains its correlation id without causing
an automatic feedback loop.

Those inputs invoke the shared application Notification/Message service and are never persisted or
emitted as state. Their schemas expose Phi-owned semantic fields only, never arbitrary Ant Design props.
SSR/Next metadata remains server-resolved for initial HTML and crawlers; runtime metadata signals only
apply the already-resolved or explicitly changed current browser state. Theme editing/persistence stays
with the Theme controller, Page metadata persistence stays with the Page/Builder controller, and Locale
configuration stays with its owning server/Admin flow.
`locale/change` applies the validated effective runtime locale; it does not modify the Site's available
or default locale configuration.

`scope: "site"` therefore means one explicit route to the globally mounted site-owned Core Runtime
Controller, not a general global receiver Registry, Area relay, or Site broadcast. The Core instance may
persist across Area transitions, but it must not retain or address receivers from an inactive Area/Page.
Its outputs route only to explicit concrete receivers in the current active Registry context. Builder
Canvas sandboxes have separate Registry partitions and cannot target the live Site endpoint. Different
Areas may safely reuse deterministic preset instance ids.

Typical use cases:

- a header action icon refreshes a table widget in the content area
- a toolbar button toggles a panel or form section
- a shell control activates a specific stack slot
- a filter control updates a local widget value and triggers a refetch

This is the target v1 contract. The declarative CMS tree remains the source of truth. The global Core
mount does not authorize global broadcast, cross-Area relay, module-private buses, or imperative wiring.

### Runtime modules and area activation

The complete normative Module structure, first-party owner-folder convention, generalization gate, and
Server/live/Authoring projection contract lives in [MODULES.md](./MODULES.md). The rules below describe
activation and ownership details within that contract.

The terminology is strict across the Site/server boundary:

- a **Module** is a Site/client extension compiled into a Site application
- an **Add-on** is a server extension compiled into `phi-server`
- **Core** is the built-in `phi-server` capability provider

Every Module declares exactly one server binding: either Core or exactly one logical Add-on id. A
Module must not bind to several Add-ons, install or enable an Add-on, or derive server availability
from client state. One Add-on may serve several Modules only when they intentionally share one
integration owner and deployment lifecycle. The normative server-side installation, capability,
routing, Site-enablement, migration, and load-balancing contract lives in
`phi-server/SERVER_ADDONS.md`.

Module and Add-on entrypoints are physically separate module graphs, whether or not they ship in the
same package. `phi-server` never imports a Site/React entrypoint, Site applications never import an
`addon/` entrypoint, and both sides may share only a neutral, React-free wire-contract package. Missing or incompatible server capabilities are resolved server-side
and produce a scoped diagnostic plus a deduplicated structured log entry; Module activation never
installs or auto-enables server code.

When a Module has a direct `phi-server` counterpart, both halves ship as one package: `@scope/name` is
the Module, `@scope/name/addon/…` is the Add-on, and the Add-on's logical provider id is `@scope/name`.
The entrypoint prefix identifies the half, not a different provider.

`PhiRuntimeModuleDefinition.serverBinding` is mandatory metadata:

```ts
type PhiRuntimeModuleServerBinding = {
  providerId: `@${string}/${string}`;
  requiredCapabilities: readonly `@${string}/${string}:v${number}`[];
};
```

Capability ids are exact, versioned ABI requirements. During server resolution the Site fetches the
site-specific capability snapshot from `phi-server`. A selected Module activates only when its provider
is available and every required capability is present. An unavailable dependent Module is omitted from
route, controller, widget, layout, and provider activation while its persisted selection remains intact
for diagnostics and later recovery. Modules with no server requirements bind explicitly to Core with an
empty requirement list.

The runtime Module is the Site-side installation, ownership, activation, and lazy-loading boundary. A
Module is a namespaced, NPM-owned plugin unit identified by `<npm-package>/<module-key>`. It owns at most
one controller definition plus coordinated Widgets, Layouts, form definitions and handlers,
data providers, option providers, Calendar adapters, authoring extensions, routes, and other provider
types explicitly supported by the module contract. A controllerless module must contribute a meaningful
artifact and omits all Controller fields and loaders. When present, the controller coordinates the
module's runtime state, data, and signals; it is not itself the selectable module and must not activate one.

Area module settings are the declarative activation surface for optional runtime modules and are
persisted as `runtimeModules`. Runtime modules must not be selected through hard-coded area-name
switches. Selecting an optional module id makes that module eligible in the area; it does not eagerly
load every implementation contributed by the module.

The v1 persisted activation shape is a unique string array of namespaced module ids:

```ts
type PhiRuntimeModuleId = `${string}/${string}`;
type PhiAreaRuntimeModules = readonly PhiRuntimeModuleId[];
```

The array is selection only. Controller types, controller instance keys, controller addresses, and
controller config do not belong in it. The `core` Module and the locked Area base module are omitted.
Module-specific persisted config is not part of this v1 activation shape and requires a separately
approved contract if needed.

`moduleId` and controller type are explicit, separate manifest fields even when a first-party module
currently gives them the same namespaced string. The resolver must not derive either identifier from
the other: module ids are persistence and activation ABI, while controller types are instance and
signal-address ABI.

The `core` Module contains the minimal shared CMS runtime and generic Form primitives needed to resolve and
render content. It is represented by the catalog's single `kind: "platform"` contribution and is never
selectable or persisted in `runtimeModules`; concrete form-controller instances are created only when a
resolved CMS tree requires them. Every other contribution is `kind: "module"`: the Area contract locks
exactly one base module, while optional first-party and third-party modules are activated by their
namespaced module id.

An installed NPM package may register any number of logical modules, but every module owns exactly one
controller type. Every contributed Widget, Layout, controller, form/provider definition, data
provider, option provider, and authoring extension has exactly one `ownerModuleId`.
The module owner controls availability, definition/loader identity, versioning, and migration
responsibility. A generic contribution reused by several domains belongs to Core or to its own module;
it must never have several owners. A controller that needs independent activation, ownership, or
lifecycle defines another module rather than becoming a second controller inside the first module.

Ownership is separate from dependencies and signaling:

- one widget/layout may declare several required controller types
- an Area base module is always active; optional eligible modules must be enabled explicitly by the Area policy
- controller requirements and module dependencies never auto-enable another module
- one instance may wire signals to any compatible controller, widget, layout, or region without
  changing ownership
- a module may expose named data providers to generic Core widgets; those providers retain their module
  ownership and are available only while their `ownerModuleId` is active
- provider metadata and execution are separate: the module definition and Server registry carry only
  serializable descriptors; executable provider Client loaders live only in immutable Area-local Client
  manifests, and the Server host passes demanded provider keys across the Flight boundary
- Provider execution mode (`static | live`) is independent from Authoring mode (`none | read | edit`);
  `authoringPolicy` is not part of the v1 descriptor ABI
- provider descriptors declare `kind: "options" | "table" | "collection"`; generic controls filter descriptors by
  kind and executable Clients register only in the corresponding scoped provider context
- first-party provider-key constants are owner-scoped so importing a Core provider key cannot retain
  Builder or optional-module key catalogs in the Public Client graph

Module activation and controller instance materialization are separate:

- activation happens once for the `core` Module and once per Area-base or selected optional module id
- one active module exposes at most one controller type and may later materialize zero, one, or many
  concrete instances of that type when present
- additional instances must not reload the module provider
- controller instances orchestrate domain state and signals; they must not imperatively import widget,
  layout, form, provider, authoring, or controller registries and must never activate their module
- area configuration selects module ids, never controller types; each controller-bearing module declares
  whether its controller has the required Site mount, receives a default Area mount, or is materialized
  on demand by CMS-instance requirements

The contribution manifest owns that controller mount policy. `site` is reserved for the `core` Module
controller mounted once by the shared Root Layout; `area` mounts the module controller's `default`
instance inside the active Area; `demand` exposes the controller definition but creates instances only
from CMS requirements. Form uses demand materialization. A second independently mounted controller
requires a second module rather than another controller entry in the same manifest.

A runtime module contains exactly one lightweight controller definition and may additionally contribute:

- lightweight Widget, Layout, form/provider, and authoring definitions
- lazy live-runtime widget and layout loaders
- one module-owned controller Client boundary referenced by that module manifest
- lazy form renderers, field types, validators, and submit/confirm/preview handlers
- serializable `formProviders` metadata for namespaced field types, validation rules, and handlers;
  executable providers are composed explicitly and are never registered through import side effects
- serializable module-owned provider descriptors plus matching live Provider Client loaders
- a serializable controller descriptor including `runtimeSignals`; Builder may catalog endpoint
  capabilities from it without importing or mounting the controller implementation
- concrete demand-controller settings remain the result of the owning widget plugin's executable
  `requiredRuntimeControllers` resolver. Canvas evaluates that resolver only inside the active module's
  authoring Client boundary, exposes only the resulting serializable settings to Wiring, and never
  reconstructs a controller instance from a persisted route receiver
- optional static authoring Provider Client loaders; DB/API/store/subscription-backed providers remain live-only
- one optional lazy module UI provider for package-owned theme, context, CSS, and portal integration
- lazy preview/editor/tool loaders for authoring modes
- optional route or other package-owned runtime contributions when their existing registry contracts
  allow them

Widget and layout descriptors carry their complete lightweight definition directly. The Builder derives
serializable metadata from those definitions. For layouts, the definition itself is serializable and is
the single source for variants, fields, slots, signals, anchors, and layout defaults; lazy
implementation plugins reuse it and add only parsers, serializers, and renderers. Builder Picker and
Inspector metadata is built from the exact resolved Canvas module set and never from a global
first-party widget/layout implementation registry.

Every installed catalog entry directly declares its complete lightweight widget/layout definitions and
their lazy Server loaders. The catalog derives namespaced ownership from these entries and validates it
globally without invoking executable module loaders. There is no parallel ownership list or duplicate
widget/layout array in the executable module object; inactive catalog entries remain diagnostic metadata
and do not become renderable.

#### Module UI provider boundary

A module may use Ant Design, Material UI, Radix, another component library, or package-owned controls
internally. The component library is not part of the cross-module ABI. All public module controls still
implement the standard Phi config, render-mode, control, capability, value-type, route, renderable-block,
and authoring-scaffold contracts, and communicate with their module controller and other instances only
through the standard Phi signal bus.

When a UI library needs React context, theme state, a CSS cache, locale setup, or a popup/portal root,
the module may declare one lazy client UI provider. The runtime host mounts that provider only around
the active module's owned render subtree; the Builder mounts the same boundary inside the target-area
Canvas sandbox for preview and authoring output. Loading the provider does not activate the module and
must not eagerly load module implementations that are not demanded by the current tree and render mode.

The provider boundary is isolated:

- it must not wrap the application root or another module's subtree
- it must not install another signal bus, controller registry, renderer, or fallback path
- module-private React context is not a cross-module communication contract
- CSS resets, generated styles, variables, and theme tokens must be scoped to the module root
- popup, menu, tooltip, dialog, and other portal containers must stay inside the module root or Canvas
  sandbox rather than escaping to an unowned global container
- provider and portal state is disposed when the module subtree or sandbox unmounts

Different UI-library modules may coexist in one area. Their interoperability comes from Phi signals
and shared value contracts, never from importing each other's contexts or component-library state.

The initial first-party ownership modules are:

- `@phis/ui/runtime` for the transitional generic widget/layout catalog while signal/runtime
  infrastructure and generic Form orchestration move to the `core` Module
- `@phis/ui/public` for the Public Area baseline and Contact form domain
- `@phis/ui/auth` for the optional Login/Registration/Confirmation/Reset domain in Public and the
  Site Auth settings contribution in Admin
- `@phis/ui/builder` for Canvas, Workspace, Inspector, Fields, Wiring, and other
  Builder-owned widgets
- `@phis/ui/dashboard` for Area-specific Dashboard routes and projection orchestration
- `@phis/ui/localization` for locale and translation administration
- `@phis/ui/observability` for site-runtime log administration
- `@phis/ui/user-management` for user, invite, role, and permission administration
- `@phis/ui/revisions` for revision history, restore/delete management, and Revisions widgets
- `@phis/ui/theme` for Theme and Brand behavior
- `@phis/ui/asset` for Media, Upload, Picker, and asset data
- `@phis/ui/admin` for the locked Admin shell, navigation surface, root route, and Admin settings
- `@phis/ui/editor` for content/translation editor functionality
- `@phis/support/core` for the separately packaged Support Inbox domain; it is an optional Site Module,
  not a fixed Area, and binds to the Core `threads:v1`, `resource-links:v1`, and `support:v1`
  capabilities

Future domains such as News use their own module rather than joining Admin or Core.

Definitions and loader descriptors must not import their implementation modules. Installed NPM
packages register their loader descriptors at build time; a package name read from the DB must never be
passed directly to an unrestricted dynamic `import()`.

Resolution uses two mandatory gates:

1. Catalog metadata marks the module required, the centralized area policy locks the optional module
   for that area, or the owning area enables the optional module id, making that module eligible.
2. The resolved shell/page tree and current runtime mode require a concrete type from that provider.

Area-locked module policy is resolved identically on the server and client. The Builder module is
locked for the Builder area: it is always active, selected, persisted on the next save, and disabled in
the module selector there, while it remains optional for every other area. Canvas resolution applies
the policy of the edited target area, not the outer Builder area.

Only after both gates pass may the host load the implementation. The host collects distinct required
types first, loads them in parallel, and caches loader promises by provider/type/mode. Supported runtime
modes are conceptually separate even when one route uses several of them:

- `runtime` for normal live rendering
- `preview` for non-authoring previews
- `authoring` for widget/layout editor renderers and inline tools
- `workspace` for Canvas, Inspector, and other authoring infrastructure

`runtime` means normal mounted rendering in any area; it is not synonymous with Pub. A Builder Canvas
widget rendered normally in Editor still uses `runtime` when Editor explicitly enables the Builder
module. `preview` and `authoring` describe how that widget is represented inside an
authoring host.

Every placeable widget and layout must declare an explicit policy for `runtime`, `preview`, and
`authoring`:

- `runtime: custom` uses its normal implementation loader
- `preview` is exactly one of `custom`, `runtimeReadOnly`, `visualSkeleton`, or `visualPlaceholder`
- `authoring` is exactly one of `custom` or `usePreview`

Unsupported/missing behavior is not an implicit fallback. Headless non-placeable components may omit
visual policies; placeable components may not. A generic visual placeholder or `authoring: usePreview`
is valid only when declared by the definition.

Canvas, selection, hover, DnD, Wiring, Effects, Inspector launch, and common toolbar chrome belong to
the shared Authoring/Builder scaffold. Widget/layout modules may contribute specialized editor bodies,
inline authoring, editor tools, or declared overlay layers, but they must not ship another scaffold.
Widget-specific editor tools request config patches through the Builder-owned authoring context; they
never mount or communicate through the target Area controller. The Canvas applies those patches and
owns history plus signal-route lifecycle. Dynamic subcontrols are described declaratively by their
widget definition so endpoint resolution remains plugin-generic.
The Canvas Runtime-emission boundary stays disabled even while an inline authoring body is active.
Editable bodies persist each config change through `authoring.updateConfig()` and must not introduce a
signal-to-draft bridge or a broadcast flush protocol. Structural insert, delete, and move operations
remain central scaffold mutations rather than widget Runtime signals.
Demand-driven controller endpoint discovery follows the same boundary: the loaded authoring widget
plugin evaluates the concrete CMS instance against the current Canvas tree, while the Builder catalogs
the result only for its active page/area ownership context. This discovery does not mount the target
controller or enable its module.

Workspace widgets are a special visual policy, not an exception. For example, a Builder Shell Canvas
widget uses its real interactive Canvas in `runtime`, a read-only region/layout skeleton in `preview`,
and explicitly reuses that skeleton inside the shared scaffold in `authoring`. The skeleton respects
the configured widget size and structure but must not mount controllers, emit signals, mutate drafts,
start DnD, fetch workspace data, or recursively render another interactive Canvas.

#### Builder Canvas module sandbox

Builder Pages and Shells canvases are isolated module sandboxes. The outer Builder area resolves and
mounts its own modules and controllers. Each Canvas independently resolves the exact module set of the
currently edited target area:

- the `core` Module plus the target Area's locked base module
- centralized modules locked for the target Area
- optional module ids selected by the target Area's `runtimeModules`
- only the widget, layout, controller, form/provider, and authoring implementations demanded by the
  target tree and current Canvas render mode

The Canvas must not inherit, union, or progressively accumulate the outer Builder area's active module
registry. Switching the target area replaces the sandbox's active registry and unmounts its isolated
runtime context. Loader promises and downloaded chunks may remain cached, but cached code is not active
unless it belongs to the new target module set.

The Builder controller owns target-area selection and may trigger the server refresh that rebuilds the
sandbox. It must not import modules or widen registries itself. Module resolution remains server-owned,
catalog-driven, and scoped to the Canvas. Target-area controllers are never mounted in the authoring
Canvas: target modules provide definitions, capabilities, and lazy authoring implementations, while
live controller/data/signaling behavior starts only in live runtime.

An unavailable type, inactive owner module, missing renderer, failed loader, or failed node renderer is
a visible node-local Canvas contract error. The affected widget/layout renders the shared
`not renderable` diagnostic block and writes a structured diagnostic warning. `missing-module` does not
raise an additional notification; other renderer failures may raise one deduplicated notification.
The diagnostic block must not crash the complete Canvas. This diagnostic is not a substitute renderer:
the sandbox must
not borrow the corresponding implementation from the Builder registry and must not retain a module
from the previously edited area. Invalid module manifests, duplicate ownership, and invalid area module
selection remain hard ABI errors before node rendering begins.

Area eligibility is a server-enforced activation policy, separate from module ownership. Builder,
Theme, Admin, and Editor are area-exclusive first-party modules: each may be selected only in its
matching Area, and Builder is locked there. Cross-area domain modules such as Ticket, News, Asset,
and future site modules remain optional per eligible Area unless an explicit site policy restricts
them. This keeps internal workspace widgets out of Public while preserving per-Area domain composition.

`PhiCmsSiteBridge` exposes the build-time catalog of installed, statically analyzable provider loaders;
it cannot contain request-resolved registries because area policy and tree demand are not known when the
site bridge is created. Every filesystem Area host supplies an immutable server-safe catalog containing
exactly the modules eligible for that route Area. Builder contains the target-Area union required by
Canvas, but that union does not activate Admin, Editor, or other target modules in the outer Builder
runtime. The catalog does not encode an Area's current selection. For every Area, the request resolves
exactly the Area's locked base module and that Area's persisted optional
`runtimeModules` after applying area eligibility.
The request/runtime host resolves the selected providers and concrete
implementations, and the renderer receives those completely resolved active registries. It must not
import a global default/internal registry, silently widen the eligible provider set, or use a fallback
renderer to hide a missing provider. A tree that references a type outside the activated providers
remains visible through the shared node-local diagnostic instead of terminating the complete tree.

Lazy-loader boundaries must follow the framework execution graph:

- server module/widget/layout implementations use native, statically analyzable `import()` loader
  functions and are collected before being awaited in parallel
- server module manifests contain no Client component reference. The Server host passes only active module
  ids plus serializable controller setting, runtime context, and preload data to the generic Client-owned
  module host
- the `phis-cli`-generated external build projection injects one immutable Controller Client loader
  manifest per route Area. The generic
  live host resolves only active ids through that Area manifest and performs Client-side `React.lazy`
  imports. Every live Area manifest contains exactly its own locked base loader and the loaders eligible for that
  Area; it contains no other Area's base loader or Authoring edge. Inactive module implementation trees remain
  unreachable from the request
- Canvas receives a separate immutable Authoring Client manifest. Only the Builder provider imports it,
  and its entries form the complete target-Area module union so the isolated sandbox can manifest Public,
  Admin, Editor, Theme, and Builder modules without widening any live Area graph
- every eligible Module package exports paired immutable Server and Controller Client Area projections
  sharing one `moduleId`; `phis-cli` validates and composes them without patching Skeleton source. The
  Server projection contains the catalog entry; the
  Controller Client projection contains only its static `loadController` edge. They validate as a 1:1
  Area pair. Builder additionally declares the complete Authoring Client projection with one
  `loadAuthoring` edge per installed target-Area module. Missing, extra, or duplicate projections are hard
  build-time contract errors; no route may silently widen its graph
- each live Area boundary also injects one immutable Data Provider Client manifest containing only provider
  loaders owned by modules eligible for that Area. Server renderers pass only demanded provider keys; the
  Client host resolves those keys through `React.lazy`, so inactive provider implementation chunks are not
  part of the initial route payload. Missing or duplicate provider loaders are hard contract errors
- the Builder Data Provider Client manifest additionally contains the `loadAuthoring` edges for every
  provider whose `authoringMode` permits `read` or `edit`. Canvas passes only demanded keys;
  live-only provider implementations remain unavailable in authoring
- third-party packages export their Server catalog entry, Controller Client Area contribution, and
  Authoring Client contribution, while `phis-cli` composes installed eligible Areas and the Builder
  sandbox union in immutable external build state. A package cannot enable itself for an Area, request a
  package name from persisted data,
  or mutate a global registry. Third-party modules build their authoring boundary through
  `@phis/ui/runtime/authoring-client`; no first-party module switch or parallel authoring registry
  participates in Canvas resolution
- client preview/editor/tool implementations use top-level `next/dynamic` or `React.lazy` declarations
  inside Client Component boundaries, with explicit Suspense/loading presentation where needed
- a Server Component must not dynamically import a Client Component under the assumption that this
  automatically creates a client split
- loader promises are cached by module/type/mode, and lazy declarations must never be created during a
  component render
- broad barrels and `optimizePackageImports` are not substitutes for the provider boundary; static
  arrays that eagerly import every implementation remain broad even when named imports are optimized

The intended resolution sequence is:

1. Resolve the installed module catalog and the area's optional `runtimeModules` policy.
2. Activate the `core` Module, the Area's locked base module, and the selected optional module ids.
3. Resolve shell/page structures and materialize the required controller-instance descriptors.
4. Collect the distinct widget, layout, controller, and authoring types needed for the current runtime
   modes.
5. Load the corresponding implementations in parallel.
6. Mount controller instances through the generic runtime controller host and render through the
   resolved registries.

This contract keeps optional code modular without coupling cross-area domain modules to `/builder`,
`/admin`, or another fixed route. Package-owned Area contributions and the generated build projection
define build-time eligibility, persisted `runtimeModules` select within that eligible catalog, and actual
implementation loading follows the active module set and tree demand. A Module that must become
selectable in another Area publishes the matching Area contribution and requires a regenerated build
projection; it never patches a Skeleton route. Request data must never widen the build graph implicitly.

### Form registry contract

Shared forms are a separate domain from widgets and layouts.

- `WidgetRegistry` owns chrome, flow, and interactive wrapper behavior.
- `LayoutRegistry` owns slot and structure behavior.
- `FormRegistry` owns versioned descriptors, submit semantics, and versioning.

Preset Forms are explicit `forms` entries on their owner Runtime Module's Server Area contribution.
The active target-Area module set is the only preset catalog; there is no global registry, mutable
registration, or import-side-effect discovery. Code presets are the package-published baseline and the
DB-backed registry may store a Site-scoped Published override for the same active namespaced `formId`.
Form work is split into three independent contracts:

- `submit`
  - where the form writes
  - selects a server-resolved active module-owned handler Provider
- `read`
  - where the form loads preview, guard, or lookup data
  - uses the shared data-source contract
- `mutation`
  - where state changes happen outside form submit
  - uses a separate write descriptor contract
  - does not use read cache settings because Next.js only caches GET reads
- `translation`
  - where labels and free text are resolved
  - uses `tr` / `trBulk` plus label-set helpers

The resolver order is:

- try the site DB form first
- fall back to the active module-owned package preset if no DB override exists
- if both exist, the DB form wins as the site-specific override layer

Form plugins follow a server-wrapper/client-inner split:

- the server wrapper loads runtime data and collects translation keys
- the wrapper uses `trBulk` with a plugin-defined `sourceLocale`
- the client inner renders the actual form UI
- forms with a token-driven bootstrap step, such as confirm flows, may expose an additional preview/bootstrap phase before the submit phase; that preview state still belongs to the form contract, not to the widget shell
- the form plugin itself must expose a clear implementation contract for 3rd-party authors

Module-owned preset definition:

- `ownerModuleId`
- `formId` in the `<npm-package>/forms/<form-key>` shape
- `version`, `flags`, `title`, optional `description`, `category`, and `tags`
- one atomic versioned `descriptor` whose `key` equals `formId`
- `submitHandlerKey`
- `confirmHandlerKey` optional
- `previewHandlerKey` optional
- `previewUpstreamPath` optional
- `defaultConfig` optional
- `variant` and runtime `config` optional
- optional server `render` callback for domain orchestration around the same descriptor
- optional server `loadLabels` callback for a namespaced label set

Definitions are created with `definePhiRuntimeModuleForm(...)` and contributed through
`catalogEntry.forms`. The package namespace in `formId` must match the owner module package. Bare ids,
numeric preset ids, and `pluginKey/typeKey` Form identity are not part of the v1 ABI. The complete
third-party guide is
[`components/forms/PRESET_FORMS_HOWTO.md`](./components/forms/PRESET_FORMS_HOWTO.md).

Resolver primitive:

- `resolvePhiFormDefinition({ presetDefinition, overrideDefinition })`
- returns the effective definition, the resolved source, and a render target key
- when both preset and override exist, the override wins
- config objects are merged, not replaced wholesale, so site overrides can tweak preset forms without cloning them

Form controller split:

- Runtime forms, form authoring, and Builder inspector forms are separate controller domains.
- Runtime form execution uses the generic multi-instance form controller:
  - `controller:@phis/ui/form:<instance-key>`
  - It owns runtime form values, field changes, validation state, touched state, dirty state, submitting state, submit, confirm, reset, clear, result, and error signaling.
  - It executes a resolved form definition through the submit/preview/guard descriptor contracts.
  - It may be reused by third-party forms when their lifecycle follows the standard runtime form lifecycle.
- Generic Form primitives and orchestration belong to the `core` Module and are not selected through
  `runtimeModules`. Concrete form-controller instances are materialized only from forms used in the CMS tree.
  - A shell-owned form widget materializes an area-scoped form controller instance.
  - A page-owned form widget materializes a page-scoped form controller instance.
  - The form widget sends to the materialized controller address, but it must not mount the controller itself.
  - `form:default` may exist as a convenience instance, but it is not the fundamental model and must not replace per-form instances when independent state is required.
- The runtime form controller address must not include a handler key.
  - Handler selection belongs to the resolved Form definition through `submitHandlerKey`,
    `confirmHandlerKey`, or `previewHandlerKey`. Transport, target, CSRF, and credential metadata belong
    to the selected immutable server-side handler Provider, never Form instance config.
  - Changing the handler must not change the stable signal address or break existing wiring.
- Form authoring uses a separate Form Builder module with one form-builder controller:
  - `controller:@phis/ui/form-builder:default`
  - It owns editing form definitions, adding/removing/reordering fields, selecting registered field types, selecting handlers, configuring validation rules, previewing definitions, and saving form definition changes.
  - It operates on form definitions, not on public runtime form submissions.
  - The module is optional, client-only, Area-mounted, and deferred to P2. Until its canvas and request
    contract are implemented, its headless controller declares no save/publish capabilities.
- Builder inspector forms belong to the Builder module and its single controller:
  - `controller:@phis/ui/builder:default`
  - It owns Layout, Widget, Region, and object setting forms, Inspector field changes, and
    signal-route table sessions.
  - Inspector section Widgets and services are internal Builder contributions, not a separately
    selectable module or a second controller lifecycle.
  - It must not reuse the public runtime form controller for CMS node configuration.
- Media inspector and media toolbar flows remain Asset controller responsibilities, not form controller responsibilities.
- Third-party form support is registry-driven:
  - third-party packages provide Form definitions through explicit module catalog entries and expose field,
    validation, and submit/preview/confirm handler descriptors through their module definition
  - the generic runtime form controller can execute those forms when they use the standard lifecycle
  - third-party packages add a custom module with its own controller only for a genuinely different lifecycle such as checkout, payment, document signing, a server-state wizard, or a complex configurator
- Form provider metadata is part of the module manifest:
  - field type, validation, and handler keys are namespaced `<npm-package>/<provider-key>` values
  - every provider declares exactly one `ownerModuleId`; catalog construction rejects duplicates and owner mismatches
  - the active module resolver exposes only the active modules' provider descriptors
  - executable field and validation providers are explicitly composed registries; global mutable or import-side-effect provider registration is forbidden
- The form picker and Builder UI must read available forms and handlers from registries, not from hardcoded first-party lists.

Site-side registry resolution:

- `fetchFormRegistry({ apiBaseUrl, internalToken, siteKey })`
- `getResolvedFormDefinition({ ..., formId, presetDefinitions })`
- `listResolvedFormDefinitions({ ..., presetDefinitions })`
- callers pass the active Area's module-owned preset definitions explicitly
- runtime resolution reads only Published DB overrides and falls back to an active package preset
- site-side consumers should use the resolved registry helper instead of talking to the raw DB registry directly

Database form record shape:

- `site_id`
- `owner_module_id`
- `form_id`
- `version`
- `status` (`0` Working Draft, `1` Published, `2` archived Published)
- `flags`
- `descriptor`
- `submit_handler_key`
- `confirm_handler_key` optional
- `default_config`
- `config`

Form-specific rendering contract:

- The normative serializable descriptor shape, responsive 24-unit grid, logical RTL placement,
  label-set references, provider boundary, authoring controls, and signal ownership are defined in
  [`components/forms/README.md`](./components/forms/README.md#descriptor-and-provider-contract).
- `PhiFormWidget` is the generic CMS/runtime host and delegates controlled presentation and validation to
  `PhiFormControl`.
- It should receive `formId` plus optional visual `version` and `variant` selection. Submit target, method,
  CSRF, and credential policy are never Widget or frame overrides.
- The widget should resolve the form through the registry and render the appropriate client/server split for that definition.
- Module-owned package presets have no synthetic DB id and remain the code fallback.
- Forms that need token preview or bootstrap data, such as confirm flows, should resolve that preview state through the Form Control contract instead of branching in the widget shell.
- Every Form uses `PhiFormControl`. Optional code wrappers may orchestrate guard, bootstrap, success,
  error, and domain-specific flow around that descriptor, but cannot define another field tree. Form field
  providers compose only Phi Controls and never Widgets, Layouts, or direct Ant Design primitives.
- Visible submit/reset/cancel actions are ordinary Phi Button Widgets outside the Form. They reach the
  concrete Form through the owning Controller's declared routes; the Form descriptor has no action row.
- `formKind`, rendered fallbacks, and hybrid modes are not part of the v1 ABI.

Submit dispatch contract:

- `submitHandlerKey`
  - stable logical handler name such as `auth.login`, `account.email.change`, `forms.contact`, or `site.form.submit`
- `previewHandlerKey`
  - stable logical preview/bootstrap handler name such as `auth.confirm.preview`
- `category`
  - coarse dispatch scope such as `auth`, `account`, `forms`, or `site`
- `route target`
  - the actual execution endpoint selected from the active module-owned handler Provider by the Site gateway
  - examples:
    - `phi-server:/api/auth/route.ts`
    - `phi-server:/api/account/route.ts`
    - `phi-server:/api/forms/route.ts`
    - `site:/api/site/forms/route.ts`

The Site gateway resolves the Published Form from the active target-Area module catalog, resolves its
handler key to the immutable active module-owned handler Provider, and only then maps the Provider's
category to the concrete target. A Form revision or Client request never chooses the target.

Submit dispatcher contract:

- the browser must never call `phi-server` directly
- the browser talks only to a site-local dispatcher or server action
- the Browser sends only `formId`, the closed phase (`submit` or `confirm`), and validated values to a thin
  Site route such as `/api/site/forms`
- the dispatcher resolves the Published Form and handler Provider on the Server and constructs all
  execution metadata from that immutable Provider
- `phis-ui` may help resolve the descriptor, but it does not execute the submit itself
- the site dispatcher may be implemented as:
  - a route handler
  - a server action
  - a small relay wrapper that forwards to a category-specific target
- the handler Provider owns `handlerKey`, phase, category, transport, method, canonical `upstreamPath` or
  `endpointKey`, CSRF metadata, and the mandatory closed `credentialPolicy`
- `credentialPolicy` is exactly `none`, `site-session`, or Core-only `auth-link`; a future mode requires
  operator-approved contract work
- `none` is for anonymous Site-scoped handlers and forwards no Browser cookie, while preserving trusted
  Site/internal gateway identity and endpoint validation; `site-session` forwards only `phis_session`, and
  the endpoint still decides whether the session and a particular role are required
- Client payload, Form config, Site override, Widget config, and signals cannot select execution metadata,
  name a cookie, or grant authorization
- Translation payloads stay out of the data-source contract and the submit contract.
- the dispatcher then chooses one of the category targets:
  - `phi-server:/api/auth/route.ts`
  - `phi-server:/api/account/route.ts`
  - `phi-server:/api/forms/route.ts`
  - `site:/api/site/forms/route.ts`
- no single global submit route should own every form flow
- Persisted forms should be site-scoped and plugin-scoped, with positive IDs and flags for stateful control.
- Shared preset Forms select registered handler keys. Immutable handler Providers keep upstream targets,
  CSRF, and credential policy declarative without placing security metadata in editable Form config.

Recommended initial shared form IDs:

- `login`
- `registration`
- `contact`
- `confirm`
- `reset-password`

Planned later form IDs:

- `profile`
- `email-change`
- `password-change`
- `address`

This contract keeps the form domain editor-friendly and plugin-friendly without turning widgets or layouts into a special-case form system.

### Shell and region rules

- Shared shells orchestrate regions and own placement for all stable shell slots.
- Stable outer regions should belong to the area layout contract, not to each page by default.
- Page-owned payload for `hero`, `header_bottom`, `sider_right`, `footer_top`, and `content` should resolve into explicit shell placeholders instead of creating a second inner shell topology inside the page stack.
- Regions define stable named areas such as `brand`, `navigation`, and `actions`.
- Page content flows from site `page.tsx` into the explicit shell-mounted `content` slot of the shared CMS shell.
- Pages may contribute additional widgets into explicitly allowed slots of area-owned regions, but they should not own or replace those regions.
- Initial route/region loading strategy should usually be handled above widgets and modals with `loading.tsx` and `Suspense` boundaries at shell/region/page level.
- Widget and modal loading states should focus on user-triggered interaction such as submit, pending, success, and error states.

## Public package surface

The preferred public import style is grouped by namespace:

```ts
import { PhiCmsShell, PhiRootLayout } from "@phis/ui/shells";
import { PhiCmsRootLayout } from "@phis/ui/cms/root-layout";
import { PhiCmsRootPage } from "@phis/ui/cms/root-page";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "@phis/ui/cms/plugins";
import { PhiLink } from "@phis/ui/navigation";
import { ContactForm } from "@phis/ui/forms";
import { PhiBaseRole } from "@phis/ui/constants";
import { hasPhiFlag, buildApiUrl } from "@phis/ui/helpers";
import { phiRuntime, tr } from "@phis/ui/server-helpers";
import { buildPhiAuthProxyHandlers } from "@phis/ui/gateway";
```

For CMS-driven sites, use the narrow `@phis/ui/cms/*` entry matching the App Router boundary.
Use the aggregate `@phis/ui/cms` entry only when a module intentionally needs the complete CMS
API. Internal package source must always import leaf modules directly rather than importing a package
barrel.

Current public namespaces:

- `@phis/ui/widgets`
- `@phis/ui/forms`
- `@phis/ui/shells`
- `@phis/ui/layouts`
- `@phis/ui/navigation`
- `@phis/ui/theme`
- `@phis/ui/constants`
- `@phis/ui/helpers`
- `@phis/ui/server-helpers`
- `@phis/ui/net`
- `@phis/ui/gateway`
- `@phis/ui/modals`

The root package export is not the preferred integration surface.

For CMS-driven rendering specifically:

- prefer plugin registries and `PhiCmsSiteBridge`
- do not treat raw `Phi*Widget` or `Phi*Layout` components as the stable CMS API
- internal shell/region helpers may exist outside the plugin system, but they are implementation details and must use non-`Phi` internal names

## Translation contract

Use the shared public server-only translation helpers directly:

- `tr(msg, params?, ctx?)`
- `tr(msg, params?, ctx?, format?)`
- `trBulk(msgs, ctx?, format?)`
- `trForLocale(locale, msg, params?, ctx?, format?)`
- `trGlobal(msg, params?, ctx?, format?)`
- `trGlobalBulk(msgs, ctx?, format?)`
- `trGlobalForLocale(locale, msg, params?, ctx?, format?)`
- `trBulkForLocale(locale, msgs, ctx?, format?)`
- `trGlobalBulkForLocale(locale, msgs, ctx?, format?)`

Use `phiRuntime()` only when you need runtime metadata itself, for example:

- `const rt = phiRuntime()`
- `rt.siteKey`
- `rt.locale`
- `rt.apiBaseUrl`
- `rt.internalToken`
- `await rt.fetchSiteLocaleConfig()`

Rules:

- free translation helpers read from the request-scoped runtime set by shared CMS root rendering
- `phiRuntime()` without arguments reads that same request-scoped runtime
- `ctx` is empty by default for normal free text.
- Set `ctx` only when semantic conflicts require it.
- `format` defaults to `text`.
- Use `format = "html"` only when the source string is intentional translatable HTML markup.
- Site-scoped `tr`/`trBulk` calls do not carry Site source-language policy through widget runtime. `phi-server` derives the immutable Site `sourceLocale` from the Site context.
- Global Phi Core/package/preset source text is `en` and never inherits a Site locale. The Site `defaultLocale` must never be substituted for it.
- `defaultLocale` is only the final request-locale fallback and is not part of the general widget runtime contract. Locale settings obtain it from their dedicated Admin endpoint.
- Dynamic values must not be part of the string sent to `tr`, `trGlobal`, `trBulk`, or label-set translation. This includes first names, last names, usernames, email addresses, company names, customer numbers, site names, URLs, and similar profile/business data.
- If a translated sentence needs dynamic values, the source text must use positional placeholders and apply the values after translation. The canonical placeholder format is `%1`, `%2`, ...; for example `Login history for %1`.
- Label sets are static UI copy only. They may expose placeholder templates such as `Edit user %1`, but must never be built from resolved user/profile/company/email data.
- Client components must format already-translated placeholder templates locally instead of concatenating translated labels with dynamic values.
- Shared widgets and layouts should load their own dedicated label-set loaders from `components/widgets/label-sets/*` or `components/layouts/label-sets/*`.
- Shared UI label sets should use an internal shared UI translation context by default.
- Use `labels` for Phi-owned UI/control copy and `defaultLabels` for localized default content that is rendered only when CMS/config content is absent.
- Do not pass dummy `labels={{}}`; copy-free renderable blocks should use the explicit `PhiNoLabels` contract.
- Explicit CMS/config text such as `config.label`, `config.title`, or `config.tooltip` wins over `defaultLabels` and common action labels.
- Ant Design locale remains responsible for AntD-internal copy. Do not put Ant Design locale strings or Dayjs/date formatting into Phi label sets.
- Ant Design locale and the shared Dayjs locale bridge already cover pagination, empty state, picker text, validation templates, and date/time UI formatting.
- Phi semantic commands such as save, publish, review, restore, reset, reload, and upload are not Ant Design locale strings; they belong to the shared Common Controls label/icon contract.
- Only use a different `ctx` when the same visible text must intentionally translate differently in another semantic context.
- Widget/layout label-set definitions should use semantic keys mapped to default texts; do not use free-text lookups as the working contract.
- Batch translation transport may be positional internally, but public widget/layout label access should stay semantic and named.
- Free-text page/site copy should usually prefer `trBulk(...)` over many single `tr(...)` calls.
- Translation remains separate from the shared data-source contract and separate from submit dispatch.
- Public translation helpers live under `server-helpers/*`, not under the internal `gateway/*` namespace.
- Repo-local runtime config loading lives under `helpers/site-runtime`; do not re-export it through the public `helpers` barrel because it is server-only and depends on `next/headers`.

## Runtime and server boundaries

- `react`, `react-dom`, `next`, `antd`, and `@ant-design/icons` stay in `peerDependencies`.
- Consuming sites must use `transpilePackages: ["@phis/ui"]`.
- Ant Design SSR/style injection belongs to the consuming site's root layout through `@ant-design/nextjs-registry`, `ConfigProvider`, and `App`.
- Backend-owned state such as session persistence, auth storage, CSRF state, and form-guard verification stays in `phi-server`.
- Internal Phi-server adapter functions in `gateway/*` are not public package API.
- Public server-only helpers must use dedicated namespaces such as `server-helpers/*`.
- `gateway/site-config.ts` is the typed server-side fetch/read layer for site config JSON from `phi-server`; it is not the site-config source of truth and not a widget-specific fallback path for client code.
- A normalized shared widget runtime should distinguish at least:
  - `site`
  - `locale`
  - `area`
  - `viewer`
- `area` is render context, not authorization.
- `viewer.roleClaims` carries one compact flag matrix per provider. Core and third-party role bits never
  share an unqualified numeric namespace.
- `viewer.access` and role claims are runtime/session state. Server resolution and APIs remain the
  authorization authority; Client evaluation is presentation only.

## Locale Capability Contract

- Locale support is resolved centrally by `phi-server` and consumed by `phis-ui`.
- `phi-server` owns the maximum locale capability superset and each site's validated subset.
- The server capability superset must cover at least every target language supported by the configured DeepL target-language snapshot.
- Site locales should use BCP-47-style identifiers where applicable, for example `de-DE`, `de-CH`, `en-US`, `en-GB`, `ja-JP`, `zh-Hans`, `zh-Hant`, `pt-BR`, and `pt-PT`.
- Shared UI must not validate platform locale support and must not assume that site locales map 1:1 to Ant Design or DeepL identifiers.
- A resolved runtime locale must provide:
  - the effective site locale
  - language, script, and region when available
  - text direction
  - Intl locale
  - Ant Design locale key
  - DeepL target language
  - Phi label fallback chain
- Examples:
  - `de-CH -> antd de_DE, deepl DE, fallbacks [de-CH, de, en]`
  - `en-GB -> antd en_GB, deepl EN-GB, fallbacks [en-GB, en]`
  - `zh-Hans -> antd zh_CN, deepl ZH-HANS, fallbacks [zh-Hans, zh, en]`
  - `zh-Hant -> antd zh_TW, deepl ZH-HANT, fallbacks [zh-Hant, zh, en]`
- Ant Design localization must be applied once at the root `ConfigProvider` through the resolved Ant Design locale object.
- Ant Design locale modules should be loaded through an explicit whitelist of dynamic import loader functions, not through a free path expression such as `import("antd/locale/" + locale)`.
- Phi widget and preset labels remain owned by Phi label sets. Ant Design locale and the shared Dayjs locale bridge cover their own UI strings and date/time formatting, including pagination, empty state, modal buttons, picker text, validation templates, and date controls.
- Do not reimplement DeepL target mapping, Ant Design locale mapping, text direction, or fallback chains inside shared UI, widgets, presets, or site apps.
- `x-locale` carries only an explicit locale from a locale-prefixed public route. A Proxy must never
  promote a cookie, browser preference, profile value, or already-resolved locale into `x-locale`.
- Root, CMS, metadata, translation, and redirect consumers use the same request-scoped
  `GET /api/v1/site/locale` result rather than applying their own locale priority.
- Site configuration fetches can stay cacheable by site key. Resolved runtime locale fetches must remain request-scoped because they can depend on user session, cookies, explicit locale, and browser `Accept-Language`.

## Theme and design-system rules

- Shared layout/math primitives stay brand-neutral.
- The base `phi` spacing scale is global across Phi sites.
- Site themes override from that base; they should not replace it with unrelated spacing systems.
- Prefer Ant Design layout primitives (`Layout`, `Flex`, `Space`, `Row`, `Col`) before writing custom CSS layout logic.
- Prefer Ant Design theme/component token configuration before CSS overrides.
- Prefer Ant Design token colors, typography tokens, spacing tokens, and component variants before introducing custom visual values in shared code.
- Special colors or styling settings should be treated as opt-in work and added only after an explicit operator request.
- Shared theme resolution uses three layers:
  - shared root CSS baseline
  - shared default Ant Design theme derived from the `phi` scale
  - site-specific overrides from `site.theme`
- Root layout should compose providers only; visual defaults must come through shared theme helpers and remain overridable by site theme data.
- Shared root typography exposes stable theme slots:
  - `body`
  - `mono`
  - `serif`
  - `accent`
  - `display`
- Shared root typography also exposes `--phi-font-family-system` for widgets that should explicitly use the browser/OS system stack without loading an extra brand font.
- Shared typography sizes use Ant Design-owned variables such as `--ant-font-size-sm`, `--ant-font-size`, `--ant-font-size-lg`, and `--ant-font-size-xl`; no parallel `--phi-font-size-*` contract exists.
- Shell Regions inherit the Ant Design base typography unless explicitly configured. Editorial Widgets default to `fontSizeLG`; an explicit `inherit` remains true CSS/component inheritance.
- Reusable widget typography pickers should target the shared font contracts:
  - `fontFamily = inherit | system | body | mono | serif | accent | display`
  - `fontSize = inherit | xs | sm | base | lg | xl`
- The current `next/font` baseline is intentionally small:
  - `body = Fira Sans`
  - `mono = Fira Mono`
  - `serif = Lora`
- `accent` and `display` remain open site-theme slots for now:
  - `accent` falls back to `body`
  - `display` falls back to `serif`
- Widgets and site themes should reference the shared `--phi-font-family-*` variables instead of hardcoding root font-family strings.

## Current internal structure

```text
phis-ui/
  AGENTS.md
  README.md
  package.json
  index.js
  index.d.ts
  widgets.ts
  forms.ts
  regions.ts
  shells.ts
  layouts.ts
  navigation.ts
  theme.ts
  constants.ts
  helpers.ts
  server-helpers.ts
  net.ts

  components/
    forms/
    navigation/
    regions/
    layouts/
      clients/
    shell/
      internal/
    widgets/
      clients/

  constants/
  helpers/
  gateway/
  server-helpers/
  net/
```

## Out of scope

- site-specific logos and brand identity
- site-specific content and page copy ownership
- backend-owned auth/session/guard verification logic
- App Router route registration inside the shared package
- ad-hoc per-site replacement of the shared base spacing system

## Recommended verification flow

Use the quiet verification runner:

- `pnpm verify` selects the smallest relevant check set from the current Git changes.
- `pnpm verify docs` checks whitespace only.
- `pnpm verify code` runs TypeScript and ESLint.
- `pnpm verify runtime` adds Runtime module contract validation.
- `pnpm verify antd` adds Ant Design doctor.
- `pnpm verify package` validates the compiled distribution.
- `pnpm verify all` is reserved for changes that cross all of those boundaries.

Successful underlying tools remain silent. If a check fails, the runner prints the failed command and its captured
output. Do not use a broader profile than the affected contract requires. Run a full build only when packaging,
bundling, SSR output, or production behavior must be verified explicitly.

### Distribution package

Local workspace consumers continue to use the typed source exports together with
`transpilePackages`, so shared UI edits do not require a manual rebuild. The reproducible
distribution artifact is separate:

- `pnpm build` emits unbundled ESM, declarations, CSS, and a validated package manifest into `dist/`
- the generated manifest preserves every explicit public export key, exposes only ESM runtime targets,
  and keeps CSS in the package side-effect allowlist
- `pnpm package:pack` builds and packs the `dist/` package instead of publishing the workspace source tree

The distribution build must preserve Client and Server directives, lazy imports, and Area-specific
runtime manifests. It must not bundle React, Next.js, Ant Design, or the package's other runtime
dependencies into one library file.

### Production bundler policy

Use the default Turbopack pipeline for both development and production builds of
consuming Next.js sites:

- development: `next dev` (Turbopack)
- production: `next build` (Turbopack)

The temporary Webpack production override was removed after a Next.js 16.2.11
production browser check confirmed that inactive Builder implementations are absent
from the Public Turbopack payload. Continue to verify the downloaded resources and the
interactive route in a real browser rather than comparing build duration or `.next`
size. Use Next's integrated `experimental-analyze` report for module/import-chain
attribution and the reusable `browser-test` Public payload script for transferred bytes.
