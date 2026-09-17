# Builder Contract

This document defines the contract for the `builder` Area. Its sidebar lists Modules, Shells, Pages, Navigation, and Settings, and optional Modules add their own workspaces such as Media, Revisions, Theme, and Dashboard. Designs for Builder surfaces that do not exist are in [design/BUILDER.md](./design/BUILDER.md).

## 1. Purpose

The builder area is the workspace for composing site structure, page trees, branding, media, and layout-driven content. It is not an admin list page and not a public site page. It is a production workspace.

## 2. Non-goals

- Do not turn the builder into a second admin shell.
- Do not mix builder chrome navigation with the site navigation that is being edited.
- Do not use the builder to manage unrelated staff or system administration tasks.
- Do not hardcode implementation details for third-party plugins into the contract.

## 2.1 Contract hygiene

- Any change, extension, replacement, reinterpretation, or widening of this contract requires explicit
  prior operator approval after the exact gap and affected ABI have been presented.
- Analysis, implementation work in an adjacent domain, or approval of another contract does not grant
  permission to change this contract.
- Before introducing a new interface, type, contract shape, or config family, first check whether an existing shared one can be reused, extended, or composed.
- Prefer extending the existing contract over adding a parallel family just because it is convenient for a single feature.
- This contract must not be bypassed through a parallel, shadow, local, Module-specific,
  Provider-specific, or compatibility contract. If it cannot express a requirement, stop and ask the
  operator before implementing another path.
- v1 should use one clear contract path and update callers directly instead of preserving old and new shapes in parallel.
- Prefer explicit contract changes over compatibility shims. ABI breaks are acceptable when they keep the target model coherent.
- If the reuse path is not obvious, stop and ask before adding a new surface.

## 2.2 State contract

- Builder transient state should use the shared scoped store basis from `components/state/scoped-state-store.ts` whenever possible.
- The builder should keep one scoped state family per active area, using the area as the `scopeKey` for the top-level workspace state.
- Builder orchestration, signal handling, and selection semantics stay in the builder wrapper layer.
- The shared scoped store contract is intentionally small:
  - `useStore(scopeKey)`
  - `getSnapshot(scopeKey)`
  - `patch(scopeKey, updater)`
  - `replace(scopeKey, nextState)`
  - `reset(scopeKey)`
  - `deleteScope(scopeKey)`
- Region draft state may use the same shared scoped store basis when a separate transient slice is needed.
- The builder must not move persistent CMS data into the scoped store.
- Root Layout drafts keep `rootNodeConfig` so editor draft, Inspector, and preview snapshot normalize the same Layout contract before any explicit override is applied.
- Widget draft config must follow the same pattern: the widget inspector and any preview/editor consumers must merge the builder meta `defaultConfig` with the current draft through the shared builder helper before rendering or serializing. Do not introduce a caller-local fallback that reconstructs widget defaults separately.
- For `simple-text`, builder draft state may keep a local `text` value for immediate editor input and preview, but the long-term persisted source text for normal CMS-backed nodes should live in `site_content(type=text)` behind `content_id`.
- A future rich-text widget should not overload that path; its long-term persisted source should use a dedicated `site_content(type=html)` record.
- Shared preset trees are the explicit exception and may keep `simple-text` copy directly in `config.text` without first creating `content_id`.
- Widget `renderPreview()` and `renderEditor()` implementations must stay render-only and must not import widget registries or resolve `WIDGETS_BY_TYPE` internally. If a widget needs a portable preview/editor body, it should render from the already passed config and labels only.
- `renderPreview()` may be SSR-safe and may use server helpers such as `tr()`. It should stay inert, but it is not required to be client-only.
- `renderEditor()` remains client-side editor chrome for structure-authoring surfaces. In the builder this path is used when `/builder/phis/ui/shells` or `/builder/phis/ui/pages` edits the actual shell/page composition tree. Other builder workspaces such as `/builder/phis/ui/navigation`, `/builder/phis/ui/revisions`, `/builder/phis/ui/media`, and `/builder/phis/ui/brand` render their workspace widgets through the normal live/server widget path unless those pages are themselves being edited from `/builder/phis/ui/pages`.
- Internal builder widgets that appear on live-rendered builder pages must therefore provide a live/server render path; a `renderEditor()` implementation alone is not sufficient for those workspaces.
- `renderMode` stays a runtime concern and must not be stored inside the root config blob.
- Switching from editor to server-rendered preview sends the materialized transient snapshot through the
  Builder API and navigates with only its opaque preview id. The Site Skeleton owns one stable
  `/builder/api/[[...path]]` App Router entrypoint; endpoint dispatch, payload validation, and preview semantics
  belong to `@phis/ui`.
- The current preview store is a process-local, TTL-bound handoff and is valid only while one Node.js process
  handles both the snapshot POST and the following preview render. `globalThis` and `Symbol.for(...)` share the
  store only inside that process; they do not provide cross-worker, cross-instance, restart, or serverless
  persistence.
- A load-balanced deployment must use a shared transient store before enabling more than one frontend process.
  Stored preview entries must remain ephemeral and be scoped to the Site and authorized Builder session; they
  must not become the persisted CMS Draft source of truth.

## 2.3 Widget editor scaffold contract

Structure-authoring canvases use one shared scaffold for every widget leaf.

- The scaffold owns default inertness, selection, hover, debug boundaries, common tools, and the widget DnD
  move handle.
- Widget content remains visually live-like. Editor safety must not be implemented by setting every
  input/control to its runtime-disabled state.
- The editor runtime centrally suppresses live signal emissions from normal widget bodies while still
  allowing visual listener feedback from explicit authoring tools. Navigation, mutations, mount-time
  actions, and other widget side effects remain forbidden. Pointer interception alone is insufficient.
- The layer order is renderable frame, widget content, generic interaction surface, widget-owned
  authoring chrome, then shared tools.
- Widget-owned interactive editor UI remains supported through the builder plugin:
  - `editorInteraction: "inert"` is the default and `"authoring"` opts editable text targets into the
    common click/blur/outside-click/pointer-leave/Escape lifecycle; non-editable hit targets retain the
    normal Inspector selection path
  - specialized `renderEditor()` output for authoring bodies such as inline editors
  - `renderEditorTools()` for chrome such as command-toolbar add/remove controls
- Single-line inline authoring uses the shared `PhiInlineTextEditor` control. It owns the editor event
  boundary, IME-safe Enter commit, Escape cancel, and blur commit; widgets and layouts provide only
  their domain-specific change, commit, and cancel behavior.
- Widget-owned controls establish an explicit event boundary and must not rely on framework or AntD DOM
  selectors to avoid selection, inspector, or drag handling.
- Scaffold-tool pickers and dropdowns use the shared popup lifecycle. A registered portal overlay keeps
  its owning widget scaffold active; the first outside pointer action closes it and is consumed before
  Inspector selection. Canonical Phi widgets remain the control implementation inside this lifecycle.
- Selection, hover, dragging, and authoring modes are transient builder state. They are not persisted
  widget settings and do not reuse `enabled` or `readOnly`.
- Hover, selection, and debug visuals use distinct translucent theme-aware Phi/AntD semantic tokens and
  must not alter layout geometry.
- The builder/client registry must provide a client-safe editor body. It must never import or invoke the
  server-owned `renderPreview()` as a missing-editor fallback.
- Layouts keep their structural scaffolds and slot interactions. They must not receive a
  full subtree-covering inert layer that would block nested slots or descendant scaffolds.
- Builder scaffold CSS is owned by the Builder Authoring client entry. `layout-authoring-scaffold.css`,
  `layout-affordances.css`, and `builder-scaffold.css` must not be imported by the application Root,
  Public runtime entries, or shared live module manifests.
- Live slot-child, anchor, fallback, and CMS Region geometry belongs in `layout.css`; it is runtime
  layout behavior, not Builder scaffold chrome.
- Builder Client scaffold components use `usePhiConfig().token` and may bridge a live value into
  a component-scoped CSS custom property when a selector or pseudo-element requires it. Builder
  geometry/debug variables remain Phi-specific implementation details; global `--phi-color-*`
  variables are not a theme source.

## 3. Top-level areas

The builder targets these canonical site Areas:

- `public`
- `app`
- `admin`
- `builder`
- `editor`
- `accounting`

Authentication, commerce, and site-specific capabilities are optional modules for `public` and `app`, not Areas.

The Shell runtime-module selector is a projection of the injected runtime catalog for the current
target Area:

- the Platform module and the Area's locked base module are visible, selected, and disabled;
- eligible optional modules are visible and may be selected or removed;
- only optional module IDs are persisted;
- a third-party module appears without Builder-specific code when its injected definition declares
  the target Area and the Site supplies the matching Server and Client Area contributions;
- modules that do not contribute to the target Area are not options and stale cross-Area selections
  are contract errors.

## 4. Shell contract

The builder uses the same site-owned shell contract as the rest of the system, but with a dedicated developer preset.

Required shell intent:

- `header_main` is builder chrome.
- `sider_left` is builder chrome and shell/area organized.
- the builder shell owns one structural canvas viewport for the active workspace.
- `sider_right` is optional and reserved for page organized inspector/context.

The outer shell must not be repurposed as a preview of the target site navigation. The builder chrome and the edited site structure must remain visually and semantically separate.

## 5. Builder chrome contract

### Header

The builder header is for global workspace context, not for editing the target site navigation directly.
It carries the target Area selector, the current workspace title, the theme mode switch, the debug
switch, the account menu, and the Area menu. Save, preview, publish, undo, and redo are the Builder
command toolbar in the workspace's `header_bottom` (see "Builder chrome and `header_bottom` ownership").

The header must not contain a site/project selector. The active site is already known from the current context.

### Left sider

The left sider holds the `builder:sidebar` navigation surface: Modules, Shells, Pages, Navigation, and
Settings from the Builder base Module, plus the items optional Modules inject into it. The sider is not
the final site navigation. It is builder chrome.

## 6. Workspaces contract

`/builder/phis/ui/shells` and `/builder/phis/ui/pages` are different workspaces and must not silently share one editor model.

### Workspace path contract

The builder uses two different routes with different ownership:

- `/builder/phis/ui/shells`
  - edits area-owned shell regions
  - is keyed by the selected target `area`
  - uses the area selector in the builder header as its primary scope control
  - must not behave like a page editor
- `/builder/phis/ui/pages`
  - edits page-owned regions
  - is keyed by `area + page/path`
  - selects its page through the page selector in its workspace `header_bottom`
  - must not implicitly inherit `/builder/phis/ui/shells` save or hydration behavior just because both live inside the same editor shell
  - owns its own workspace chrome above the selected page canvas
  - that workspace chrome is not the same thing as the selected page's CMS region tree

This distinction is not just UI. It is the persistence and hydration boundary for the builder.

### `/builder/phis/ui/shells` load and save contract

`/builder/phis/ui/shells` is strict about its source of truth.

Load rules:

- if a persisted area shell exists in the DB for the selected area, the workspace must load that DB shell as-is
- if no persisted area shell exists in the DB for the selected area, the workspace must load the full `phis-ui` fallback preset for that area
- `/builder/phis/ui/shells` must not build a mixed region-by-region merge of DB and preset content
- page-owned regions are out of scope for this workspace and must not be loaded here

Edit rules:

- once the fallback preset has been loaded into the workspace, it becomes a normal editable snapshot
- the fallback template must first pass through the central preset instantiator; preset-local node keys resolve to canonical 96-bit `PhiCmsInstanceId` values before entering the workspace
- the operator may delete preset widgets, replace them, add new layouts, or change shell config
- the workspace should not keep behavioral source flags or a live link to the preset after the snapshot has been loaded; the derived 96-bit id is the normal CMS instance identity, not preset-tracking metadata

Save rules:

- saving `/builder/phis/ui/shells` persists the full current shell snapshot for the selected area
- this persisted snapshot may still contain widgets or layout structures that originally came from the fallback preset
- after the first successful save, the DB snapshot becomes the only source of truth for that area shell
- the fallback preset is ignored after that, unless the operator explicitly resets the area shell
- explicit reset instantiates the current module-owned preset template again and deterministically restores the same `PhiCmsInstanceId` values; the resulting snapshot may be saved as a Draft and later published without changing those identities
- the first structural insertion into an in-memory preset creates the owning Area Draft before allocating the new node from that Draft revision's shared `nextNodeSequence`

### `/builder/phis/ui/navigation` workspace contract

`/builder/phis/ui/navigation` is the navigation-tree workspace.

It is distinct from both:

- `/builder/phis/ui/shells`
- `/builder/phis/ui/pages`

It edits site navigation trees, not shell regions and not page-capable content regions.

Load and save rules:

- the selected navigation surface is identified by its Area-bound `navKey`
- the runtime/widget contract carries `navKey`, never a database `id`
- `navKey` is persisted canonically as `<area>:<surface>`
- the Area base module declares its built-in surfaces; a Site may add custom surfaces for the same Area
- optional modules contribute navigation only through route-owned injections into declared surfaces
- Builder persists one overlay containing module-item label/icon/placement overrides, tombstones, and Site-owned
  links, containers, and separators; it never persists a materialized copy of module contributions
- module item placement is only the initial position; an editor placement override stores the exact
  `parentId + index` and takes precedence in Draft, Preview, and Live resolution

Selector contract:

- `/builder/phis/ui/navigation` uses an autocomplete selector of the current Area's declared and Site-owned surfaces in
  `header_bottom.left`
- the separate Area tag carries the Area context, so the input displays and accepts only the local surface key
- entering a valid unused local key creates a Site-owned navigation surface in the current Area
- clearing the selector removes the explicit URL scope and returns to the Area's default surface
- selector values and labels omit the Area prefix because the adjacent tag already identifies the Area
- switching the target Area replaces the available surface set
- the selector owns the active navigation-tree scope for the workspace

`header_bottom` contract:

- left:
  - closed Area navigation-surface selector
- center:
  - empty
- right:
  - reset

`save` and `publish` stay global builder actions in the builder header and must not be duplicated in `/builder/phis/ui/navigation/header_bottom`.
Draft/published status also stays in the shared builder chrome and must not be duplicated in the navigation workspace header.

Canvas/content contract:

- the `content` region hosts the Page-source and navigation editor widgets
- the editor materializes the Area base tree plus injections from active modules
- the Page-source panel may create Site-owned internal links by dropping a Page into the tree
- the Add control may create Site-owned links, containers, and separators; a link is internal when its
  href starts with `/` and external when it uses a supported absolute scheme such as `https://`
- deleting a Site-owned container removes only that structural level and promotes its children into the parent at
  the container's former position
- containers are structural and cannot define an href
- module route hrefs and contribution provenance are immutable descriptor data
- Site-owned link hrefs remain editable
- the Type column describes the item shape (`Link`, `Container`, or `Separator`), while Origin
  separately identifies the contributing module or the Site
- every link exposes an `Open in new tab` presentation override; contributed module hrefs remain immutable
- the right-fixed Ant Design Actions column remains visible while the table width changes or scrolls
- module items stay in the editor table when tombstoned; the row is muted and its eye action toggles visibility
- label, icon, and new-tab overrides, reordering/reparenting, and module-item visibility are editable

The builder must not assume that every navigation item resolves to a page path.

### `/builder/phis/ui/revisions` workspace contract

`/builder/phis/ui/revisions` is the revision-browser workspace. It is not an editor canvas and must not rebuild shell/page composition logic inside the table widget.

Scope rules:

- revision scope is selected by `revisionKind`
- supported kinds are `area`, `page`, `navigation`, and `theme`
- `area` scope uses the current builder area
- `page` scope resolves to a CMS storage path, not a navigation item
- `navigation` scope resolves to a navigation key
- `theme` scope resolves to a theme key; `default` is the only required key for v1

`header_bottom` contract:

- left:
  - revision kind selector for Area, Page, Navigation, and Theme
- center:
  - revision status/count widget
- right:
  - delete selected revisions action

Content contract:

- the `content` Region root is a vertical flex Layout
- slot 0 is a `three-column` Layout with left/right padding set to none
- slot 0 middle hosts the concrete revision scope selector
- slot 1 hosts the revisions table
- page scope uses a cascader that includes shared preset pages and DB-backed pages
- navigation scope uses a flat navigation selector
- theme scope uses a theme key selector, currently `default`
- area scope may hide or disable the concrete scope selector

The revision table reads the selected scope. It must not own the header-bottom kind selector and must not construct extra layout around itself.
It renders through the shared provider-backed Table widget. The Revisions module provider owns history
loading, derived row state, review links, restore, deletion, and active-revision guards; the thin
workspace Client owns only scope resolution and coordination with the header controls.

Dynamic selector options should come from generic option providers where the selector can be modeled as a normal select, cascader, segmented control, or similar generic widget. A specialized workspace selector is acceptable only when the visible control type itself depends on the selected revision kind.

### `/editor/translations` workspace contract

`/editor/translations` is the site-content translation workspace.

It is distinct from admin locale configuration:

- `/admin` owns default locale and available locale configuration
- `/editor/translations` owns editing translation values for existing site messages
- `/editor/translations` must not delete source messages
- deleting in `/editor/translations` deletes only one translated locale variant

Workspace navigation:

- `/editor/text` edits textual site content
- `/editor/translations` edits translations for collected site messages
- `/editor/media` edits site media assets when the editor area exposes media

Selector contract:

- target locale is selected from the current site's available locales
- source locale is the current site's default locale
- context filtering uses `tr_site_msg.ctx`
- status filtering uses `all`, `missing`, and `translated`
- search filters source text, context, and translation text

Table row contract:

- each row represents one `tr_site_msg` source message in the current site scope
- each row may have zero or one `tr_site_lang` translation for the selected target locale
- missing rows must be visible through a `LEFT JOIN` style read model
- edited rows are saved by `msgId`, `locale`, and `translation`
- the editor may use inline edit, expandable text, or a focused row editor, but the persisted model is always one translated locale variant

Server endpoint contract:

- `GET /api/site/editor/translations?locale=&ctx=&status=&search=&page=&pageSize=` returns site locale metadata, contexts, and a paged row list including missing translations
- `PATCH /api/site/editor/translations` with `action: "translation"` upserts one translated variant
- `PATCH /api/site/editor/translations` with `action: "translations"` may upsert multiple translated variants
- `DELETE /api/site/editor/translations?msgId=&locale=` deletes only the translated variant for that source message and locale
- locale writes are constrained to the current site's available locales
- source messages are never created by this endpoint; they are collected by normal rendering/content extraction flows

### Builder drag and drop contract

Builder DnD must reuse the shared block and signal contracts. It must not define a second standalone drag/drop model just because the builder happens to use `dnd-kit`.

Rules:

- local drag interaction may use `dnd-kit`
- in the builder, `dnd-kit` is the preferred default engine for new DnD work
- the low-level drag engine is implementation detail only
- semantic DnD capability is declared through:
  - `RenderableBlock.capabilities.draggable`
  - `RenderableBlock.capabilities.droppable`
  - `runtimeSignals.dragDrop`
- semantic DnD lifecycle uses the shared runtime signal bus
- the builder must not send pointer coordinates or other high-frequency movement data through the signal bus
- the builder may send semantic state and outcomes through signals:
  - `state + dragging`
  - `event + drag`
  - `event + drop`
- `runtimeSignals.dragDrop.sources[*]` declares which payload types a plugin or subpart can originate
- `runtimeSignals.dragDrop.targets[*]` declares which payload types a plugin or subpart accepts, and which drop modes are valid
- stable drop modes are:
  - `before`
  - `after`
  - `child`
  - `replace`
  - `append`
  - `swap`
- payload types must be stable, shared, and namespaced strings, for example:
  - `navigation:item`
  - `navigation:page`
  - `cms:widget`
  - `cms:layout`
  - `cms:slot`
  - `media:asset`
- when a widget only needs drag state for chrome, it should stop at `capabilities + state.dragging`
- when a widget participates in cross-widget or cross-region drops, it must also declare `runtimeSignals.dragDrop`
- new builder widgets must not invent separate ad hoc DnD props or registries when the shared DnD contract is sufficient

## 7. Canvas contract

The canvas is the editable preview of the target site shell.

The contract is:

- the canvas renders the target page in its target area
- the canvas contains the target site header and sider structure
- nav items in the canvas are edited in place
- the canvas is where page-level and menu-level structure is manipulated

The builder chrome must stay outside the canvas.

## 8. Navigation editing contract

The target-site navigation is edited inside the canvas, not inside the builder chrome.

Contract rules:

- the canvas may expose the target header navigation
- the canvas may expose the target sider navigation
- the chrome may expose the `Pages` entry point only
- the chrome may not become a second editor for the same navigation tree
- package descriptor `itemKey` values are compile/injection anchors and never persisted as resolved item identity
- resolved module items use deterministic preset-origin Navigation `PhiCmsInstanceId` values
- Site-authored links, containers, separators, and Page references use centrally allocated Navigation
  Draft-origin `PhiCmsInstanceId` values; UUIDs and editor-local identity generators are forbidden
- the first Site-authored insertion creates the Navigation Working Draft before allocating the item id
- every Navigation Draft persists one monotonic `nextNodeSequence`; save, move, undo/redo, publish, and
  reset preserve existing item ids and never derive identity from an array index or path
- overlays key overrides, placements, parents, and tombstones by `PhiCmsInstanceId`; route paths and hrefs
  remain immutable descriptor/provider data

If a page tree is open in the builder chrome, it only selects or creates pages. It does not replace the target-site navigation editor.

## 9. Page and shell region contract

The builder must distinguish between shell-owned regions and page-owned regions.

### Shell-owned regions

Shell-owned regions belong to the active shell profile and are shared by all pages in that area.

Examples:

- `header_top`
- `header_main`
- `sider_left`
- `footer_main`
- `footer_bottom`

### Page-owned regions

Page-owned regions belong to the current page only.

Examples:

- `hero`
- `header_bottom`
- `content`
- `sider_right`
- `footer_top`
- `drawer_right`

Rules:

- shell-owned regions must be editable only if the current shell profile exposes them
- page-owned regions must be editable only inside the current page canvas
- the builder must not allow page-owned content to silently replace shell-owned regions
- the builder must not treat shell-owned navigation as page-owned content
- the inspector must show whether the current selection is shell-owned or page-owned

The contract must preserve this distinction in the canvas tree, the inspector, and the page selector.

### Current ownership split

`/builder/phis/ui/shells` is responsible for area-owned shell regions:

- `header_top`
- `header_main`
- `sider_left`
- `footer_main`
- `footer_bottom`

`/builder/phis/ui/pages` is responsible for page-owned regions:

- `header_bottom`
- `hero`
- `content`
- `sider_right`
- `footer_top`

### Builder chrome and `header_bottom` ownership

Builder workspaces may render their own controls, but they must not bypass the normal Region, Layout, and Widget composition model.

The global workspace chrome for `/builder/phis/ui/shells`, `/builder/phis/ui/pages`, `/builder/phis/ui/navigation`, `/builder/phis/ui/revisions`, `/builder/phis/ui/media`, and `/builder/phis/ui/brand` should be represented by the builder page's normal `header_bottom` region when that workspace exposes such chrome. A typical shape is:

- `header_bottom` region
- one root `three-column` Layout
- left slot: workspace context widget, such as page selector, shell scope, navigation key, or theme scope
- middle slot: builder toolbar widget
- right slot: draft status widget

These are still live-rendered widgets on the builder page. They coordinate through runtime signals; the shell, page, or workspace renderer must not wire toolbar behavior through route-specific props when the signal contract can express the interaction.

A workspace canvas may still own additional canvas-local controls. When those controls belong to the Canvas Widget itself rather than to global `header_bottom` chrome, the preferred structure is an internal vertical flex Layout with `gap = 0`:

- slot 0: optional `three-column` canvas header for canvas-local controls
- slot 1+: the actual canvas or workspace body

This canvas-local header is part of the canvas widget's own layout. It is not a replacement for the builder page's `header_bottom` region.

### `/builder/phis/ui/pages` selected page header contract

When `/builder/phis/ui/pages` edits a selected page, that selected page's own `header_bottom` must remain a normal page-owned CMS region.

- it belongs to the currently selected page
- it owns its own root layout node and child tree exactly like `hero`, `content`, `sider_right`, and `footer_top`
- it must be rendered inside the page canvas when the selected page defines it
- it must not be hidden, replaced, or merged with the builder page's workspace `header_bottom` chrome

The shared mistake to avoid is collapsing these layers into one `header_bottom`.

- the builder page `header_bottom` is workspace chrome rendered through normal CMS composition
- the selected page `header_bottom` is page content rendered inside the page canvas
- any canvas-local header is owned by the canvas widget and is neither of the two above

They may appear stacked visually, but they are different ownership layers and must remain separate in:

- selection
- inspector targeting
- hydration
- persistence
- preview

The builder shell itself may expose one structural canvas viewport, but that viewport is not the same thing as the page-owned CMS region `content`.

## 10. Area filter contract

The builder must work against one selected target area at a time.

Allowed initial area values:

- `public`
- `app`
- `admin`
- `builder`
- `editor`
- `accounting`

The area selector must filter:

- pages
- menus
- layout instances
- preview state

The area selector must not be treated as a global site switcher.

## 11. Inspector contract

The inspector is workspace UI, not a separate forms system.

The canonical workspace structure is three Builder-Module Drawer Overlays: one Region Inspector, one
Layout Inspector, and one Widget Inspector. They are Area-owned because the same instances serve both
`/builder/phis/ui/shells` and `/builder/phis/ui/pages`. They are not Page-owned duplicates, normal `drawer_right` Regions,
or imperative Drawers mounted by an Inspector host Widget.

The Builder Module contributes them as Area Overlays rather than declaring them in its Area shell preset.
Saving `/builder/phis/ui/shells` for the Builder Area itself would otherwise take them with it: the saved
snapshot replaces the code preset, and the Drawers the Controller opens would no longer exist.

Each Drawer declares exactly one direct Body root, its own n-slot `PhiCollapsibleLayout`. Every slot
contains one normal Builder-Module Widget for that Inspector section. There is no Stack above the root,
no runtime topology switch, and no client-created Collapsible Layout inside a section host. The Builder
Controller opens exactly the Drawer matching the current `region`, `layout`, or `widget` selection and
closes the other two through Area-scoped Overlay routes.

The resolved Builder Area mounts these Overlay instances directly and independently of Region occupancy.
There is no `drawer_right` Region, host Layout, `builder-workspace-host` Widget, private Drawer Control, or
other invisible slot whose presence activates the Inspector. The Builder Controller owns selection and
Overlay orchestration. Each section Widget reads that Controller/workspace state and renders only its own
declared Inspector section in the Collapsible slot that owns it.

The active selection is the source of truth.

- The Inspector only edits the currently selected `region`, `layout`, or `widget`.
- Any committed change must patch the active node immediately.
- The inspector may keep only transient UI state such as focus, open popovers, or incomplete text entry.
- When the inspector is reopened, it must rehydrate from the current node state, not from a separate inspector draft.

It reacts to:

- `selection/change:json` with `valueSchema: @phis/ui/builder-node-selection`
- `builderMode/change:string`

The `builderMode` channel is Builder workspace state. It is separate from renderable-block
`renderMode`.

It renders for the currently selected:

- `region`
- `layout`
- `widget`

Inspector categories:

- `region`
- `layout`
- `widget`

Category rules:

- `region`
  - `sticky`
  - `offsetTop`
  - `width`
  - `height`
  - `zIndex`
  - `backgroundColor`
  - `backgroundGradient`
  - `glass`
  - `padding`
  - optional `fullHeight`

- `layout`
  - `width`
  - `height`
  - `minWidth`
  - `maxWidth`
  - `minHeight`
  - `maxHeight`
  - `zIndex`
  - `gap`
  - `padding`
  - `backgroundColor`
  - `backgroundGradient`
  - `rounded`
  - `border`
  - `shadow`
  - `glass`

- `widget`
  - plugin-specific fields
  - plus existing widget contract fields

Behavior:

- `editor` shows full inspector controls and editor affordances.
- `preview` hides editor affordances and disables slot/selection interaction.
- open pickers must close or become inert when switching to `preview`.
- Region, Layout, and Widget use separate Inspector widgets but shared internal controls.
- inspector UI must always rehydrate from the selected node on open.

Preview rendering boundary:

- live and preview content are server-rendered slots
- editor chrome is a client island over or around those slots
- the client editor may own selection, inspector state, picker state, drag handles, and insert affordances
- the client editor must not import widget live renderers or server-only helpers to produce preview output
- server preview receives a serialized draft tree as input and renders through the normal CMS layout/widget renderer
- draft synchronization into the server preview is an explicit transport concern and must use a documented route, action, or persistence path
- do not use a second widget preview registry as the long-term contract

Control rules:

- use AntD `ColorPicker` for single colors and gradients
- use presentation-only Phi Controls for background, border, shadow, padding, geometry, viewport,
  placement, gap, radius, and asset/image selection; the established viewport and placement contracts
  remain `PhiViewportVisibilityControl` and `PhiPlacementMatrixControl`
- independently placeable Inspector sections use Builder-Module Widget counterparts that compose those
  Controls and adapt their value signals to the Builder Controller; they do not become public Core CMS
  Widgets merely because they appear in a CMS Overlay tree
- selected node values and Drafts remain Builder Controller/workspace state; Inspector Widget config owns
  only its own presentation and binding metadata
- the Layout padding Inspector exposes `top`, `left`, `right`, `bottom`, and `gap`; the Region padding Inspector exposes the four padding sides without Layout gap
- use `usePhiConfig().token` in Client controls and Ant Design `--ant-*` variables in Builder CSS for colors, typography, control sizing, and spacing
- use fixed numeric or literal values only when the builder contract explicitly needs hard geometry or no suitable token exists
- Inspector and workspace widgets use the same module-owned plugin contract as every other Widget;
  their owning Area or optional module controls availability, never a reserved category value
- Collapsible slot order, title, open state, and panel presentation are Layout config. Moving a section
  Widget does not move or rewrite a slot title; the operator edits the target title separately. Empty
  live slots are omitted without deleting their configured titles.

Renderable block contract:

- the shared Inspector treats Layouts and Widgets as renderable blocks; Regions use the shared Region runtime contract
- renderable blocks expose `renderMode`, `visibility`, `enabled`, `size`, `minSize`, `maxSize`, `collapsedSizeHint`, and optionally `zIndex` and `className`
- `renderMode` defaults to `live`
- `visibility` defaults to `visible`
- `enabled` defaults to `true`
- renderers normalize an unset `zIndex` to `0`
- renderers normalize geometry, spacing, and padding to longhand DOM properties only
- prefer Ant Design tokens over fixed pixel values for generic visual semantics; use Phi-specific values only for structural Builder geometry
- shorthand and longhand must not be mixed for the same CSS value on the same rendered element
- `renderMode` values are `live`, `preview`, and `editor`
- `renderMode` is transient render-path context and is not controlled through runtime signals
- `visibility` values are `hidden`, `collapsed`, and `visible`
- `enabled: false` means the block remains present but should not accept interaction
- `hidden` means no layout participation
- `collapsed` means reduced participation with a collapsed size hint
- `visible` means normal layout participation
- `setVisibility`, `setEnabled`, `setSize`, `expand`, `collapse`, `show`, `hide`, and `toggle` are block-level commands
- those commands target a renderable block id
- `style` is not part of the public block contract; renderer-specific inline styling stays in the component implementation
- `className` is the supported CSS extension hook for third-party styling
- `size` is the canonical public preferred geometry form; `minSize`, `maxSize`, and `collapsedSizeHint` are the semantic geometry constraints

## 12. Plugin meta contract

The builder treats registry entries as a discriminated contract by `kind`.

Required builder kinds:

- `layout`
- `widget`

Shared builder metadata:

- `title`
- `description`
- `icon`
- `iconName`
- `iconFamily`
- `iconKey`
- `category`
- `tags`

Icon contract:

- plugins provide local `iconName` and optional `iconFamily`
- the resolver composes a fully qualified `iconKey` as `pluginKey:iconName`
- the `pluginKey` namespace is expected to be package-scoped, for example `@phis/ui/layouts` or `@phis/ui/widgets`
- Layout icons use the plugin motif inside one rectangular Layout frame.
- the plugin itself must not decide the frame geometry
- `widget` icons may use a plugin-local icon name or fall back to the type family
- widget families are resolver-owned and may fall back to `basic`, `navigation`, `form`, `content`, `commerce`, `auth`, `admin`, `developer`, or `internal`
- the builder picker may use the resolved `iconKey` when a plugin-specific icon exists, otherwise it may fall back to the shared `icon`

Rules:

- `layout` entries are container types.
- container slots are reorderable by default.
- `widget` entries are leaf nodes.
- widgets must not define slots or children in the current contract.
- a future composite-widget contract would need an explicit new kind or extension instead of silently reusing `widget`.

## 13. Slot contract

Slots are explicit placement targets inside Layouts.

Rules:

- slots must be visible in the canvas as dotted or dashed drop areas
- empty slots must remain visible
- filled slots must still be identifiable as slots when selected or hovered
- named slots must preserve their semantic label
- sequential slots may be displayed with index hints when helpful
- slots may accept only the node types allowed by their parent Layout
- a slot is not itself a widget
- a slot is not itself a page

Slot behaviors:

- `+` actions may appear on slots when the slot can accept new content
- the inspector may expose slot assignment and slot content only for the selected slot
- slot ownership must be clear in the canvas hierarchy
- slots are placement targets, not first-class editable nodes
- slots do not need a dedicated slot inspector unless a future contract explicitly introduces one

## 14. Placement contract

Every Layout and Widget from the active target-Area module set is insertable unless the
receiving slot rejects its structural kind.

Rules:

- area-specific and region-specific placement fields are not part of the plugin contract
- `supportedSlotKeys` is intentionally not part of the contract
- a Layout slot should generally be compatible with reordering
- a widget is always treated as a leaf node and must not expose slots or children
- Platform Widgets are available in every Area; Area-base Widgets are available only in their locked
  Area; optional first- or third-party Widgets are available wherever their owner module is eligible
  and active
- `category` is presentation metadata for grouping, ordering, colors, and search; it must never grant,
  deny, hide, or otherwise control authoring availability
- Widget and Layout categories use the closed semantic set `content`, `navigation`, `form`, `data`,
  `media`, `commerce`, `account`, `configuration`, `structure`, `workspace`, `developer`, and `other`.
  Package/module ownership is an independent Picker filter and must not be encoded as a category.
- technical implementation details that must never be inserted are not registered as CMS Widgets

## 15. Insert picker contract

The builder should not expose the full registry as one undifferentiated list.

The insert picker is an immediate Picker under the normative
[Picker boundary](./OVERLAYS.md#picker-boundary). Its trigger and popup anchor are the invoking empty Slot
or Region affordance; it is never a Modal or Drawer. It propagates selection immediately, commits the
result and one Undo/Redo transaction on normal close, and restores its opening snapshot only on Escape.
It has no close button or Save, Apply, and Cancel actions.

The insert picker must begin with a type switch and lives in the Slot/Region context:

- `Layouts`
- `Widgets`

### Layout view

- show only layout plugins
- group by structural role or slot shape, using `category` as the primary picker bucket

### Widget view

- show only widget plugins
- group by application category first
- allow secondary grouping by origin or vendor

Widget application groups:

- `content`
- `navigation`
- `form`
- `data`
- `media`
- `commerce`
- `account`
- `configuration`
- `structure`
- `workspace`
- `developer`
- `other`

The secondary package filter uses the owning NPM package id and applies to Widgets and Layouts. It is independent from the semantic category filter.

Rules:

- the picker is the primary insertion UI for Layouts and Widgets
- the picker source is exactly the `core` Module plus the target Area's locked base module plus the
  optional modules active in that Area
- the picker must not apply a second Widget-level Area list, authoring policy, category blacklist, or
  first-party registry after resolving that active module set
- an optional third-party module may declare eligibility for any canonical Area; activating it in one
  Area exposes its owned Widgets only in that Area
- picker section and widget category filters are area-scoped session state
- the last picker section and selected widget categories should remain stable for the current area until the builder state is rehydrated
- incompatible items must not appear as normal choices
- the picker may still show disabled or hidden items only when an explicit debug mode requires it
- the picker should support search

## 16. Canvas region ownership contract

The canvas must visually distinguish shell-owned regions from page-owned regions.

### Shell-owned regions

- belong to the active shell profile
- are shared by all pages in the area
- should usually appear in the canvas frame outside the page body
- may be shown as fixed shell bands, rails, or containers
- are edited from `/builder/phis/ui/shells`
- should not reload on pure page changes

### Page-owned regions

- belong to the current page only
- are part of the editable page canvas
- should appear inside the page body or page frame
- are edited from `/builder/phis/ui/pages`
- should change when the active page/path changes, without rebuilding the area shell
- may change from page to page without changing the shell profile

Rules:

- shell-owned regions must have a stronger structural frame than page-owned regions
- page-owned regions must remain editable without implying shell ownership
- the builder must not treat shell-owned navigation as page-owned content
- the inspector must show ownership clearly
- the canvas should preserve the difference even when the visual style is subtle

## 17. Visual representation contract

The builder must visually distinguish the structural layers of the canvas.

Required representation rules:

- `layout` nodes are structural containers with optional configured padding and chrome.
- `widget` nodes are leaf content blocks.
- `slot` areas should be shown as explicit drop targets, typically as dotted or dashed containers.

The canvas should not flatten these layers into a single generic card UI.

Recommended visual cues:

- layout containers: subtle outline or lightweight bounding frame
- configured Layout chrome remains visible inside the structural outline
- widget leaf nodes: compact cards or labeled blocks
- empty slots: dotted placeholder frame with clear drop affordance

Additional rules:

- active selection must be clearly highlighted
- hover state must not be confused with selection state
- nested slots should remain visually readable at all depths
- slot names should stay visible when the slot is empty or when debugging is enabled
- the visual system should still work when widgets are collapsed, empty, or hidden
- `hidden` means the region stays structurally present and may still reserve space.
- `collapsed` means the region is visually off and should release its reserved space.

The exact visual language is open, but the layer distinction is not.

## 18. Draft, save, publish, and history contract

The builder must support a clear change lifecycle.

### Draft

- Workspace-level edits may use draft state for persistence and history.
- Node fields edited through the inspector must patch the active node immediately.
- Draft state may be local, remote, or hybrid, but the contract must remain explicit.
- Dirty state must be visible.

### Save

- `Save` persists the current draft state.
- `Save` must not imply publish unless explicitly labeled.
- Save should be scoped to the active selection when possible.
- Persisted config should be sparse: omit values that are unset, empty, or equal to the canonical default.
- Save should serialize the smallest stable override shape and let the reader restore defaults on load.

### Publish

- `Publish` promotes the saved state to the active runtime state.
- Publish is a separate action from save.
- Publish should be available only when the current selection or workspace supports it.

### Undo / Redo

- `/builder/phis/ui/shells`, `/builder/phis/ui/pages`, `/builder/phis/ui/navigation`, and `/builder/phis/ui/theme` expose
  `Undo` and `Redo` in the middle slot of the `header_bottom` three-column layout.
- The command toolbar emits semantic command signals. Shell, page, and navigation commands target
  the Builder Controller. Theme commands target the Theme Controller directly; Theme must remain
  usable as an independent module and must not depend on or proxy through the Builder Controller.
  Its review area comes from the Theme widget config or the hosting runtime; the Builder-hosted
  default remains `public`.
- Controllers emit boolean `enabled/change` feedback signals to the concrete `undo` and `redo`
  toolbar subcontrols. A toolbar button is disabled when its active history scope has no matching
  entry.
- History is local draft history and is scoped as follows:
  - shell structure: area;
  - page structure and metadata: area plus page key;
  - navigation: area plus navigation key;
  - theme: site plus theme key; it does not read Builder workspace state.
- Undo/Redo must never cross an area, page, navigation, or theme scope implicitly. Loading a new
  server draft clears the corresponding local history.
- One user gesture is one history transaction. Inspector changes, insertion, deletion, and one
  drag/drop move each create one reversible entry. A move between Regions records the source and
  target Region drafts atomically so Undo cannot restore only half of the move.
- Creating or deleting a persisted page and destructive reset commands are lifecycle boundaries,
  not local reversible edits. They require their existing confirmation/persistence flow and are not
  added to local Undo history.

### Structure drag and drop

- Structure authoring uses one `dnd-kit` context around the complete Shell or Page canvas. Pointer
  sensing, collision detection, and the visual drag overlay stay local to that context.
- The Builder Controller declares and emits only semantic `drag/start`, `drag/change`,
  `drop/drop`, and `drag/stop` signals with the shared `dragDrop` value schema. Pointer coordinates
  and continuous movement events are not sent through the runtime signal bus.
- In editor mode, non-root Layout and Widget scaffolds expose a move handle.
- Slot insertion affordances are move targets. Widget scaffolds are swap targets for Widget payloads.
  Dropping keeps CMS instance IDs and moves the complete node data.
- A Widget-on-Widget drop uses `swap`: both Widgets exchange `parentLayoutNodeId`, `slotIndex`, and
  `sortOrder` while retaining their identities, configuration, content, and signal routes. The swap is
  one atomic history transaction, including when it crosses Regions.
- Sequential layouts insert at the chosen position and compact sibling slot indexes. A fixed-slot
  target rejects a drop when its slot is already occupied.
- Moves may cross Regions only within the same ownership scope: shell Region to shell Region or
  Page Region to Page Region. A Layout Root may move into a Layout slot in another
  Region, leaving its source Region empty. Conversely, a Root or nested layout may be promoted to
  the Root of an empty Region. Occupied Region Roots are never replaced implicitly. Shell/page
  boundary crossings, same-tree Root moves, self/descendant drops, and preview-mode moves are
  rejected.
- The structure mutation is completed before its history transaction is published; Undo/Redo
  therefore observes only complete trees.

### Autosave

- Autosave is allowed only if it is explicitly visible and predictable.
- Autosave must not replace the save/publish distinction.

### Revision identity

- Changes should be traceable to a page, area, or workspace context.
- Revision metadata should include selection scope and area.

## 19. Workspace signal contract

The Builder uses the same v1 signal ABI as every live runtime. The binding definitions live in
`types/signals.ts`, `AGENTS.md`, and `components/widgets/README.md`; this section describes only the
Builder-owned configuration flow.

- Plugins declare immutable capabilities through `runtimeSignals.emits` and `runtimeSignals.listens`.
- Concrete CMS instances persist routes through `signalRoutes.emits` and `signalRoutes.listens` in
  their config. There is no `signalWiring`, `topic`, `target`, `source`, payload key, or signal `kind`.
- Every persisted route has one stable `routeKey` and one declared `capabilityId`. Route CRUD uses the
  former; runtime dispatch uses the latter.
- Sender outputs declare `id`, `action`, `valueType`, and an optional JSON `valueSchema`. Receiver
  inputs additionally declare their stable `channel`.
- A route copies the chosen receiver input's `scope`, `channel`, `action`, `valueType`, and
  `valueSchema`; scope is derived and read-only in Wiring.
- Normal Wiring targets one concrete `cms:`, `region:`, or `controller:` receiver. It does not offer broadcast; multiple
  receivers require multiple explicit routes.
- Widget subcontrols use the owning Widget address plus a subcontrol suffix. Layouts use
  the same concrete `cms:` address family. Slots are controlled through their owning Layout and are not
  signal addresses.
- Regions expose concrete `region:<region-key>` receiver endpoints and inherit the standard
  renderable-block inputs. Shell-owned Regions derive `scope: "area"`; page-owned Regions derive
  `scope: "page"`. Region endpoints do not invent additional outputs or Region-specific channels.
- Controller endpoints use `controller:<npm-package>/<controller-key>:<instance-key>`. Active
  area-mounted controllers expose `default`; demand instances require concrete materialized settings.
- The Wiring modal uses the selected sender's declared outputs to filter compatible receiver inputs by
  action, value type, and JSON schema. Route scope and receiver channel need not match a sender-side
  channel because outputs do not declare one.
- Add, edit, and delete operations run in a Builder-owned table-provider session. Only Apply writes the resulting
  route set to the selected CMS instance; Cancel discards the session.
- Missing or unmounted configured receivers remain visible as contract diagnostics. Wiring must not
  hide them, infer an address, or borrow an endpoint from another module.
- Canvas runtime signal emission stays disabled. Wiring changes instance config through the Builder
  controller; target-Area controllers are not mounted merely to configure their endpoints.

## 20. Contract rule

Until a decision is written here, the builder implementation must not invent its own contract.
Only the contracts documented in this file are stable.
Changes to those contracts require the explicit prior operator approval defined in section 2.1 and must
not be introduced through a parallel implementation contract.
