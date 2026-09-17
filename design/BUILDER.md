# Builder design

This document holds Builder surfaces and rules that are designed but not built. The built Builder is
described in [BUILDER.md](../BUILDER.md). Implementing anything here requires operator approval, and the
section is then moved into BUILDER.md.

## Builder chrome

### Header

The builder header is for global workspace actions, not for editing the target site navigation directly.

Expected controls:

- active builder area selector
- dark mode switch
- page selector entry point
- save
- publish
- preview
- undo
- redo
- dirty/saving/synced state

The header must not contain a site/project selector. The active site is already known from the current context.

### Left sider

The left sider is the builder navigation and tool area.

Expected content:

- pages
- templates
- media
- brand
- blocks
- styles
- settings

The sider is not the final site navigation. It is builder chrome.

## Pages entry point

`Pages` is the primary entry point for page structure editing.

Expected behavior:

- clicking `Pages` opens a drawer with a tree view
- the tree shows the current target area only
- the active page is highlighted
- selecting a page opens its canvas
- `+` actions create pages; a page is never a folder, so a page cannot be created beneath another page
- `+` on a folder node can create a page inside that folder or a submenu entry

The page tree must mirror the target site structure as closely as possible. The contract should not introduce a second independent navigation model.

## Menus and the pages tree

### Menu and submenu contract

The pages tree also acts as the source for navigation structure where the area contract allows it.

Rules:

- a page may own navigation children when the current shell profile exposes that capability
- a submenu entry is a navigation child, not a page by default
- a page tree node may represent:
  - a real page
  - a navigation container
  - both, if the area contract allows it
- submenu creation must respect the active area and the active shell profile
- the tree should clearly distinguish page nodes from pure navigation nodes
- if the shell profile does not support submenus, the tree must hide or disable submenu creation

The builder must not assume that every navigation node is also a page node.
The builder must not assume that every page node is also a navigation parent.

### Pages tree interaction contract

The pages tree is the primary navigator for page selection.

Interaction rules:

- clicking a page node selects that page in the canvas
- double-clicking a page node may open a focused edit state if the implementation supports it
- expanding a folder node reveals the pages and folders inside it, or its submenu entries
- creating a page from the tree must immediately insert it into the active area structure
- moving or reordering nodes must update the canvas selection if the active node changed
- deleting a page node must clear or replace the current selection in a predictable way
- the tree must never silently edit shell-owned regions
- the tree must never expose page-owned content as if it were a shell region

Drawer contract:

- the tree should be rendered in a drawer by default
- the contract only requires that it be an explicit, separate selection surface
- the tree must allow searching or filtering once the structure becomes large enough

## Shell selector

The builder also needs a shell selector for the current target area.

The shell selector decides which shell regions and shell behaviors are active for the canvas preview.

Examples of shell-level choices:

- whether `sider_left` is visible
- whether `sider_left` uses `fullHeight`
- which header regions are active
- whether a footer is present
- which content-width constraints apply
- whether the canvas should show a compact, standard, or editor shell mode

The shell selector must not be a random styling panel. It is a structural contract chooser.

Required shell selector responsibilities:

- select the shell preset for the active area
- select the active region set for that preset
- expose region-level behaviors such as sticky, full height, width, and offsets
- show which regions are editable in the canvas
- keep the builder chrome separate from the shell being configured

The shell selector should operate on explicit shell profiles rather than ad hoc toggles when possible.

Example shell profiles:

- `compact`
- `standard`
- `editor`
- `fullHeightSider`
- `headerOnly`

The exact names are open, but the contract must support:

- region visibility
- region sizing
- region height mode
- shell-specific composition presets
- area-specific shell overrides

## Entities

The builder will eventually need first-class entities for:

- pages
- menus
- layouts
- blocks
- media assets
- brand assets
- theme defaults

The canonical model should stay site-scoped and area-aware.

## Placement fields

Optional future placement fields:

- `requiredFlags`
- `excludedAreas`
- `excludedRegionTypes`

## Insert picker sorting

- the picker should support sorting by relevance and recency

## Media, brand, and theme

The builder must treat media, brand, and theme as first-class workspace domains.

### Media

- The builder must be able to browse site-scoped media assets.
- Assets should be organized by groups or collections.
- The media view must support selection, upload, replace, delete, and reuse.
- Uploaded media must be referenceable from pages, widgets, and brand config.

### Brand

- Brand editing is a developer concern, not an admin settings concern.
- Brand data may include logo, wordmark, slogan, colors, and presentation defaults.
- The builder should expose brand assets and brand preview in a dedicated workspace mode.
- Brand edits should be able to reference media assets instead of raw file paths.

### Theme

- Theme editing should be treated as a structured workspace domain.
- Theme controls should expose the site shell, color tokens, spacing tokens, and visible defaults.
- Theme editing must not silently rewrite unrelated site content.

### Asset references

- Pages, layouts, widgets, and brand settings should reference media by asset identity or stable URL.
- The builder must not couple visual references to a local filesystem path contract.

## Area shell profiles

Each editable area must map to a shell profile that defines which regions are present and how the canvas should behave.

### `public`

- Public browsing shell
- Typical regions: header, content, footer, optional sider
- Focus on marketing and information pages
- Navigation is usually visible and structured

### `app`

- Authenticated Site application shell
- Typical regions: header, content, optional sider, footer
- Auth, commerce, and site-specific modules contribute routes and navigation without introducing Areas

Every shell profile must define:

- active regions
- region visibility
- region sizing behavior
- whether the canvas uses full-height sidebars
- whether the preview is compact or expanded
- which regions are editable in the builder

## Standard region sets

Each shell profile must map to a concrete default region set.

### `public`

- `header_top`
- `header_main`
- `footer_main`
- `footer_bottom`
- optional `sider_left`
- one shell-owned page-content viewport for page regions

### `app`

- `header_top`
- `header_main`
- `footer_main`
- `footer_bottom`
- optional `sider_left`
- one shell-owned page-content viewport for page regions

Region-set rules:

- the builder must show only the regions that belong to the active shell profile
- optional regions must be clearly marked as optional or disabled when absent
- shell-profile changes may change region visibility, selection, and the canvas tree
- region set changes must be reflected in the builder chrome and the canvas immediately

## Developer shell layout

The `developer` workspace uses a dedicated shell arrangement:

- `header_main`
  - global builder actions
  - area selector
  - dark mode switch
  - save / publish / preview
  - undo / redo
  - workspace status
- `sider_left`
  - builder chrome navigation
  - shell / area organized workspace navigation
  - Pages entry point
  - media, brand, theme, blocks, settings
- `content`
  - editable target-site canvas viewport
  - host surface for either the `/builder/phis/ui/shells` shell editor or the `/builder/phis/ui/pages` page editor
- `sider_right`
  - optional inspector
  - page organized context panel
  - initially hidden unless the workspace mode requires it

Developer shell rules:

- the outer shell must stay visibly different from the edited target site
- the builder chrome must not be reused as the target navigation preview
- the canvas must be the only place where the target shell is edited
- the shell must support a compact workspace mode and an expanded workspace mode
- the shell must support a full-height editor mode when the canvas needs the whole viewport
- the `content` slot of the developer shell is only the workspace viewport and must not be confused with the page-owned CMS region named `content`

## Create / plus actions

The builder must expose explicit creation actions.

Required creation targets:

- `+ page`
- `+ submenu`
- `+ layout`
- `+ widget`
- `+ slot`
- `+ media asset`
- `+ brand asset`

Rules:

- `+` actions must always respect the active area and shell selector.
- `+` actions must only appear where the current contract allows creation.
- `+ page` may appear in the pages tree and in a folder's context menu. There is no `+ child page`: a
  page is never a folder (see phis-server `TODOS.md`, "Folder addresses").
- `+ submenu` may appear when the selected node can own navigation children.
- `+ layout` and `+ widget` may appear inside the Canvas and slot context.
- `+ slot` may appear only on Layouts that explicitly own named or sequential slots.
- `+ media asset` and `+ brand asset` may appear in media and branding contexts.

The builder must not invent creation affordances for entities that are not part of the current contract.

## Selection, breadcrumbs, and inspector

The builder must keep selection and editing context explicit.

### Selection

The builder must support at least these selection levels:

- area
- shell profile
- page
- layout node
- widget node
- slot
- media asset
- brand asset

Selection rules:

- only one primary selection should be active at a time
- selection must be visible in the canvas and in the side controls
- selection changes should update the inspector context immediately
- selecting a page should load that page into the canvas
- selecting a node should focus the corresponding canvas element

### Breadcrumbs

The builder should expose a breadcrumb trail for the current selection path.

Expected breadcrumb examples:

- area > shell profile > page
- Area > Page > Layout > Widget
- area > media > asset

Breadcrumbs should support:

- quick back-navigation
- clear display of the current context
- optional jump targets for parent entities

### Inspector

The inspector is the edit panel for the current selection.

Inspector responsibilities:

- render editable fields for the active selection
- show read-only metadata when the selection is not editable
- expose slot assignment when the selected node can own slots
- expose creation actions only when the current selection allows them
- stay in sync with the current area and shell selector

The inspector is the edit panel for the current selection.

- The active node is the single source of truth.
- Inspector UI must rehydrate from the selected node on every open.
- Any field edited in the inspector must update the selected node directly.
- Transient draft state is allowed only for incomplete UI input, not as a second source of truth.

The inspector must not become a second page tree or a second navigation system.
Slot selection should open the insert picker, not a separate slot editor.

## Revision diffing

- The contract should later allow diffing between draft and published state.

## Implementation order

This is the intended implementation order:

1. Define the builder shell regions.
2. Define the page tree contract.
3. Define the canvas contract.
4. Define the area selector contract.
5. Define the navigation edit contract.
6. Define the media and brand contracts.
7. Define save/publish/revision behavior.

## Open questions

- Should the pages tree be a drawer or an embedded tree panel?
- Should menus be separate from pages in the builder model, or derived from page structure?
- Which builder operations require draft state and which require immediate persistence?
- How much of the future public shell should be editable before the builder reaches its first useful version?
