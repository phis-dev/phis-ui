# Builder Contract

This document defines the contract for the `builder` Area. The Builder base Module is
`@phis/ui/modules/builder`; its routes live under its package, so its workspaces answer at
`/builder/phis/ui/<workspace>`. Its sidebar lists Modules, Shells, Pages, Navigation, and Settings, and
optional Modules add their own workspaces: Media (`@phis/ui/modules/asset`), Revisions
(`@phis/ui/modules/revisions`), Theme (`@phis/ui/modules/theme`), and Dashboard
(`@phis/ui/modules/dashboard`). The signal contract the Builder uses is in [SIGNALS.md](./SIGNALS.md);
Overlays are in [OVERLAYS.md](./OVERLAYS.md). Designs for Builder surfaces that do not exist are in
[design/BUILDER.md](./design/BUILDER.md).

## 1. Purpose

The builder area is the workspace for composing site structure, page trees, branding, media, and layout-driven content. It is not an admin list page and not a public site page. It is a production workspace.

## 2. Non-goals

- Do not turn the builder into a second admin shell.
- Do not mix builder chrome navigation with the site navigation that is being edited.
- Do not use the builder to manage unrelated staff or system administration tasks.
- Do not hardcode implementation details for third-party plugins into the contract.

## 2.2 State contract

- Builder transient state should use the shared scoped store basis from `components/state/scoped-state-store.ts` whenever possible.
- The builder should keep one scoped state family per active area, using the area as the `scopeKey` for the top-level workspace state.
- Builder orchestration, signal handling, and selection semantics stay in the builder wrapper layer.
- The scoped store API is described in [components/state/README.md](./components/state/README.md).
- Region draft state may use the same shared scoped store basis when a separate transient slice is needed.
- The builder must not move persistent CMS data into the scoped store.
- Root Layout drafts keep `rootNodeConfig` so editor draft, Inspector, and preview snapshot normalize the same Layout contract before any explicit override is applied.
- Widget draft config must follow the same pattern: the widget inspector and any preview/editor consumers must merge the builder meta `defaultConfig` with the current draft through the shared builder helper before rendering or serializing. Do not introduce a caller-local fallback that reconstructs widget defaults separately.
- For `simple-text`, builder draft state may keep a local `text` value for immediate editor input and preview, but the long-term persisted source text for normal CMS-backed nodes should live in `site_content(type=text)` behind `content_id`.
- A future rich-text widget should not overload that path; its long-term persisted source should use a dedicated `site_content(type=html)` record.
- Shared preset trees are the explicit exception and may keep `simple-text` copy directly in `config.text` without first creating `content_id`.
- Widget `renderPreview()` and `renderEditor()` implementations must stay render-only and must not import widget registries. If a widget needs a portable preview/editor body, it renders from the already passed config and labels only.
- `renderPreview()` may be SSR-safe and may use server helpers such as `tr()`. It should stay inert, but it is not required to be client-only.
- `renderEditor()` remains client-side editor chrome for structure-authoring surfaces. In the builder this path is used when `/builder/phis/ui/shells` or `/builder/phis/ui/pages` edits the actual shell/page composition tree. Other builder workspaces such as `/builder/phis/ui/navigation`, `/builder/phis/ui/revisions`, `/builder/phis/ui/media`, and `/builder/phis/ui/theme` render their workspace widgets through the normal live/server widget path unless those pages are themselves being edited from `/builder/phis/ui/pages`.
- Internal builder widgets that appear on live-rendered builder pages must therefore provide a live/server render path; a `renderEditor()` implementation alone is not sufficient for those workspaces.
- `renderMode` stays a runtime concern and must not be stored inside the root config blob.
- Switching from editor to server-rendered preview sends the materialized transient snapshot through the
  Builder API and navigates with only its opaque preview id. The Site Skeleton owns one stable
  `/builder/api/[[...path]]` App Router entrypoint; endpoint dispatch, payload validation, and preview semantics
  belong to `@phis/ui`.
- The preview store (`plugins/runtime-modules/builder/preview-store.ts`) is a process-local, TTL-bound handoff and is valid only while one Node.js process
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
  - selects its page through the page selector in its canvas-local workspace header
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

Workspace layout:

- `header_bottom` uses the shared three-column Layout: the Builder command toolbar in the middle slot and
  the draft status in the right slot, as on the Shells and Pages workspaces
- the `content` Region holds two provider-backed Widgets: a Tree of the Area's Pages
  (`@phis/ui/modules/builder/trees/page-source`) and a tree-structured Table of navigation items
  (`@phis/ui/modules/builder/tables/navigation`)
- the navigation surface is a Table binding field `navKey` in the Table's Collection Header: a select of
  the current Area's declared and Site-owned surfaces with a create tool; creating a valid unused local key
  creates a Site-owned surface in the current Area, and switching the target Area replaces the available
  surface set
- the Table emits its binding params to the Builder Controller, which owns the active navigation scope

Item contract:

- the editor materializes the Area base tree plus injections from active modules
- an internal link is created only by dropping a Page from the Page source Tree; it persists the stable
  Page reference defined in [REFERENCES.md](./REFERENCES.md#stable-internal-targets), and its Path cell
  shows the resolved current path
- the Add tools create an external link (an absolute URL), a container, or a separator; an external link's
  href is editable and must be an external URL
- a container has no href of its own; its Path cell may choose one of its direct children as the address
  the container leads to, or `404`
- deleting a Site-owned container removes only that level and promotes its children into the parent at
  the container's former position; module items cannot be deleted, only hidden
- module route hrefs and contribution provenance are immutable descriptor data
- the Type column shows `Link`, `External`, `Container`, or `Separator`, while Origin separately
  identifies the contributing module or the Site
- every link exposes an `Open in new tab` override
- module items stay in the editor table when hidden; the row is muted and its eye action toggles
  visibility
- label, icon, and new-tab overrides, reordering/reparenting, and module-item visibility are editable;
  a delete has no confirmation because the workspace has Undo

The builder must not assume that every navigation item resolves to a page path.

### `/builder/phis/ui/revisions` workspace contract

`/builder/phis/ui/revisions` is the revision-browser workspace. It is not an editor canvas and must not rebuild shell/page composition logic inside the table widget.

Scope rules:

- revision scope is selected by `revisionKind`
- supported kinds are `area`, `page`, `navigation`, and `theme`
- `area` scope uses the current builder area
- `page` scope resolves to a CMS storage path, not a navigation item
- `navigation` scope resolves to a navigation key
- `theme` scope resolves to a theme key; the Site Theme uses `default`

Content contract:

- the `content` Region holds one provider-backed Table Widget
  (`@phis/ui/modules/revisions/tables/revisions`, resource `history`)
- the Table's Collection Header carries two binding fields: `kind` (a select of Area, Page, Navigation,
  and Theme) and `scopeKey` (a cascader, disabled while `kind` is `area`)
- row actions review, restore, and delete a revision; a selection action deletes selected revisions
- the Table emits binding params and mutation results to the Revisions Controller

The revision table reads the selected scope from its binding params. The Revisions Provider owns history
loading, derived row state, review links, restore, deletion, and active-revision guards.

Dynamic selector options should come from generic option providers where the selector can be modeled as a normal select, cascader, segmented control, or similar generic widget. A specialized workspace selector is acceptable only when the visible control type itself depends on the selected revision kind.

### `/editor/phis/ui/translations` workspace contract

`/editor/phis/ui/translations` is the site-content translation workspace, contributed by the Editor
Module (`@phis/ui/modules/editor`). The Editor Area has no other workspace route.

It is distinct from admin locale configuration:

- `/admin/phis/ui/locales` (Localization Module) owns default locale and available locale configuration
- `/editor/phis/ui/translations` owns editing translation values for existing site messages
- it must not delete source messages; deleting deletes only one translated locale variant

The workspace renders a provider-backed Table over the Localization Table Provider's
`editorTranslations` resource. Rows are source messages of the current Site, each with zero or one
translation for the selected target locale, so missing translations are visible. The Provider reads and
writes through the Site route `/api/site/editor/translations` (`GET`, `PATCH`, `DELETE`); the endpoint
contract belongs to `@phis/server` ([phis-server docs/API.md](../phis-server/docs/API.md)). Source messages
are never created here; they are collected by normal rendering and content extraction.

### Builder drag and drop contract

Builder DnD uses the shared semantic drag and drop contract in
[SIGNALS.md](./SIGNALS.md#drag-and-drop): `capabilities.draggable`/`droppable`,
`runtimeSignals.dragDrop` sources and targets, the drop modes including `swap`, and the `drag`/`drop`
channels. The Builder-specific rules are:

- `dnd-kit` is the Builder's interaction engine; it stays an implementation detail
- the Builder never sends pointer coordinates or continuous movement through the signal bus
- the Builder Controller emits `dragStart`, `dragChange`, `dragEnd` (actions `start`, `change`, `stop`)
  and `drop` (action `drop`), all with the `drag-drop` value schema
- structure moves are described in "Structure drag and drop" below

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

The global workspace chrome for `/builder/phis/ui/shells`, `/builder/phis/ui/pages`, `/builder/phis/ui/navigation`, `/builder/phis/ui/revisions`, `/builder/phis/ui/media`, `/builder/phis/ui/theme`, and `/builder/phis/ui/modules` is the builder page's normal `header_bottom` region. Its shape is:

- `header_bottom` region
- one root `three-column` Layout
- left slot: a workspace context widget where the workspace has one -- the mode switch on Shells and
  Pages, the Theme selector on Theme
- middle slot: the Builder command toolbar, on Shells, Pages, Navigation, Theme, and Modules
- right slot: the draft status widget, on the same workspaces

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

### Inspector Overlays

The Builder Region, Layout, and Widget Inspectors are persistent workspace composition, not transient
prompts. They are three separate Area-owned Drawer Overlays -- the Region, Layout, and Widget Inspector
Drawers -- contributed by the Builder Module. The Effects editor Modal and the Signal wiring Modal are
contributed beside them. Area ownership is required because the same instances serve both
`/builder/phis/ui/shells` and `/builder/phis/ui/pages` and follow the Builder Controller lifecycle. Page
presets must not duplicate them, and they are not normal `drawer_right` Regions or imperative Drawers
mounted by an Inspector host Widget.

They are contributed through the `areaOverlays` descriptor family
(`components/regions/presets/phi-builder-inspector-area-overlay-tree.ts`), not declared in the Builder
Area shell preset. A shell preset is a starting point an operator may save over, after which the saved
snapshot is the only source of truth for that Area; an Overlay declared there would disappear with that
save. The Inspectors are the tool doing the authoring rather than content being authored, so they are
composed onto whatever Area tree resolves, code preset or saved snapshot alike. Inspector content consumes
current Builder Controller/workspace state and does not retain a Page-render snapshot.

Each Inspector Drawer has exactly one direct Body root, an explicitly declared n-slot
`PhiCollapsibleLayout`, and a Flex Header Layout. There is no Stack above the root, no runtime topology
switch, no nested Collapsible, and no hidden Drawer Region. The Builder Controller opens exactly the Drawer
matching the selected `region`, `layout`, or `widget` kind and closes the other two through Area-scoped
Overlay routes (`dialog/activate` and `dialog/close`); each Drawer reports its open state to the Builder
Controller on `inspectorVisibility/change`.

The resolved Builder Area mounts these Overlays independently of Region occupancy. It does not require a
`drawer_right` Region, a host Layout, a `builder-workspace-host` Widget, or a private `PhiDrawerControl`
to keep Overlay receivers alive.

Each Collapsible slot contains one Builder-Module section Widget. The sections are:

- Region Inspector: geometry, viewport, padding, background, border, shadow
- Layout Inspector: settings, anchor, padding, viewport, background, border, shadow, signals
- Widget Inspector: settings, geometry, viewport, signals

Section Widgets use the `fill-inline` slot-size policy so each occupies the complete panel width. They
may share internal label/provider preparation and Client hooks, but they do not render through a host
Widget, mount another Drawer, or receive a host-owned render callback. Presentation-only editors
(background, border, shadow, padding, geometry, viewport, placement) are Phi Controls composed by the
section Widgets; a Control is never inserted directly as a CMS node. The selected node and its Draft remain
Controller/workspace state.

The code-owned configuration of the three Drawers is: right placement, `mountPolicy: "lazy-keep"`, the
`glass` effect, and a transparent, outside-blocking, closable mask, so a pointer action on the Canvas is
consumed by the mask and closes the Inspector without selecting anything underneath. On first mount only
`slot_0` is open (Geometry for the Region Inspector, Settings for the Layout and Widget Inspectors); later
open state is transient Collapsible state. The Collapsible Body roots use `sm` outer and `sm` inner panel
padding; the Header Flex roots use `lg` inline-start padding. None of these come from Drawer adapter
padding.

### Selection and state

The active selection is the source of truth.

- The Inspector only edits the currently selected `region`, `layout`, or `widget`.
- Any committed change must patch the active node immediately.
- The inspector may keep only transient UI state such as focus, open popovers, or incomplete text entry.
- When the inspector is reopened, it must rehydrate from the current node state, not from a separate inspector draft.

It reacts to:

- `selection/change:json` with the `builder-node-selection` value schema
  (`PHI_SIGNAL_VALUE_SCHEMAS.builderNodeSelection`)
- `builderMode/change:string`

The `builderMode` channel is Builder workspace state. It is separate from renderable-block
`renderMode`.

It renders for the currently selected:

- `region`
- `layout`
- `widget`

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

- colors and gradients are edited through Phi Controls (`PhiColorControl` and the background Control)
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
- block commands are the standard renderable-block channels in
  [SIGNALS.md](./SIGNALS.md#renderable-block-channels), addressed to a concrete `cms:` or `region:` receiver
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
- the resolver composes a fully qualified `iconKey` as `pluginKey:iconName` when `iconName` is set
- `pluginKey` is the owning Module's widget or layout namespace, for example
  `@phis/ui/modules/core/widgets` or `@phis/ui/modules/builder/layouts`
- Layout icons use the plugin motif inside one rectangular Layout frame.
- the plugin itself must not decide the frame geometry
- `widget` icons may use a plugin-local icon name or fall back to the type family
- a widget without `iconFamily` uses its `category` as family, with `other` mapped to `content`
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
- `hidden` and `collapsed` follow the renderable-block visibility values in section 11.

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

The Builder uses the same signal contract as every live runtime, defined in [SIGNALS.md](./SIGNALS.md);
this section describes only the Builder-owned configuration flow.

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
- Controller endpoints use the controller address grammar in [SIGNALS.md](./SIGNALS.md#addresses), for
  example `controller:@phis/ui/modules/builder/controller/default:default`. Active area-mounted controllers
  expose `default`; demand instances require concrete materialized settings.
- The Wiring modal uses the selected sender's declared outputs to filter compatible receiver inputs by
  action, value type, and JSON schema. Route scope and receiver channel need not match a sender-side
  channel because outputs do not declare one.
- Add, edit, and delete operations run in a Builder-owned table-provider session. Only Apply writes the resulting
  route set to the selected CMS instance; Cancel discards the session.
- Missing or unmounted configured receivers remain visible as contract diagnostics. Wiring must not
  hide them, infer an address, or borrow an endpoint from another module.
- Canvas runtime signal emission stays disabled. Wiring changes instance config through the Builder
  controller; target-Area controllers are not mounted merely to configure their endpoints.

