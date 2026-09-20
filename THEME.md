# Theme Contract

This document owns `site.theme`, the Theme blocks a Site follows, and the rules for Theme tokens and CSS.
Shell CSS topology, the Root Background and Chrome Overlay layers, and Region chrome are owned by
[SHELL.md](./SHELL.md). How font files reach the page is owned by
[NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md#fonts). Shipping Theme blocks from a Module is walked through in
[THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#5-add-a-theme-preset). Locale availability is not a Theme
concern; it is resolved by `@phis/server` ([phis-server TRANSLATIONS.md, "Locale capability"](../phis-server/TRANSLATIONS.md#locale-capability)).

## Where the Theme comes from

- `site.theme` (`PhiSiteTheme`, `gateway/site-config.ts`) is part of the Site config `@phis/server` returns
  from `GET /api/v1/site`. It is the Site's stored Theme record, read per request.
- `site.themeRevision` carries `publishedRevisionId` and `workingDraftRevisionId`, the Theme scope pointers.
  They are kept apart from the visual payload.
- A stored record holds only which blocks the Site follows and the values its author changed. Everything
  else is resolved from the blocks on every read (`theme/phi-theme-composition.ts`). The author's values
  always win over the blocks.
- `resolvePhiThemeRuntimePayload(...)` (`theme/phi-theme-runtime.ts`) folds the blocks into one ordinary
  Theme record once, in `PhiRootLayout`. Every consumer below reads that record; nothing downstream knows
  which fields a block supplied, and a resolved value is never written back.

## Theme blocks

A Theme is composed of four parts, each of which a Module can ship (`theme/phi-theme-blocks.ts`):

| Part | Type | Carries |
| --- | --- | --- |
| Palette | `PhiThemePaletteBlock` (= `PhiThemePresetPlugin`) | `palette`: colour seeds and per-mode colours |
| Style | `PhiThemeStyleBlock` | `style.token` (structural Ant Design tokens) and `shape.controls` (always stated) |
| Ground | `PhiThemeGroundBlock` | `root`: Root Background, Chrome Overlay and Chrome Shadow |
| Fonts | `PhiThemeFontsBlock` | `fonts`: the family each font slot names; `body` is always stated |

A **Set** (`PhiThemeSetBlock`) names one block of each part by key and may carry a `logo`
(`PhiSiteThemeBrandLogos`). It composes, it does not contain.

Every block has `key`, positive integer `version`, `title`, and optional `description`. Core ships exactly one
block of each kind plus one Set, all keyed `phis`; they are the floor every selection falls back to.

Modules contribute blocks through their Server catalog entry (`types/cms-module-descriptors.ts`):

- `themes: PhiCmsThemePresetDescriptor[]` for palettes -- `themeKey`, `title`, optional `description`,
  `presetVersion`, and `loadPreset()`.
- `themeBlocks: PhiCmsThemeBlockDescriptor[]` for the other four kinds -- `blockKind` is exactly `style`,
  `ground`, `fonts`, or `set`, plus `blockKey`, `title`, optional `description`, `presetVersion`, and
  `loadBlock()`.

Loaders run only for an active Module. Theme selection reads only active Module descriptor bindings; global
registries and registration side effects are invalid.

### Selection and resolution

- `theme.blocks` selects `{ set?, palette?, style?, ground?, fonts? }`, each `{ key, version? }`.
- Each part resolves on its own: an explicit part selection wins, then the Set's part, then (palette only)
  `theme.preset`. A part that names nothing or an unavailable block runs on the core block; the selection
  itself is never rewritten, so re-activating the Module restores the look.
- `theme.preset` and `theme.presetVersion` name the palette the runtime payload resolves colour against.
- A resolved composition reports which parts are unavailable, so the Theme workspace can say that a Module
  is gone instead of presenting the core block as a choice.

### Adoption on save

Saving a Theme that resolves to a Module's palette, style (with its Control shape), ground, or fonts copies
that block into the Site's own fields (`theme/phi-theme-adoption.ts`). Parts the author already set are kept;
the block key stays in `blocks` as provenance. A picture a Module ground carries inline is uploaded into the
Site's Media library by the same save. Core blocks are followed, never copied.

### Theme workspace selection

The Theme workspace lives at `/builder/phis/ui/theme` (owned by `@phis/ui/modules/theme`). Its Set select
offers the Module Sets plus two Site entries, `site:<siteKey>:published` and `site:<siteKey>:draft`
(`theme/phi-theme-selection.ts`). The initial entry is the draft when a Working Draft pointer exists, else the
published Theme when a Published pointer exists, else the core Set `phis`. Site ownership is read from the
revision pointers only, never inferred by comparing Theme payloads.

The workspace's Light/Dark switch selects the half of the Theme being previewed and authored; it does not
persist a mode.

## `site.theme` field reference

All fields are optional. Absent means "follow the block" or the documented default. Persisted config stays
sparse: readers normalize absent values.

### Mode

- `mode?: "light" | "dark"` -- the half of the Theme a record or draft was authored in. The mode a viewer is
  shown does not come from here: `resolvePhiThemeMode(...)` (`theme/phi-theme-mode.ts`) uses the viewer
  preference (`light | dark | system`, default `system`) and, for `system`, the browser's
  `prefers-color-scheme` carried in the `phis_color_scheme` cookie, falling back to `light`. A live
  `themeMode` or `theme` signal to the Core Runtime Controller overrides the projection for as long as the
  page stays open ([SIGNALS.md](./SIGNALS.md#site-core-runtime-controller)).
- Where that preference lives, and why in two places at once: on the account, as `user_accounts.theme_mode`
  (NULL means `system`, and the endpoint is `PATCH /api/v1/auth/profile/theme`), and mirrored into the
  `phis_theme_mode` cookie, which is what `resolvePhiThemeMode` actually reads. The mirror is not a
  convenience -- the static proxy picks a render, and the bootstrap script decides before the first paint,
  and neither of them can resolve a session. The server writes the cookie on login and on every change, so
  the account is what follows a person between browsers and the cookie is what this request can see.
  `system` is the absence of the cookie rather than a third value in it.
- The account's own answer also travels as `runtime.viewer.preferredThemeMode`, which is the choice and may
  say `system`. `runtime.viewer.themeMode` beside it is the resolution and always names a half. A Settings
  panel reads the first: shown the second, it would tell somebody they chose "Light" when they chose to be
  asked. The pair stands to each other as `preferredLocale` does to `locale.current`.
- The Header switch and the Settings panel are the same setting. The switch states two halves and writes
  the account where there is one (`storePhiThemeModePreferenceOnAccount`); the panel is where the third
  answer lives, because no switch can state "System".

### Blocks

- `blocks?: PhiThemeBlockSelection` -- see [Selection and resolution](#selection-and-resolution).
- `preset?: string`, `presetVersion?: number` -- the palette key and version.

### Colour

- `palette?: PhiThemePalette` (`theme/phi-theme-presets.ts`), the same shape a palette block ships:
  - `seed` -- seeds shared by both modes (`colorPrimary`, `colorInfo`, `colorSuccess`, `colorWarning`,
    `colorError`, `colorLink`).
  - `modes.light` / `modes.dark`, each with
    - `seed` -- the per-mode base seeds `colorTextBase` and `colorBgBase`;
    - `overrides` -- explicit colour tokens that are not seeds, such as `colorLinkHover` or `colorBgLayout`;
    - `customColors` -- the ten Phi custom colours `custom1` through `custom10`.

### Style

- `style?: { token?: Record<string, unknown> }` -- mode-free structural Ant Design tokens: radii, control
  heights, spacing, typography sizes.
- `shape?: { controls?: PhiControlShapeCorners }` -- see [Control shape](#control-shape).
- `buttons?: { shadow?: { default?, primary?, danger? } }` -- one step per Button kind, each
  `none | soft | strong` (`theme/phi-button-shadow.ts`). A step becomes the Button component token
  (`defaultShadow`, `primaryShadow`, `dangerShadow`) per mode, because a shadow that reads on a light ground
  disappears on a dark one. A kind left unset keeps Ant Design's tinted line.
- `typography?: { headings?: "body" | "serif" | "display" }` -- the font slot `h1` to `h3` take
  (`theme/phi-theme-typography.ts`). Absent means `body`. A non-body choice sets `--phi-font-heading` on the
  root; a slot without a family falls back to the body font.
- `components?: Record<string, Record<string, unknown>>` -- Ant Design component overrides, merged per
  component over the shared component defaults, never replacing the whole object.

### Ground

- `root?: PhiSiteThemeRoot` (`types/site-theme.ts`):
  - `root.background.light` / `root.background.dark` -- the Root Background per mode, on the canonical
    structured Background contract (`PhiCmsBackgroundWidgetConfig`). A mode without one uses the resolved
    Ant Design `colorBgLayout`.
  - `root.chrome.light` / `root.chrome.dark` -- the Chrome Overlay the Header, Sider, and Footer Regions share.
  - `root.chrome.shadow.header | sider | footer` -- the Shadow each Chrome family casts at its outer edge
    (`PhiShadow`), independent of mode.

  What each layer may contain, which Regions paint it, and how a Region overrides it are owned by
  [SHELL.md](./SHELL.md#root-background-and-shell-backdrop-layers). The ground is site-wide; there is no Area
  override.

### Fonts

- `fonts?: { body?, mono?, serif?, accent?, display? }` -- five slots (`PhiSiteFontSlots`). A slot holds a
  family name or a `phis:asset/<id>` reference to a Site-owned font Asset.
- `rem?: { rootValue?: number }` -- the root rem value, default `16`. It feeds Ant Design's
  `px2remTransformer` and `--phi-rem-root-value`. Typography is not stored under `rem`.

See [Fonts and typography](#fonts-and-typography).

### Brand

`brand?: PhiSiteThemeBrand`, rendered by the Brand Widget. Site identity lives here and never in an Area
preset.

- `homeHref?: string` -- where the Brand leads; the Site root when absent.
- `eyebrow?: string` -- the small line above the Wordmark.
- `logo?: { light?, dark? }` -- one Logo per mode, each one of
  - `{ sourceKind: "asset", assetId: number, url?: string }` (`url` is resolved on read and written by the
    picker alongside the id),
  - `{ sourceKind: "url", sourceUrl: string }` (a Set's inline Logo until a save uploads it),
  - `{ sourceKind: "none" }` (explicitly no Logo, so a Set's Logo does not show through).

  A mode the record leaves unset shows the followed Set's Logo; the first save takes it into the Media
  library.
- `logoAlt?: string` -- falls back to the Asset's own alt text.
- `logoYOffset?: number` -- pixels the Logo is nudged against the Wordmark, to correct the artwork's own
  whitespace. Applied only where the Logo is drawn. Absent means none.
- `slogan?: { label?, icon? }`, `location?: { label?, icon? }` -- the two frame lines.
- `wordmark?: { fontFamily?, fontWeight?, fontStyle?: "normal" | "italic", letterSpacing?, parts? }` with
  `parts[]` of `{ text, color?, fontWeight? }`. What a part states wins over the Wordmark.

A placement never restates any of this. The Brand Widget is asked one thing -- `mode`, which of
`lockup` | `logo` | `wordmark` | `slogan` | `location` it draws here -- and reads the rest from the
record. There is no per-instance title, eyebrow, logo toggle or offset; a Brand that differs between two
places in a Site would be two Brands.

The default Public preset places the Widget four times: `slogan` and `location` in the header top,
`lockup` in the header main, `wordmark` in the footer. Line defaults are icon `antd:star` with label
`tr("Trusted digital solutions")` for the slogan, and icon `antd:location` with the Wordmark text for the
location.

### Contact

`contact?: { label?, href?, icon? }` -- the one way to reach whoever runs the Site, as the frame offers it
(`helpers/brand-contact.ts`). Defaults: label `Contact`, href `mailto:info@<site hostname>`, icon `antd:mail`.

### Widget defaults

- `widgets.locale?: { mode?: "label-list" | "compact-pill", showText?: boolean }` -- read by the Locale
  Widget; defaults `compact-pill` and `true`.
- `widgets.account?: { variant?: "full" | "compact" | "icon-only", showLabel?: boolean, showChevron?: boolean }`
  -- read by the Account Widget; its own instance config wins.

These are Site-wide presentation defaults only. Widget instance config belongs to CMS nodes, never under
`theme.widgets.*`.

### Shell

`shell?: PhiShellTheme` (`components/shell/shell-types.ts`) -- Shell-level defaults that are not Widget
instance config:

- `contentMax?: number`
- `light` / `dark`: `{ background?, color? }` -- global Shell surface per mode.
- `header`, `sider`, `footer`: each with family-level `light` / `dark` and metrics, and per-Region entries
  `header.top | main | bottom`, `sider.left | right`, `footer.top | main | bottom`. Each entry has
  `light` / `dark` `{ background?, color? }` plus `height`, `width`, `collapsedWidth`, `sticky`, `offsetTop`,
  and `zIndex`.

A surface value resolves Region-specific, then family-level, then global; the dark Header main and Sider
fall back to `#001529`. Metrics feed the default presets and the Shell bridge variables
(`--phi-shell-*`, `theme/phi-css-vars.ts`). These surfaces do not replace `root.background` or
`root.chrome`. The variable split is owned by [SHELL.md](./SHELL.md#variable-split).

## Resolution into Ant Design

Per mode, `resolvePhiRootTheme(...)` (`components/root/phi-root-theme-resolver.ts`) builds one token set:

1. structural defaults (`buildPhiThemeStructuralTokens`, derived from the Phi scale),
2. colour tokens from the palette block with `theme.palette` merged over it,
3. `theme.style.token`,
4. `fontFamily` / `fontFamilyCode` from the resolved `body` / `mono` slots.

Ant Design's algorithm derives the rest. The shared `fontSize` seed is `12`
(`PHI_DEFAULT_ANTD_FONT_SIZE`); `fontSizeSM`, `fontSizeLG`, headings, and line heights are derived and may be
overridden in `style.token`. Size tokens are numeric values such as `padding = 21`. Components are the shared
component defaults merged per component with `theme.components`, the Button shadow steps, and the Control
shape tokens.

The published Theme has one server projection and one client projection:

- `AntdRegistry` in `PhiRootLayout` extracts Ant Design styles during SSR, including the `--ant-*` variables
  Server Component markup and plain CSS use.
- `resolvePhiPublishedRootTheme(...)` (`server-only`) emits only Phi-owned structural variables that have no
  Ant Design token.
- `PhiConfigProvider` is the single Client boundary for Ant Design locale and theme configuration. Its
  `usePhiConfig()` value carries `token`, `customColors`, `fonts`, `layout`, `mode`, and `presets`. The Server
  Root passes only serializable data across it; Client theme modules never import server resolvers or
  `server-only` modules, and `pnpm audit:graph` must report no Client-to-server-only reachability.

## Control shape

`theme.shape.controls` is `{ topLeft, topRight, bottomRight, bottomLeft }`, each
`square | subtle | rounded | pill` (`theme/phi-control-shape.ts`). Absent means the style block's shape (core:
`rounded`). Anything other than four known names throws. A record with differing corners is valid but not
drawable yet: resolving it throws.

- `square` removes rounding; `pill` is a full capsule on rectangular Controls and a circle on square
  icon-only Controls. Both apply at every Control size.
- `rounded` is the numeric radius scale unchanged; `subtle` is that scale shifted one step smaller.
- `pill` is derived centrally from the rendered Control height, never persisted as `border-radius: 50%`.

The shape reaches the default Control size through Ant Design component tokens and the small and large sizes
through `styles/control-shape.css`, which reads `--phi-control-radius-*` variables built from the live tokens.
It governs Control bodies and triggers only. `borderRadiusSM`, `borderRadius`, and `borderRadiusLG` keep
governing surfaces: Layouts, Cards, Tables, Trees, Modals, Drawers, and popups, including the popup of a
Select, Picker, or Cascader. For Phi Controls the shape wins over conflicting component radius overrides.
Intrinsic geometry stays authoritative: Switch stays a capsule, Checkbox and Radio keep their shapes, joined
groups round only their outer boundary.

Persist the semantic value only. Pixel radii, percentages, Ant Design token names, and per-component overrides
are not part of this field.

## Fonts and typography

- The five slots are `body`, `mono`, `serif`, `accent`, and `display`. The core fonts block names
  `Fira Sans`, `Fira Mono`, and `Lora` for the first three.
- A family name is mapped through the font catalogue (`theme/phi-font-catalogue.ts`) to its CSS variable:
  `--phi-font-source-body`, `--phi-font-source-mono`, `--phi-font-source-serif` for the core families, plus
  the variables Modules declare. A name not in the catalogue reaches the browser as written. A
  `phis:asset/<id>` slot is resolved to `@font-face` rules for the Site-owned Asset
  (`theme/phi-theme-fonts.server.ts`).
- `accent` and `display` have no core family. Widget font keys resolve them to `body` when unset.
- Widget typography keys (`types/site-theme.ts`, `components/widgets/helpers/`):
  - `fontFamily = inherit | system | body | mono | serif | accent | display`, resolved from
    `usePhiConfig().fonts` and the Ant Design token; `system` is the token `fontFamily`.
  - `fontSize = inherit | xs | sm | base | lg | xl`, resolved to `fontSizeSM`, `fontSizeSM`, `fontSize`,
    `fontSizeLG`, `fontSizeXL`.
- Sizes use Ant Design tokens and `--ant-font-size*` variables; there is no `--phi-font-size-*` or
  `--phi-font-family-*` contract.
- Declaration, preloading, Module font contributions, and Site-owned font files:
  [NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md#fonts).

## Tokens and CSS rules

- `theme.palette` and `theme.style.token`, resolved over the followed blocks, are the only source of Ant Design
  design tokens. `cssVar` output and SSR `--ant-*` variables derive from that source. `px2remTransformer` is
  a rem bridge, not a token source.
- Client Components read Ant Design semantics from `usePhiConfig().token` (or `theme.useToken()` inside a
  nested Ant Design provider). Plain CSS and Server Components use `var(--ant-...)`. Server Components never
  depend on `ConfigProvider` or client theme hooks.
- `--phi-*` is reserved for Phi-owned structural or technical values that Ant Design does not model -- Shell
  geometry, Builder scaffold geometry, effects, the rem root value, font sources, Control shape radii. Do not
  mirror Ant Design colours, spacing, radii, typography, shadows, control sizes, or motion into `--phi-*`.
- Custom colours are data in `usePhiConfig().customColors`, never global CSS variables; consumers do not
  reconstruct them from CSS or substitute semantic tokens. The Theme workspace is the only place that supplies
  an unpublished draft palette explicitly.
- A component-scoped custom property may bridge a live token into a selector or pseudo-element; it is an
  implementation detail, not a second theme API.
- Use inline styles for geometry and per-instance layout values. Do not hydrate token-derived visual end
  values (`color`, `background`, `border*`, `boxShadow`) through inline styles in Client Components when a
  class or CSS variable expresses them; browsers normalize them and cause hydration mismatches.
- `PHI_*` constants (`theme/phi-tokens.ts`) are seed and default values, not an active runtime theme source.
  Stable Shell dimensions come from `theme.shell`, with `PHI_*` only as defaults.
- Server components may read `runtime.site.theme` only for Site-owned contracts Ant Design does not model,
  such as Shell, Brand, and Contact.
- Prefer Ant Design theme and component tokens and component variants over CSS overrides. Hardcoded colours,
  radii, typography values, or bespoke tuning are added only on explicit operator request.
- `ConfigProvider` carries Ant Design configuration only, never Phi Site or runtime config. Provider-level
  component styles are never hardcoded in the root layout; visual defaults flow through the shared token
  helpers and stay overridable by `site.theme`.
- Feature code persists semantic Phi values (for example `theme.shape.controls`); adapter token names and CSS
  values are resolved centrally and never appear in Module or Widget config.

### Phi scale

The base spacing scale is global across Phi Sites (`PHI_PADDING`, `theme/phi-tokens.ts`):
`xxs = 3`, `xs = 8`, `sm = 13`, `base = 21`, `md = 34`, `lg = 55`, `xl = 89`, `xxl = 155`.
Site Themes override from that base; they do not replace it with an unrelated spacing system. Theme resolution
has three layers: the root CSS baseline, the default Ant Design theme derived from the Phi scale, and the Site's
`site.theme` values.

### CSS files

- `PhiRootLayout` imports `antd/dist/reset.css` directly and hosts the providers; it does not own Shell
  topology.
- `styles/root.css` holds the base `html` / `body` rules, root-level effect rules, and small utilities.
- `styles/control-shape.css` applies the Control shape to small and large Control sizes.
- `styles/shell.css` and Region chrome: [SHELL.md](./SHELL.md#css-ownership).
- `styles/layout.css`, `layout-authoring-scaffold.css`, `layout-affordances.css`, and `builder-scaffold.css`:
  [LAYOUTING.md](./LAYOUTING.md#styling). Builder scaffold styles are imported only by Builder authoring,
  never by the Root or a Public runtime entry.

## Rules

- `site.theme` holds Site-wide presentation defaults. It is not the page-metadata owner; page title and
  description come from the Page record.
- Widget instance config lives on CMS nodes; Area presets own Region, Layout, and Widget structure.
- A Widget or Layout is a shell around Ant Design: inside one, Ant Design is free, and a Widget may arrange its
  own Controls with `Flex`, `Space`, `Row`, or `Col`. Composing several Widgets belongs to Layouts and their
  slots only, never to an Ant Design layout primitive or hand-written CSS. A Widget never contains another
  Widget.
