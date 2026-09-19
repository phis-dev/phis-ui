# Repository Guidelines (@phis/ui)

Rules for agents working in this repository. The contracts themselves live in the documents listed under
[Where contracts live](#where-contracts-live); this file does not restate them.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening any documented or typed contract requires
explicit prior operator approval after the exact gap and the affected ABI have been presented. This
covers every contract document below, closed enums, discriminated unions, and shared type families.

- A request to analyze, review, diagnose, or propose a contract is not permission to edit contract
  documentation or ABI types. Approval covers the stated direction only, not adjacent fields, values,
  capabilities, or design axes.
- No implementation task, local type, Module path, Provider path, fallback, compatibility branch, or
  parallel contract may bypass that gate. If the current contracts cannot express a requirement, stop and
  ask; do not encode new meaning in an ad hoc string, custom channel, fallback branch, or local
  workaround.
- An approved reusable extension is implemented centrally and documented first; a Module consumes it
  without an identity branch.
- ABI-breaking cleanup is allowed inside an approved direction. The package is pre-v1: update callers
  directly and do not keep old and new shapes in parallel, add shims, or add compatibility readers.
- No workarounds without prior operator approval. State the real root cause before changing package
  structure or dependency strategy.

## Where contracts live

| Topic | Owner |
| --- | --- |
| Package entry page, requirements, entry points | [README.md](./README.md) |
| Areas, CMS tree, renderable blocks, instance identity | [CMS.md](./CMS.md) |
| Signals, addresses, Core Runtime Controller, drag and drop | [SIGNALS.md](./SIGNALS.md) |
| Runtime Modules: ownership, activation, loading, presets, addresses | [MODULES.md](./MODULES.md) |
| Building a third-party Module package | [THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md) |
| Next.js Site boundary, route graph, fonts, metadata and sitemap | [NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md) |
| Static rendering of Public pages | [STATIC_RENDERING.md](./STATIC_RENDERING.md) |
| Shell topology and shell CSS | [SHELL.md](./SHELL.md) |
| Layouts, Regions, slots | [LAYOUTING.md](./LAYOUTING.md) |
| `site.theme`, Theme blocks, Theme CSS and tokens | [THEME.md](./THEME.md) |
| Widget layer, editor scaffold, Controls | [components/widgets/README.md](./components/widgets/README.md) |
| Forms | [FORMS.md](./FORMS.md), [components/forms/PRESET_FORMS_HOWTO.md](./components/forms/PRESET_FORMS_HOWTO.md) |
| Tables, Trees, Collections | [TABLES.md](./TABLES.md), [TREES.md](./TREES.md), [COLLECTIONS.md](./COLLECTIONS.md) |
| Modal and Drawer Overlays | [OVERLAYS.md](./OVERLAYS.md) |
| Builder | [BUILDER.md](./BUILDER.md) |
| Settings container | [SETTINGS.md](./SETTINGS.md) |
| Viewer access, roles, responsive visibility | [ACCESS.md](./ACCESS.md) |
| Auth Module | [AUTHENTICATION.md](./AUTHENTICATION.md) |
| Page paths and internal references | [REFERENCES.md](./REFERENCES.md) |
| Translation helpers, Label Sets, locales | [TRANSLATIONS.md](./TRANSLATIONS.md) |
| Gateway caches | [gateway/CACHES.md](./gateway/CACHES.md) |
| Designs that are not contracts | [design/](./design/README.md) |
| Open work | [TODOS.md](./TODOS.md) |

Server-side contracts (groups and storage, authorization, Add-ons, directory providers, locale capability)
live in the `phis-server` repository and are consumed here, never redefined. Guided Tours are not built;
their design is [design/TOURS.md](./design/TOURS.md).

Read the relevant owner documents and the affected preset and component files before a structural
change. If a contract is unclear, stop and ask instead of guessing.

## Working rules

- Use `pnpm` for local commands. Documentation is written in English.
- Delete files with `rm -- <explicit-path>`; resolve every target first and use no recursive deletion,
  globs, or unresolved variables for individual source files. Move and rename with `mv` (or `git mv`),
  not delete-and-recreate.
- Keep output small. Capture one Git baseline at the start of a work block, inspect only affected files
  and risk-relevant hunks, and do not reprint full diffs, documentation, or successful check output.
  Re-read repository guidance after a new session, a repository switch, a major context compaction, or a
  relevant contract change.
- Verify with the quiet runner, which prints only failures:
  - `pnpm -s verify` (profile `changed`) picks the smallest check set from the current Git changes; use
    it before a commit.
  - `pnpm -s verify <profile>` runs a fixed set: `docs` (whitespace), `code` (TypeScript and ESLint),
    `runtime` (adds `runtime-modules:check`), `antd` (adds the Ant Design doctor), `package` (ESLint and
    the distribution build with validation), `all`.
  - Use `runtime` after changing Module ownership or lazy descriptors. Do not run `all`, a full build, or
    the Ant Design doctor for an unrelated small change.
  - While a consuming Site runs `next dev`, do not use `next build` as routine verification. Run
    `pnpm build` only when packaging, exports, bundling, or SSR output must be verified.
- Do not commit without explicit operator authorization. An instruction to implement, verify, and
  commit authorizes only the scoped commit for that task, after the agreed checks pass. If a required
  functional or browser check cannot be performed, report it instead of committing.
- Research Ant Design with the pinned CLI before guessing APIs, deprecations, or migration advice:
  `pnpm exec antd info <Component> --format json`, `antd doc`, `antd demo`, `antd token`,
  `antd semantic`, `antd lint`, `antd doctor`.
- If a shared component shows styling, hydration, or context regressions, check for duplicate runtime
  package resolution before changing component behavior.

## Design rules

- Reuse before adding: look for an existing helper, contract, plugin, preset, Control, or wrapper, and
  extend a shared contract instead of adding a site-specific case or a parallel family. If reuse is not
  obvious, ask.
- Modules are Site extensions, Add-ons are server extensions ([MODULES.md](./MODULES.md)). Phi-owned
  Modules are reference implementations and follow the owner-folder layout exactly. A Module preset uses
  generic Core Widgets, Provider bindings, Form ids, and signal routes; domain wrappers that only inject a
  Provider, Form, labels, or routes are forbidden.
- Installing a Module never patches the Site Skeleton; optional Site code stays in Module packages and
  `phis module` writes only the generated projection.
- Cross-Widget, Inspector, and shell coordination uses the signal bus ([SIGNALS.md](./SIGNALS.md)), not
  preset-local or Widget-name-specific logic. Replies pass `signal.correlationId`; listeners name the
  addresses they read; `condition/reload` is answered with `usePhiRuntimeConditionStateResponder`.
- The Builder Inspector reads only declarative Widget metadata (`fields`, `runtimeSignals`,
  `contentBinding`, `slotSizePolicy`); no `if` or `switch` on Widget type, key, or plugin identity.
- Ant Design is imported only inside the canonical `Phi*Control` adapters and root/theme adapters. When a
  Phi Control exists, first-party and third-party code uses it. Feature code never imports Ant Design
  `Tour`. The validator **refuses by default**: `antdImportAllowance` names every Ant Design import made
  outside `components/controls/` -- values, types and deep paths alike -- with the reason for each, and
  anything absent fails. A primitive nobody has thought of is refused rather than permitted, so adding
  one is a decision written down rather than an import nobody noticed. Ant Design is replaceable in
  principle, and each direct import turns that from a Control-adapter change into a tree-wide edit. So
  prefer a Control wherever one already fits, and do not reach for a layout primitive where a Layout slot
  would have done the same work. `App`, `ConfigProvider` and `theme` are the root and theme adapters and
  stay direct, each named in the allowance with the file that may hold it. antd `List` is deprecated and `Listy` is deliberately not
  adopted in its place; both point at `PhiEntryListControl`.
- Shell and Region infrastructure in the RSC path stays plain React and HTML and imports no Ant Design
  module that needs client context.
- Use the Layout and slot contracts as they are. Do not add wrapper `<div>` layers, alignment shims, or
  centering helpers, and do not add a wrapper only to carry a React `key` or class. If a Layout looks
  wrong, inspect the render and the slot contract first. Layout defaults win; padding, spacing,
  alignment, `style`, and visual overrides are opt-in on explicit request.
- Hardcoded colors, radii, typography, or bespoke visual tuning are exceptions that need an explicit
  request ([THEME.md](./THEME.md)).
- Viewer authorization uses provider-scoped role claims and `canPhiViewerAccess`
  ([ACCESS.md](./ACCESS.md)); a surface whose capabilities differ by role binds `disabledWhen` conditions
  to a Controller permission instead of branching on a role.
- Never drop route path segments a thin wrapper passes into CMS resolution.

## Package and repository layout

- `@phis/ui` is published to npm. The release workflow builds `dist/` with `pnpm build` and publishes from
  there; `pnpm package:pack` packs the same artifact. Inside the Phi workspace, consumers link the source
  with `workspace:*` and set `transpilePackages: ["@phis/ui"]`, so source edits need no rebuild.
- `react`, `react-dom`, `next`, `antd`, `@ant-design/icons`, and `@ant-design/nextjs-registry` are peer
  dependencies. Never introduce a second runtime copy of them, and do not use `file:` dependencies as a
  development path.
- The distribution build emits unbundled ESM with declarations and CSS, preserves `"use client"`,
  lazy imports, and Area-specific manifests, and never bundles React, Next.js, or Ant Design.
- `@phis/ui` defines no App Router entries (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`,
  `error.tsx`); those stay in the Site as thin wrappers over `@phis/ui/next/*`.
- `constants/*` holds runtime constants, enums, and flags; `types/*` is type-only apart from readers that
  belong to a type; `helpers/*` holds pure helpers; `server-helpers/*` public server-only helpers.
- `gateway/*` is the internal `phis` adapter layer and has no package export. A Site mounts its route
  handlers from `@phis/ui/next/route-handlers`; Label Set helpers are exported from
  `@phis/ui/server-helpers`.
- `components/controls/*` holds the Phi Controls, `components/layouts/*` the Layout implementations,
  `components/forms/*` the Form host and providers, `components/overlays/*` the Overlay renderer, and
  `components/widgets/*` code shared by several Widgets. A Widget itself lives in its owner Module under
  `plugins/runtime-modules/<owner>/widgets/<name>/`.
- `plugins/runtime-modules/*` holds the Modules and per-Area aggregators, `plugins/registries/*` Controller
  helpers, `plugins/runtime/*` renderer-owned slot helpers, `plugins/factories/*` plugin adapters.
- Browser interaction lives in client files (`client.tsx`, `clients/*`); a server half passes a
  serializable view model and never builds client-only Ant Design trees.

## Naming

- Public API components, helpers, and libraries use the `Phi` prefix; internal files, helpers, and
  structural primitives that are not exported do not.
- `PhiServer*` names the server half of a pair whose client half is the bare `Phi*` name
  (`PhiServerBlockBaseProps`, `PhiServerThemeTokens`); it is this package's own prefix.
- A name from `@phis/contracts` keeps the contract's spelling: `Phi*` for what this package reads
  (`PhiCapabilityState`, `PhiLogEvent`); `Phis*` names are read only by `phis` and its Add-ons. "Server"
  inside a name (`PhiRuntimeModuleServerBinding`) describes the thing, not the namespace.
- Name helpers by meaning: `hasPhiBaseRole` checks a role, `canPhiViewerAccess` checks effective access.
