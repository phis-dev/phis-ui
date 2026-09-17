# CMS Tree and Identity

How `@phis/ui` models a Site: Areas, the CMS tree an Area and a Page draw, the renderable-block base every
node shares, and the identity every node carries. Shell topology is [SHELL.md](./SHELL.md), Layouts and
Regions are [LAYOUTING.md](./LAYOUTING.md), Overlays are [OVERLAYS.md](./OVERLAYS.md), the physical
route files are [NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md), and preset descriptors are
[MODULES.md](./MODULES.md#descriptor-identity-and-instantiation).

## Areas

The Areas are exactly `public`, `app`, `admin`, `builder`, `editor`, and `accounting`
(`PHI_CMS_AREA_KEYS`, `constants/cms-areas.ts`). Each is defined in
`plugins/runtime-modules/area-definitions.ts` with one locked base Module, one shell preset, its
navigation surfaces, and an access policy ([ACCESS.md](./ACCESS.md#3-core-access-matrices)):

| Area | Addressed as | Access policy |
| --- | --- | --- |
| `public` | `/<locale>/...` | anyone |
| `app` | `/app/...` | authenticated |
| `accounting` | `/accounting/...` | accounting |
| `admin` | `/admin/...` | developer tools (and Admin through the Core override) |
| `editor` | `/editor/...` | content editing |
| `builder` | `/builder/...` | structure authoring |

- A root segment is either a Public locale or an Area key, never both: an Area other than Public carries
  no locale prefix and takes its locale from the resolved request.
- `builder` is structure and design authoring, `editor` content and publishing, `admin` the control
  plane, `app` the signed-in Site application. Authentication, commerce, and Site-specific behavior are
  Modules, not Areas.
- Outside Public, a Module route answers under its package path (`/admin/phis/ui/settings/general`);
  see [MODULES.md](./MODULES.md#who-owns-an-address).
- An Area resolves only its own Pages. A path with no Page is a `404`.
- A live request reads published revisions. Authoring and preview requests (a `revision` or
  `reviewRevision` read, the Builder Canvas) pay for Draft reads; live requests never do.
- A Public page requested anonymously is rendered once for everybody ([STATIC_RENDERING.md](./STATIC_RENDERING.md)).

## The CMS tree

- An Area draws its shell preset: Area-owned Regions (`header_top`, `header_main`, `sider_left`,
  `footer_main`, `footer_bottom`) plus Area Overlays.
- A Page supplies payload for the page-owned Regions `header_bottom`, `hero`, `sider_right`, `footer_top`,
  `drawer_right`, and `content` (`PhiCmsPageNode`). A `null` root for one of them is a valid empty state.
  Placement belongs to the stable shell slots, not to the Page.
- Every active Region points to exactly one root Layout. Layouts contain Layouts and Widgets; Widgets are
  leaves; a slot holds at most one direct child. A Region never holds a Widget directly
  ([LAYOUTING.md](./LAYOUTING.md)).
- Widget instance config lives on the node in the revision tree, never in `site.theme`. A Widget that
  persists canonical content declares `contentBinding`
  ([components/widgets/README.md](./components/widgets/README.md#definition-metadata)).
- Region and region-type values are `PhiCmsRegionType` in `@phis/contracts/cms`.
- A Page of type `Redirect` (`PhiCmsPageType.Redirect`) carries `{ target: { area, path }, status? }` with
  a status of `301`, `302`, `307`, or `308`. Deleting a Page publishes a revision with status `Deleted`;
  the path then resolves as not found and the history remains.
- Renderers receive only request-resolved active registries. A node whose type is unavailable renders the
  node-local diagnostic ([MODULES.md](./MODULES.md#render-modes-and-diagnostics)).

## Renderable blocks

Layouts, Widgets, and Regions share `PhiRenderableBlockBase` (`types/renderable-block.ts`):

- `renderMode` is a transient hint set by the render path (`render`, `renderPreview`, `renderEditor`); it
  is never persisted and never a signal channel.
- `visibility` is `visible` (default), `collapsed` (reduced participation, using `collapsedSizeHint`), or
  `hidden` (no layout participation). `enabled: false` keeps the block but blocks interaction.
- `size` is the preferred geometry; `minSize` and `maxSize` constrain it. Renderers emit longhand CSS
  properties only.
- `zIndex`, `opacity`, `background`, `border`, `shadow`, `effect`, `effects`, `anchor`, `accessPolicy`,
  and `viewportFlags` are the shared chrome and visibility fields.
- `className` is the supported styling hook; inline `style` is not part of the block contract.
- `capabilities` (`selectable`, `draggable`, `hoverable`, `activatable`, `focusable`, `droppable`)
  declares interaction participation; `runtime` carries the host context (`siteKey`, `area`, `pageKey`,
  `regionKey`, `blockId`) and transient interaction state (`selected`, `hovered`, `dragging`, `focused`,
  `active`).
- Runtime changes to these fields travel as renderable-block signals
  ([SIGNALS.md](./SIGNALS.md#renderable-block-channels)).

## Instance identity

Every Layout, Widget, Overlay, and resolved Navigation item has exactly one `PhiCmsInstanceId`. The codec
lives in `@phis/contracts/cms`, because `phis` derives the same ids.

- The id is 12 bytes, serialized as exactly 16 Base64URL characters, and always handled as text. Byte 0
  holds the codec version and the origin (`preset` or `draft`); byte 1 the domain (`area`, `page`, or
  `navigation`).
- A preset-origin id hashes `(version, domain, ownerModuleId, presetKey, nodeKey)`
  (`createPhiPresetCmsInstanceId`), so the same preset node has the same id before any row exists and
  after every republish.
- A draft-origin id encodes the owning Draft revision id (6 bytes) and a Draft-local sequence (4 bytes)
  (`createPhiDraftCmsInstanceId`). Inserting or duplicating a node takes the next sequence of the owning
  Area, Page, or Navigation Draft; the Builder allocates through its central allocator.
- The same id is used in Draft, preview, published runtime, persistence, history, structural references
  (Layout parents, Page and Region roots), and signal addresses (`cms:<instanceId>`). Moving, editing,
  saving, and publishing preserve it; publish never remaps ids.
- A Module Page is addressed by `createPhiPresetCmsPageId({ ownerModuleId, presetKey })`; a Site Page by
  its path ([REFERENCES.md](./REFERENCES.md)).
- Third-party code never creates ids or concrete CMS nodes. Presets use local node keys; the central
  instantiator derives the ids. Node type never takes part in addressing, because several instances share
  a type.
- Duplicate node keys in a preset, invalid encodings, unresolved references, and collisions are errors;
  there are no compatibility ids or collision retries.
