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
| Navigation surfaces (header menu, footer Quick Links, sidebar, account menu) and how an entry gets in | [MODULES.md](./MODULES.md#navigation-surfaces), [THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#8a-what-a-module-package-exports) |
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
| Content entries (News, Blog): Widgets, Providers, kind Modules | [CONTENT_ENTRIES.md](./CONTENT_ENTRIES.md) |
| Site search: the index the Site writes, `searchText`, the search Widgets and Pages | [SEARCH.md](./SEARCH.md) |
| Translation helpers, Label Sets, locales | [TRANSLATIONS.md](./TRANSLATIONS.md) |
| Gateway caches | [gateway/CACHES.md](./gateway/CACHES.md) |
| Designs that are not contracts | [design/](./design/README.md) |
| Open work | [TODOS.md](./TODOS.md) |

Server-side contracts (groups and storage, authorization, Add-ons, directory providers, locale capability)
live in the `phis-server` repository and are consumed here, never redefined. Guided Tours: a route preset carries
its Page's `tour`, the Tour Module offers it; the design and what is built of it are
[design/TOURS.md](./design/TOURS.md).

Read the relevant owner documents and the affected preset and component files before a structural
change. If a contract is unclear, stop and ask instead of guessing.

## Before you say where something comes from

What a Site shows is computed per request from code-owned descriptors -- route, shell, navigation, Theme
presets -- and only then adjusted by what the Site stored: Area module selections, drafts and revisions,
navigation overlays, translations. Stored state amends the descriptors; it does not replace them.

- Name the thing by its contract term first. A label on screen ("Quick Links", "the menu") is a Widget
  reading a surface; find both in the owner document above before searching code or the database.
- Read the preset that would produce it, then the stored state that could amend it. Claim neither until
  you have checked both.
- Never tell the operator that something must be edited by hand in the database while a descriptor
  could carry it. A database edit is the answer only where the owner document says the value is stored.
- If the documents do not answer where a thing comes from, that is a documentation gap: say so and add
  it to the owner document once the answer is known.

## Before you call something missing

A capability belongs to the Module that owns its domain, not to the field, Control or Widget you happened
to start from. "The picker cannot upload" read off one form field is not "phis-ui cannot upload into a
folder". Before a gap is reported or a proposal written:

1. **Name the owning Module.** The table in [MODULES.md](./MODULES.md#first-party-modules) says who owns
   what; Modules with `activation: "always"` -- the Asset Module for Media -- are in every Area, so their
   Widgets, fields and Providers are always there. Media (picking, uploading, folders, a record's
   pictures) is the Asset Module's, `plugins/runtime-modules/asset/`; its map is
   [THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#media-what-the-asset-module-already-does).
2. **Check every door of that Module, in the code**: its Widgets (`widgets.ts`), its Controller
   (`controller/`), its form field Providers and handlers (`formProviders` in `definition.ts`), its data
   Providers (`data-providers.ts`) and route presets (`presets.ts`), and the Core routes behind them
   (`/api/site/...` in `phis-server`). Then the Core Widgets that bind to its Providers -- the Media
   library page is the `collection-view` Widget with the Media renderer
   (`plugins/runtime-modules/core/widgets/collection-view/asset-binding.tsx`), which draws any
   Provider's collection of Assets as well: a renderer of a Module's own that draws Media tiles is a copy
   of it ([COLLECTIONS.md](./COLLECTIONS.md#the-media-renderer)).
3. **Check the Foundation list**: [THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#before-you-start-what-the-foundation-already-has)
   names every Layout, Core Widget and Control, held to the code by a test.
4. **Report the gap at its real size, with what you checked**: the Module, the files, and the one piece
   that is missing ("the `media-asset` field's picker cannot upload in place"), not the domain. A claim
   without that list is not a finding.

On 2026-11-21 an analysis reported that the Media picker could not upload into a folder and that
phis-ui needed upload and a target folder. Both existed: the Asset Module's `area-upload` Widget and the
Media library page upload into the open Folder, and the upload flow and Core's init take a `folderId`.
What was missing was narrower -- no upload inside the `media-asset` field's picker -- and the report had
read the field's documentation, not the Module's.

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
  - `pnpm -s verify <profile>` runs a fixed set: `docs` (whitespace, and the `Wants:` lines of TODOS.md
    against the catalog), `code` (TypeScript, ESLint and
    the module graph budget, `pnpm audit:graph --check`), `runtime` (adds `runtime-modules:check`),
    `antd` (adds the Ant Design doctor), `package` (ESLint, the graph budget and the distribution build
    with validation), `all`. Every profile also checks `package.json#phis.testedWith` against
    node_modules.
  - The module graph budget (`scripts/audit-module-graph.budget.json`) fails on a new unreachable
    source, Client barrel import or duplicate file, on a Client reaching `server-only`, and on a package
    entry's graph growing past a small headroom. Intended growth is recorded with
    `pnpm audit:graph --update-budget` and said why in the commit.
  - Beside it, two size budgets measured on a Site: `pnpm audit:public-bundle` holds the Public browser
    bundle a production build serves -- the summary line of phis-site-skeleton's `pnpm bundle:check:public`,
    piped in -- to `scripts/audit-public-bundle.budget.json` (the last measurement plus the three-day drift
    that once went unnoticed, +5,320 raw and +1,457 gzip bytes); `pnpm audit:dev-output` reports what the
    Skeleton's development build wrote under `.next/dev` -- Turbopack cache, source maps, server chunks,
    browser chunks -- and `--check` holds each to `scripts/report-dev-build-output.budget.json`. Neither
    builds anything; a production measurement is taken as the browser-test notes describe, never while the
    dev service runs. Recording a new baseline (`--update-budget`) is said why in the commit.
  - `runtime-modules:check` also holds a Widget's config to its render
    (`scripts/validate-widget-config-reads.ts`: every key `fields`, `defaultConfig` or `parseConfig`
    offers is read by a file the Widget renders, not only by the parser, the canvas or the Inspector;
    `--explain <typeKey>.<key>` shows where) and TODOS.md to the catalog
    (`scripts/validate-todos-wants.ts`: an entry's `Wants:` line names no Widget or Form field type
    that exists). THIRD_PARTY_MODULES.md's Foundation list names every Widget and Form field type of a
    Module declared `activation: "always"`, held by `third-party-modules-reference.test.ts`.
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

- **Reuse before adding, and the layers are not optional.** A surface is assembled from what already
  exists: an interactive primitive is a `Phi*Control`, a placeable thing is a Widget with declared
  metadata, a composition of several is a Layout with slots, and anything that collects input and submits
  it is a declared Form -- a `PhiFormDescriptor` with field Providers and a handler
  ([FORMS.md](./FORMS.md), [components/forms/PRESET_FORMS_HOWTO.md](./components/forms/PRESET_FORMS_HOWTO.md))
  -- and not a client component with its own `useState` and its own `fetch`. Look for the existing
  helper, contract, plugin, preset, Control, or wrapper first, and extend a shared contract instead of
  adding a site-specific case or a parallel family.
- **A missing piece is asked for, never worked around.** Where the existing Controls, Widgets, Layouts,
  Forms, field Providers, or presets cannot express a requirement, stop and put the gap to the operator:
  what is missing, where it would live, what it costs. Approved, it is built centrally in the layer that
  owns it and consumed like everything else; unapproved, the requirement waits. Write the gap into the
  owning How-to or contract document while you are there, so the next reader meets the answer instead of
  the workaround -- that is what the How-tos are for, presets included. "It runs" is not the standard: a
  hand-built panel has no validation contract, no label set a translator can reach, no Inspector
  metadata, and no reuse, and the cost lands on whoever rewrites it. The Thread composer is the standing
  example. It kept its own state, its own `fetch`, and no field descriptors long after the Form gateway
  existed, and the upload field Provider it would have needed was missing because nobody had asked for
  it.
- Modules are Site extensions, Add-ons are server extensions ([MODULES.md](./MODULES.md)). Phi-owned
  Modules are reference implementations and follow the owner-folder layout exactly. A Module preset uses
  generic Core Widgets, Provider bindings, Form ids, and signal routes; domain wrappers that only inject a
  Provider, Form, labels, or routes are forbidden.
- Installing a Module never patches the Site Skeleton; optional Site code stays in Module packages and
  `phis module` writes only the generated projection.
- Cross-Widget, Inspector, and shell coordination uses the signal bus ([SIGNALS.md](./SIGNALS.md)), not
  preset-local or Widget-name-specific logic. Replies pass `signal.correlationId`; listeners name the
  addresses they read; `condition/reload` is answered with `usePhiRuntimeConditionStateResponder`.
- A Widget draws itself in the Builder only with meaningful content -- sample values, or the shape of its
  settings. Without any, it leaves `renderEditor` out and declares `renderPolicies.preview:
  "visualPlaceholder"`, and the house placeholder stands in its place; no Widget draws its own skeleton
  as a stand-in ([components/widgets/README.md](./components/widgets/README.md#drawing-itself-or-the-house-placeholder)).
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
- Icons are drawn with `PhiIcon` by name. Only `components/shell/phi-antd-icon.tsx` imports
  `@ant-design/icons`: it loads each icon where it is drawn and maps the house's names onto it. An icon
  that is missing is added there, never imported beside the code that needs it; the validator refuses
  any other import of the package. A Module package does not grow that registry: it registers its own
  icons on its definition and names them `module:<moduleId>/<name>`
  ([THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md#8d-icons-a-module-brings)).
- Shell and Region infrastructure in the RSC path stays plain React and HTML and imports no Ant Design
  module that needs client context.
- Use the Layout and slot contracts as they are. Do not add wrapper `<div>` layers, alignment shims, or
  centering helpers, and do not add a wrapper only to carry a React `key` or class. If a Layout looks
  wrong, inspect the render and the slot contract first. Layout defaults win; padding, spacing,
  alignment, `style`, and visual overrides are opt-in on explicit request.
- Hardcoded colors, radii, typography, or bespoke visual tuning are exceptions that need an explicit
  request ([THEME.md](./THEME.md)).
- A Page preset follows [THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md), "6b. Laying out a Page": one
  `flex-vertical` Page column, the four spacing roles as `PHI_SPACE` steps, padding only on a Surface, no
  step above `md` except a Hero's bottom beside `heroOverlap`. Config only; nothing set by hand.
- Viewer authorization uses provider-scoped role claims and `canPhiViewerAccess`
  ([ACCESS.md](./ACCESS.md)); a surface whose capabilities differ by role binds `disabledWhen` conditions
  to a Controller permission instead of branching on a role.
- Never drop route path segments a thin wrapper passes into CMS resolution.

## Package and repository layout

- `@phis/ui` is published to npm. The release workflow builds `dist/` with `pnpm build` and publishes from
  there; `pnpm package:pack` packs the same artifact. Inside the Phi workspace, consumers link the source
  with `workspace:*` and set `transpilePackages: ["@phis/ui"]`, so source edits need no rebuild.
- `react`, `react-dom`, `next`, `antd`, and `@ant-design/icons` are peer
  dependencies. Never introduce a second runtime copy of them, and do not use `file:` dependencies as a
  development path.
- `package.json#phis.testedWith` states the exact versions of those peers and of the Site toolchain
  (`typescript`, `@types/node`, `@types/react`, `@types/react-dom`) that this package is built and tested
  with; it ships in the published manifest, and `phis init` pins a new Site to it. It is never typed:
  `pnpm tested-with:write` reads it from node_modules, and `pnpm verify` fails in every profile while it
  says anything else -- so a release run whose install resolved a newer patch fails until the workspace
  has been updated, tested and the field written again.
- The distribution build emits unbundled ESM with declarations and CSS, preserves `"use client"`,
  lazy imports, and Area-specific manifests, and never bundles React, Next.js, or Ant Design.
- `@phis/ui` defines no App Router entries (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`,
  `error.tsx`); those stay in the Site as thin wrappers over `@phis/ui/next/*`.
- `constants/*` holds runtime constants, enums, and flags; `types/*` is type-only apart from readers that
  belong to a type; `helpers/*` holds pure helpers; `server-helpers/*` public server-only helpers.
- `gateway/*` is the internal `phis` adapter layer and has no package export. A Site mounts its route
  handlers from `@phis/ui/next/route-handlers`. Label Set helpers are exported from
  `@phis/ui/module/labels`, the one-file door a Module package must use; `@phis/ui/server-helpers`
  carries the same names for a Site's server code, but a Module package that takes them there pulls
  `next/headers` into a graph the browser reaches and every page answers 500. First-party Modules import
  `gateway/label-set` directly.
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
