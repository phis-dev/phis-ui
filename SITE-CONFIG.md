# Site Config Contract

This file documents the shared `site.theme` contract currently used by `@phis/ui`.

For package-owned Theme preset authoring, see
[THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#5-add-a-theme-preset). Site overrides documented here
remain separate from immutable Module presets.

## `theme.mode`

- `light | dark`
- Semantic theme mode for shared shells, layouts, and widgets.
- The Ant Design algorithm is derived from this value.
- This contract is dynamic and loaded per request, so runtime rendering may react to theme changes without changing the live shell contract.
- A future active-theme selector may be added alongside this contract, but the current API already models a request-resolved theme state.

## `theme.rootBackground`

- `light?: PhiCmsBackgroundWidgetConfig`
- `dark?: PhiCmsBackgroundWidgetConfig`

Defines the site-owned document/root background configured through `/builder/theme`. It reuses the canonical
structured Phi Background contract; Theme code must not introduce a separate gradient, image, Pattern, or noise
schema.

The active value follows `theme.mode`. When the matching mode has no configured Root Background, the runtime
uses the resolved Ant Design layout background (`colorBgLayout` / `PHI_COLOR.bgLayout`). The Root Background is
site-wide in the v1 target contract and has no Area override. The deferred single-pane Header/Sider backdrops
are Shell preset data documented in [SHELL.md](./SHELL.md#root-background-and-shell-backdrop-layers), not fields
below `theme.rootBackground`.

## `theme.chromeOverlay`

- `light?: PhiCmsBackgroundWidgetConfig`
- `dark?: PhiCmsBackgroundWidgetConfig`

Defines the site-owned ground the Header, Sider, and Footer Regions share, configured through `/builder/theme`
beside the Root Background and reusing the same canonical structured Phi Background contract, narrowed to a
color, a gradient, a Pattern, or noise. There is no image Base, `glass` is its only Effect, and it has no
motion; see
[SHELL.md](./SHELL.md#root-background-and-shell-backdrop-layers) for why, for the Regions that paint it, and
for how a Region overrides it.

The active value follows `theme.mode`. A mode with no configured overlay paints nothing, which leaves each
Chrome Region on its own ground. Like the Root Background, the overlay is site-wide in the v1 target contract
and has no Area override; an Area varies it by authoring Region chrome that paints over it.

## `theme.shape.controls`

- `{ topLeft, topRight, bottomRight, bottomLeft }`, each `"square" | "subtle" | "rounded" | "pill"`
- absent: the Control shape of the style block the Theme follows (the core style `phi` states `rounded`)

Defines the site-wide semantic corner treatment for interactive Phi Controls. The persisted value is the
semantic preset only; CSS percentages, pixel radii, Ant Design token names, and per-component Ant Design
overrides are not part of this ABI.

The four corners are the stored form from the start, so a shape that rounds some corners and not others can
arrive later without a stored Theme changing its form. Only four equal corners render today: a record with
differing corners is valid, but resolving it for drawing throws until the adapter can draw it. Anything that
is not four known names -- a bare string included -- is rejected. The Builder's Style tab writes this field
when an author picks a shape; its **Theme** segment removes it together with the authored radii and Control
heights, handing all three back to the style block.

The central Theme/Control adapter resolves the preset for the active `controlSize` and UI implementation:

- `square` removes decorative corner rounding
- `subtle` uses restrained rounding
- `rounded` uses the normal Phi control-radius scale
- `pill` uses a full capsule for rectangular Controls and a circle for square icon-only Controls

`pill` must not be implemented as a literal persisted `border-radius: 50%`: on a rectangular box that produces
elliptical corners. Its effective radius is derived centrally from the rendered Control height or an equivalent
implementation-native full-radius value.

This setting is separate from the existing generic `borderRadiusSM`, `borderRadius`, and `borderRadiusLG`
Theme scale. That scale continues to govern surfaces and general component chrome such as Layout/Card, Table,
Tree, Modal, Drawer, and popup containers. Control shape governs interactive Control bodies and triggers only.
For Phi-owned Controls, the resolved semantic Control shape takes precedence over conflicting raw adapter-level
component-radius overrides so there is one effective source of truth.

Intrinsic component geometry remains authoritative: Switch stays capsule-shaped; Checkbox and Radio retain
their semantic shapes; joined/compact Control groups round only their outer boundary. Popup surfaces opened by
a Select, Picker, or Cascader use the surface-radius scale even though their trigger uses the Control shape.

## `theme.fonts`

- `body?: string`
- `mono?: string`

Controls the base body and mono font families.
- Typography is expected to remain theme-configurable, including future rem-based root scaling that can be bridged into Ant Design at runtime.

## `theme.rem`

- `rootValue?: number`
- `fontSize?: number`

Used as the runtime bridge for rem scaling.
- `rootValue` feeds the Ant Design `px2remTransformer`.
- `fontSize` is the base font size that the consuming app should apply at the document root.

## `theme.brand`

- `homeHref?: string`
- `eyebrow?: string`
- `logo.light?` / `logo.dark?`: one Logo per mode, each one of
  - `{ sourceKind: "asset", assetId: number, url?: string }` (`url` is resolved on read)
  - `{ sourceKind: "url", sourceUrl: string }` (a Theme Set's inline Logo until a save uploads it)
  - `{ sourceKind: "none" }`
- `slogan.label?: string`
- `slogan.icon?: string`
- `location.label?: string`
- `location.icon?: string`
- `logoAlt?: string`
- `wordmark.fontFamily?: string`
- `wordmark.fontWeight?: number | string`
- `wordmark.letterSpacing?: string`
- `wordmark.parts[]`
  - `text: string`
  - `color?: string`
  - `fontWeight?: number | string`

Used by `PhiBrandWidget`. A mode the record leaves unset shows the Logo of the Theme Set
(`PhiThemeSetBlock.logo`); the first Theme save uploads it and stores the Asset.

Current fallback usage:
- `pub.header_top.left` uses `theme.brand.slogan`
- `pub.header_top.middle` uses `theme.brand.location`

Fallback defaults when not set:
- `slogan.icon = "antd:star"`
- `slogan.label = tr("Trusted digital solutions")`
- `location.icon = "antd:location"`
- `location.label = tr("Welcome to %1", wordmark)`
- `logoAssetId` resolves to the media asset URL in the runtime projection; `logoUrl` remains the rendered URL field consumed by widgets.

## `theme.contact`

- `label?: string`
- `href?: string`
- `icon?: string`

Shared site contact identity used by fallback presets and future shared contact entrypoints.

Current fallback usage:
- `pub.header_top.right`

Fallback defaults when not set:
- `label = "Contact"`
- `href = "mailto:info@<site.hostname>"`
- `icon = "antd:mail"`

Supported icon namespaces:
- `antd:<name>`
- `asset:<path>`

## `theme.widgets.locale`

- `mode?: "label-list" | "compact-pill"`
- `showText?: boolean`

Used by `PhiLocaleWidget`.

## Locale Capability Contract

Locale availability is not a theme concern. It is part of site runtime config and is validated/resolved by `@phis/server`.

- `@phis/server` defines the maximum supported locale capability set.
- The server capability set must cover at least every DeepL target language supported by the configured DeepL provider snapshot.
- Each site exposes a subset through its default locale and available locales.
- Site locales should use BCP-47-style identifiers where applicable, for example `de-DE`, `de-CH`, `en-US`, `en-GB`, `ja-JP`, `zh-Hans`, `zh-Hant`, `pt-BR`, and `pt-PT`.
- `GET /api/v1/site/locale` maps the effective request locale to:
  - Ant Design locale key
  - DeepL target language
  - Intl locale
  - text direction
  - Phi label fallback chain
- Shared UI, widgets, presets, and site apps must consume the resolved runtime locale instead of deriving provider-specific locale keys themselves.
- Ant Design locale must be set at the root `ConfigProvider`; widget-level AntD locale overrides should be avoided unless a component has a documented local exception.
- Site config can be cached by site key. Resolved runtime locale is request-scoped and must not be merged into the site config cache.

## `theme.widgets.account`

- `mode?: "full" | "compact" | "icon-only"`
- `showLabel?: boolean`
- `showChevron?: boolean`

Used by `PhiAccountWidget`.

## `theme.shell`

Shell-level defaults and structural UI options.

Current known fields include:
- `light.background`
- `light.color`
- `dark.background`
- `dark.color`
- `header.light.background`
- `header.light.color`
- `header.dark.background`
- `header.dark.color`
- `header.top.light.background`
- `header.top.light.color`
- `header.top.dark.background`
- `header.top.dark.color`
- `header.top.height`
- `header.top.sticky`
- `header.top.offsetTop`
- `header.top.zIndex`
- `header.main.light.background`
- `header.main.light.color`
- `header.main.dark.background`
- `header.main.dark.color`
- `header.main.height`
- `header.main.sticky`
- `header.main.offsetTop`
- `header.main.zIndex`
- `header.bottom.light.background`
- `header.bottom.light.color`
- `header.bottom.dark.background`
- `header.bottom.dark.color`
- `header.bottom.height`
- `header.bottom.sticky`
- `header.bottom.offsetTop`
- `header.bottom.zIndex`
- `sider.light.background`
- `sider.light.color`
- `sider.dark.background`
- `sider.dark.color`
- `sider.left.light.background`
- `sider.left.light.color`
- `sider.left.dark.background`
- `sider.left.dark.color`
- `sider.left.sticky`
- `sider.left.width`
- `sider.left.collapsedWidth`
- `sider.left.offsetTop`
- `sider.left.zIndex`
- `sider.right.light.background`
- `sider.right.light.color`
- `sider.right.dark.background`
- `sider.right.dark.color`
- `sider.right.sticky`
- `sider.right.width`
- `sider.right.collapsedWidth`
- `sider.right.offsetTop`
- `sider.right.zIndex`
- `footer.light.background`
- `footer.light.color`
- `footer.dark.background`
- `footer.dark.color`
- `footer.top.light.background`
- `footer.top.light.color`
- `footer.top.dark.background`
- `footer.top.dark.color`
- `footer.top.height`
- `footer.top.sticky`
- `footer.top.offsetTop`
- `footer.top.zIndex`
- `footer.main.light.background`
- `footer.main.light.color`
- `footer.main.dark.background`
- `footer.main.dark.color`
- `footer.main.height`
- `footer.main.sticky`
- `footer.main.offsetTop`
- `footer.main.zIndex`
- `footer.bottom.light.background`
- `footer.bottom.light.color`
- `footer.bottom.dark.background`
- `footer.bottom.dark.color`
- `footer.bottom.height`
- `footer.bottom.sticky`
- `footer.bottom.offsetTop`
- `footer.bottom.zIndex`
- other shell-level options that are intentionally not widget-instance config

Notes:
- `background` may be a plain color or a CSS gradient string.
- these legacy Shell surface fallbacks do not replace `theme.rootBackground` or `theme.chromeOverlay`, and do
  not define the deferred shared Header/Sider backdrop layers
- the active variant is selected from `theme.mode`
- surface resolution uses this order:
  - region-specific, for example `header.main.dark.background`
  - family-level, for example `header.dark.background`
  - global shell-level, for example `dark.background`
  - hard system fallback
- default dark shell navigation surface is the AntD dark nav blue (`#001529`)
- default light shell surfaces fall back to the normal AntD component defaults

## `theme.palette`, `theme.style`, `theme.components`

The Site's own values, laid over the Theme blocks it follows (`theme.blocks`, `theme.preset`). The
container names are neutral on purpose: the vocabulary inside is Ant Design's token vocabulary, the
record is not a dump of `ConfigProvider` state.

- `palette?: PhiThemePalette` -- colour, in the one shape a Module ships a palette in
  (`theme/phi-theme-presets.ts`): `seed` for the seeds both modes share (`colorPrimary`, `colorInfo`,
  `colorSuccess`, `colorWarning`, `colorError`, `colorLink`), and `modes.light` / `modes.dark` each with
  `seed` (the two base seeds `colorTextBase`, `colorBgBase`, which have no value valid in both modes),
  `overrides` (explicit colour tokens that are not seeds, such as `colorLinkHover` or `colorBgLayout`),
  and `customColors` (the ten Phi custom colours).
- `style?: { token?: Record<string, unknown> }` -- structural tokens the author set: radii, control
  heights, spacing, typography sizes. Mode-free.
- `shape?: { controls?: ... }` -- the Control shape the author picked; see `theme.shape.controls` above.
- `components?: Record<string, Record<string, unknown>>` -- component overrides, merged per component
  over the shared component defaults.

Resolution per mode is one chain everywhere: structural defaults, then the palette block with the Site's
`palette` merged over it field by field, then `style.token`, then fonts. Absent means "follow the
block". Saving a Theme that resolves to a Module's palette, style (with its Control shape) or ground copies that block into these
fields (`theme/phi-theme-adoption.ts`), so a saved Site does not depend on the Module staying installed;
core blocks are followed, never copied.

## Rules

- `theme` is for site-wide presentation defaults.
- Widget instance content/config must not be stored under `theme.widgets.*`.
- CMS widget rows own widget instance config.
- CMS area presets own region/layout/widget structure.
- Theme-facing feature code persists semantic Phi values such as `theme.shape.controls`; adapter-library token
  names and CSS implementation values are resolved centrally and must not leak into Module or Widget config.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility
contract. If it cannot express a requirement, implementation stops and asks the operator first.
