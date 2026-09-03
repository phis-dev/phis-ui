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
site-wide in the v1 target contract and has no Area override. Area-owned Header/Sider backdrops are Shell preset
data documented in [SHELL.md](./SHELL.md#root-background-and-shell-backdrop-layers), not fields below
`theme.rootBackground`.

## `theme.shape.controls`

- `"square" | "subtle" | "rounded" | "pill"`
- default: `"rounded"`

Defines the site-wide semantic corner treatment for interactive Phi Controls. The persisted value is the
semantic preset only; CSS percentages, pixel radii, Ant Design token names, and per-component Ant Design
overrides are not part of this ABI.

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
- `logoAssetId?: number`
- `slogan.label?: string`
- `slogan.icon?: string`
- `location.label?: string`
- `location.icon?: string`
- `logoUrl?: string`
- `logoAlt?: string`
- `wordmark.fontFamily?: string`
- `wordmark.fontWeight?: number | string`
- `wordmark.letterSpacing?: string`
- `wordmark.parts[]`
  - `text: string`
  - `color?: string`
  - `fontWeight?: number | string`

Used by `PhiBrandWidget`.

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
- these legacy Shell surface fallbacks do not replace `theme.rootBackground` and do not define the shared
  Header/Sider backdrop layers
- the active variant is selected from `theme.mode`
- surface resolution uses this order:
  - region-specific, for example `header.main.dark.background`
  - family-level, for example `header.dark.background`
  - global shell-level, for example `dark.background`
  - hard system fallback
- default dark shell navigation surface is the AntD dark nav blue (`#001529`)
- default light shell surfaces fall back to the normal AntD component defaults

## `theme.antd`

- `token?: Record<string, unknown>`
- `components?: Record<string, Record<string, unknown>>`

`site.theme.antd` is the intended place for runtime-overridable Ant Design theme deltas.
The root layout may bridge these values into Ant Design `ConfigProvider` and `StyleProvider`, while the rest of the app consumes the resolved runtime theme.

Site-level Ant Design token and component overrides.

Examples:
- `colorPrimary`
- `colorLink`
- `colorLinkHover`

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
