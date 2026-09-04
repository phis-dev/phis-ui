# Shell Contract

This file defines the shared shell topology contract for `@phis/ui`.

## Scope

The shell is the outer page architecture. It owns the arrangement of the main regions around the page content, but it does not own page-internal layout structures.

The shell may define:

- `header_top`
- `header_main`
- `sider_left`
- `footer_main`
- `footer_bottom`

The shell also owns one structural page-content viewport between those shell regions.
That viewport is the mount point for page-owned regions, but it is not itself a CMS region record.

The shell must not define page-internal regions such as:

- `hero`
- `sider_right`
- `footer_top`
- nested layout slot placement
- anchor behavior inside layouts

Those belong to the page/layout renderer inside the shell content viewport.

## Shell Variants

The shared shell currently supports two topology variants:

1. `shell-sider-embedded`
   - header regions above the body
   - `sider_left` and the page-content viewport share the main body row
   - footer regions below the body
   - when `sider_left` is absent, the page-content viewport spans the full width

2. `shell-sider-full`
   - `sider_left` spans the full viewport height
   - the page-content column sits next to it
   - header and footer regions live in the content column

These variants describe topology only. They must not encode region chrome.

The shell implementation must stay plain HTML/CSS at the container level.

- `sider_left` is not an Ant Design `Layout.Sider` contract.
- `sider_left` is a normal shell block / `aside` whose width, collapsed width, sticky behavior, and background are driven by `--phi-shell-*` variables and shell state.
- Ant Design may still be used inside inner widgets such as navigation or controls, but it must not own the shell container geometry contract.
- Collapse state belongs to the shell contract, not to a UI-library wrapper.

## CSS Ownership

### `root.css`

`root.css` must stay minimal.

It should contain:

- global reset
- `html` / `body` base rules
- high-level CSS variables
- very small utilities only

It must not encode shell topology.

### `shell.css`

`shell.css` owns the shell topology only.

It may contain:

- shell variant classes
- grid and flex templates for the outer shell
- shell wrapper rules
- the global background layer contract
- plain structural rules for `sider_left`, the page-content viewport, `header_*`, and `footer_*`

It must not contain:

- page-specific regions
- layout slot logic
- widget placement rules
- region chrome implementation details

## Token Sources

`site.theme.antd.token` remains the source of truth for Ant Design design tokens.

If the root provider enables Ant Design `cssVar`, the runtime CSS variables are derived from that same token source.

The shell must not introduce a second token source for the same values.

`px2remTransformer` remains a separate bridge for rem conversion and is not a token source.

## Variable Split

### AntD-derived runtime variables

These are expected to be available through Ant Design runtime CSS variables when `cssVar` is enabled:

- spacing
- radius
- text color
- container background
- elevated background
- border color
- shadows
- font metrics

The canonical source for Ant Design semantics remains the numeric theme token input in `site.theme.antd.token`. Ant Design emits the matching `--ant-*` variables during SSR. Phi must not mirror those values into a second color, spacing, radius, shadow, or typography variable set.

The shared typography seed is `fontSize = 12`. Shell Regions inherit that base unless their persisted Region typography explicitly overrides it; content Widgets may use Ant Design aliases such as `fontSizeLG` as their own default.

The server-rooted Phi projection supplies only shell values Ant Design does not model. Interactive Client shell components consume Ant Design semantics through `usePhiConfig().token`. Custom theme colors come from `usePhiConfig().customColors`; `--phi-color-*` is not a client or SSR theme API.

### Shell bridge variables

These values are not standard Ant Design design tokens and should be set deliberately by the root layout:

- `--phi-shell-bg-image`
- `--phi-shell-bg-size`
- `--phi-shell-bg-position`
- `--phi-shell-bg-repeat`
- `--phi-shell-bg-opacity`
- `--phi-shell-bg-blur`
- `--phi-shell-sider-width`
- `--phi-shell-sider-collapsed-width`
- `--phi-shell-header-height`
- `--phi-shell-footer-height`
- `--phi-shell-content-min-height`
- `--phi-shell-gap`

These values describe shell behavior, not general design tokens.

Phi shell variables should be rem-based whenever the Phi-owned structural value is a visual size. Shell code uses `--phi-shell-*` only for those structural values and uses Ant Design tokens or `--ant-*` variables for generic visual semantics.

Default sizing follows Ant Design Sider conventions:

- `--phi-shell-sider-width = 200px`
- `--phi-shell-sider-collapsed-width = 40px`

The active values are resolved from `site.theme.shell` first, then region config overrides, then the defaults above.

Collapse behavior should be implemented as shell state plus CSS width rules, not by delegating the outer container to `antd/Layout.Sider`.

Prefer `rem` for shell spacing and chrome-derived sizing where possible; keep fixed `px` only for explicit structural defaults or technical hairline values.

TODO:
- The collapsed AntD menu styling should later move from structural `.ant-menu-*` selectors to an explicit `data-phi-menu-collapsed` marker on the menu node.

## Root Background and Shell Backdrop Layers

The site Root Background and the Area Shell backdrops are different ownership and rendering layers.
They must not be collapsed into per-Region backgrounds or per-Region glass effects.

The site-owned Theme Root Background:

- is configured in `/builder/theme`, independently for light and dark mode
- uses the canonical structured Phi Background contract, including color, gradient, image, Pattern,
  and noise; a new shell-only background representation is forbidden
- falls back to the resolved Ant Design layout background (`colorBgLayout` / `PHI_COLOR.bgLayout`)
  when no Root Background is configured
- is painted once at the document/root level and does not scroll with Page content
- has no Area-specific override in the v1 target contract

An Area-owned Shell may add two independent backdrop layers above the scrolling Page and below the
Region/Layout/Widget content:

- one shared Header backdrop covering `header_top`, `header_main`, and the Page-owned `header_bottom`
- one Sider backdrop covering `sider_left`

Each Shell backdrop uses the canonical structured Phi Background contract and may therefore add a plain or
semi-transparent color, gradient, image, Pattern, or noise. It may additionally use the canonical Effect
contract, including glass/backdrop blur, and the canonical Shadow contract. The declarative properties are
`headerBackdrop.shadow` and `siderBackdrop.shadow`; they reuse `none`, the shared Shadow presets, and the existing
explicit custom Shadow value instead of introducing a Shell-specific Shadow shape. Border remains Region chrome.

The Header-backdrop Shadow is painted exactly once at the outside lower edge of the complete currently visible
Header stack. It therefore covers `header_top`, `header_main`, and `header_bottom` as one visual unit instead of
drawing seams between Regions. Its edge follows the same centrally resolved visible geometry when a Header
Region scrolls away, becomes sticky, mounts, or is absent. The Sider-backdrop Shadow is painted once at the
Sider's outside logical inline edge and must follow LTR/RTL plus expanded/collapsed geometry. Either Shadow may
be used independently of Background or Effect.

The Header backdrop is composed only by the final `PhiCmsShell`, after the Page-owned `header_bottom` React
subtree is available. This does not transfer ownership of `header_bottom` to the Area and does not persist it
in the Area Shell. The shared layer must derive its visible geometry centrally from the actually mounted Header
Regions and their sticky state. For example, when `header_top` scrolls away while `header_main` and
`header_bottom` remain sticky, the common backdrop contracts to the visible Header extent without introducing
per-Region seams.

Header and Sider backdrop boxes follow the active Shell topology. The existing Shell contract does not overlap
the Header and Sider, so their filters must not create an accidental double-filter intersection. Full-height,
embedded, and collapsed Sider variants must all resolve the same two-layer contract.

The resulting paint order is:

1. Theme Root Background
2. scrolling Page/content
3. shared Header and Sider backdrop layers
4. Region paint/effects and Region content

`shell.css` owns only these layering and geometry mechanics. Theme and Shell records own the declarative values.
No Page, Content Region, hidden Region slot, or Overlay may be introduced to host a backdrop.

## Region Chrome

Border, background, color, and a Region's own shadow belong to Region chrome, not to shell topology. A composite
Header/Sider Shadow belongs to the corresponding Shell backdrop under the contract above.

That means:

- shell CSS may provide placement and container behavior
- region containers may provide chrome and per-region visual treatment
- shell CSS should not hardcode chrome values into the topology rules

Regions are transparent, effect-free, and shadow-free by default so the shared Shell backdrop remains
continuous. A Region may add its own canonical Background, Effect, and/or Shadow configuration on top of the
Shell backdrop; this is additive, not a `shell | region` mode switch. If an author explicitly combines Shell and
Region glass or Shadows, the resulting double blur, edge, or Shadow is an intentional authored result. Authoring
may warn about it, but the runtime must not silently discard either layer.

In Builder, `/builder/shells` owns selection and authoring of the Shell root plus Header/Sider backdrop
scaffolds. `/builder/theme` owns the Theme Root Background. `/builder/pages` continues to own the content and
local Region chrome of `header_bottom`. A backdrop is not a normal CMS Region/Layout/Widget node merely because
Builder exposes an authoring scaffold for it.

## Page Layout Boundary

The shell ends where the page content begins.

Inside the shell page-content viewport, the page/layout renderer may define its own inner structure, including:

- `header_bottom`
- `hero`
- `content`
- `sider_right`
- `footer_top`
- layout slots
- nested layouts
- anchor positioning

That inner structure is intentionally not part of `shell.css`.

## Where the Shell is not drawn

The root of an Area draws no Area-owned Region at all. It is either a landing page, whose point is to
arrive without the Area's chrome and without the cost of resolving it, or a redirect, which draws
nothing. The Page-owned Regions still render there, in the same grid -- a landing page is a page like
any other, and one that wants a header builds it in `header_bottom`.

This is a property of the route graph, not a runtime condition: the Area root and the pages below it
are separate branches with separate Layouts (see `NEXT_INTEGRATION.md`). The Area's guards, providers
and Overlays sit above the split, so crossing it rebuilds the Shell without rebuilding the Area.

What ships in each root follows from that. Public is the landing page -- the Welcome page, which draws
its own brand, header navigation and locale switch in `header_bottom` and its quick links and contact
in `footer_top`, because there is no Shell above it to draw them. Every other Area's root is a
redirect, and it names its destination by reading the first entry of the Area's own sidebar that the
current viewer may reach, rather than by naming a path. The Dashboard Module contributes that first
entry in App, Accounting, Admin, Editor and Builder; switching it off moves the front door to the next
entry instead of breaking it, and an Area with no reachable entry left renders an empty page rather
than forwarding to itself.

That is the default, not the rule. `preset.config.shell.rootRoute` is where a Builder overrides it,
through one Select in the Shells workspace header beside the Sider switch -- a plain `select-box` fed
by an options provider, because it is the same kind of statement the switch is: about the Area being
edited rather than about anything on the canvas. The list is the two answers that are not a Page,
`landing` and the default, followed by every registered Page of the Area. The target is stored as an internal Page
reference and never as a path, so it survives a Page being renamed or a Module moving its route; a
reference that no longer resolves -- a deleted Page, a Module switched off, a route this viewer may not
reach -- falls back to the default above rather than to a 404. The structure draft states the whole
`shell` namespace on every save, because the publish merge takes that namespace from the draft alone.

A forwarding root answers `307` on the status line rather than a `200` carrying a client-side redirect.
That is decided in the Area boundary Layout, above the branch split and before the shell flushes, for
the same reason `notFound()` is: after the shell has flushed Next can only swap the body, and a
forward filed as a page is exactly what an Area root must not be.

## Ownership Boundary

Area-owned shell regions are:

- `header_top`
- `header_main`
- `sider_left`
- `footer_main`
- `footer_bottom`

Page-owned regions are mounted inside the shell page-content viewport and include:

- `header_bottom`
- `hero`
- `content`
- `sider_right`
- `footer_top`

The important distinction is:

- the shell page-content viewport is a mount point owned by the area shell
- the page-owned `content` region is editorial page data owned by the page tree

Those two concepts must not share the same persistence or hydration key just because both happen to be called "content" in casual conversation.

## Practical Rule

- `root.css` = global baseline
- `shell.css` = outer shell topology and global background layer
- page/layout renderer = inner page regions and nested layout logic
- AntD tokens = source of truth for standard runtime design values
- shell bridge variables = explicit shell-specific values only
- shell containers stay plain HTML/CSS; Ant Design is reserved for inner widgets and other explicitly client-bounded UI

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility
contract. If it cannot express a requirement, implementation stops and asks the operator first.
