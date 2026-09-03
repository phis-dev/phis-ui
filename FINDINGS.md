# phi-shared-ui audit findings

Recorded 2026-08-17 against `c414a20`. Analysis only — no production changes were applied as part
of this audit. Measurements were taken on a production build of `phis-site-skeleton` (Next 16.2.11,
Turbopack) via `next build` + `next experimental-analyze --output`, attributing every first-load
chunk of the Public host route `/[root]/[[...path]]` to its source modules.

## 1. Public first-load payload — measured breakdown

Baseline (current `main`): **2,240,956 B uncompressed / ~718 KB transferred** across 45 chunks.

| Category | uncompressed | share |
| --- | ---: | ---: |
| antd | 853,000 | 38.9% |
| next runtime (incl. vendored react-dom) | 514,960 | 23.5% |
| rc-* / @rc-component (antd base) | 492,549 | 22.4% |
| shared-ui own code | 166,249 | 7.6% |
| @ant-design/* (colors, cssinjs, …) | 73,421 | 3.3% |
| @ant-design/icons | 45,127 | 2.1% |
| dayjs, stylis, misc | ~50,000 | 2.2% |

The antd ecosystem is **66.7%** of the Public first load, and the component list includes Table,
DatePicker, ColorPicker, Transfer, Upload, Steps, Tour, Carousel, QRCode — authoring surfaces a
public page never renders.

### 1.1 Root cause: antd barrel import from RSC files (FIXED, measured)

The module graph (dependents walk over the analyzer's `modules.data`) shows every one of those
components reachable through a single edge:

```
antd/es/<component> [app-client]
  <= antd/es/index.js [app-client] <module evaluation>
  <= antd/es/index.js [app-rsc] (client reference proxy)
  <= phi-shared-ui/components/root/phi-root-layout.tsx [app-rsc]
```

`phi-root-layout.tsx` (a server component mounted on every Area route) does
`import { App as AntdApp } from "antd"`. A **client-reference proxy created from a server
component pins the whole barrel's module evaluation** — the client must load all of antd eagerly.
Tree shaking never gets a chance; this is specific to RSC → client-reference imports (client
components importing the same barrel tree-shake fine, which is why the eager shell imports of
`Dropdown`/`Avatar`/`Typography` are harmless).

Exactly two RSC files import the barrel:

- `components/root/phi-root-layout.tsx` — `App as AntdApp` (every Area, every page)
- `components/widgets/shared/result-body.tsx` — `Result`

**Fix (2 lines), verified by experiment build and applied on operator instruction.** Widget
availability is untouched: the Runtime Module client manifests stay fully lazy (§1.3), so a
Builder placing e.g. a Table widget on a Public page loads that widget's chunk — including its
antd parts — on demand at render time, exactly as before. Only the eager barrel download goes.

```diff
-import { App as AntdApp } from "antd";
+import AntdApp from "antd/es/app";
-import { Result } from "antd";
+import Result from "antd/es/result";
```

Measured effect on first-load uncompressed bytes:

| Route | before | after | Δ |
| --- | ---: | ---: | ---: |
| `/[root]/[[...path]]` (Public) | 2,240,956 | 1,258,644 | **−982,312 (−44%)** |
| `/app/[[...path]]` | 2,240,895 | 1,258,583 | −982,312 |
| `/admin/[[...path]]` | 2,237,716 | 1,247,294 | −990,422 |
| `/editor/[[...path]]` | 2,231,665 | 1,238,537 | −993,128 |
| `/accounting/[[...path]]` | 2,229,318 | 1,236,190 | −993,128 |
| `/builder/[[...path]]` | 2,759,765 | 2,467,941 | −291,824 |

Estimated transfer for Public after the fix: **~410 KB** (from ~718 KB), at the observed ~3.05×
gzip ratio. Guardrail added: `scripts/validate-client-reference-imports.mjs` fails when a file
without a `"use client"` directive imports the `antd` or `@ant-design/icons` barrel (type-only
imports stay allowed); wired into `runtime-modules:check` and exposed as
`pnpm client-references:check`.

### 1.2 Composition after the fix (what remains, 1,252,634 B / 27 chunks)

| Category | uncompressed | share |
| --- | ---: | ---: |
| next runtime (incl. react-dom) | 621,786 | 49.6% |
| antd (shell remainder) | 237,902 | 19.0% |
| shared-ui own code | 144,119 | 11.5% |
| rc-*/@rc-component | 133,273 | 10.6% |
| @ant-design/*, icons, misc | ~116,000 | 9.3% |

The Next runtime is the floor. The remaining antd (`result` 34K, `input` 21K, `modal` 20K,
`button`, `typography`, `theme`, `notification`, `skeleton`, …) comes from the eagerly loaded
shell/root layer.

**Follow-up (FIXED, measured):** the module graph identified three eager carriers on Public —
`result-body.tsx` (server widget registry → client reference on antd `Result`),
`phi-cms-render-diagnostic.tsx` (referenced by the layout renderer on every route, pulls
Alert/Typography and dragged an antd `input`/`typography` chunk into first load through chunk
sharing), and `widget-preview.tsx` (referenced by widget plugin definitions, pulls
Skeleton/Typography). All three became in-place lazy boundaries (implementation moved to
`*-client.tsx`, same import surface, `React.lazy` + `Suspense fallback={null}` — the
motion-layer pattern). Measured effect: Public first load 1,258,644 → **1,044,053 B**
(−214,591; transfer 395,626 → **347,500 B**, 25 → 22 scripts); all other Area routes −214 KB,
Builder −195 KB. Combined with the barrel fix, Public transfer went 718 KB → 347 KB (−52%).

Remaining, deliberately kept eager: the `App` context (`core-runtime-application-adapter` —
message/modal/notification hooks belong to the shell) and ConfigProvider/theme. Some small
antd remnants (`checkbox`, `collapse`, ~7K each) ride along shared chunks of the auth overlay
group; not worth further surgery. Realistic floor reached: ~1.0 MB uncompressed ≈ ~340 KB
transferred.

### 1.3 Widget clients are already lazy (verified)

All Runtime Module render/controller/calendar client manifests register loaders via dynamic
`import()` behind `React.lazy` (`runtime-module-render-client-manifest.tsx`). In the module graph
the heavy widget clients (`phi-color-control`, `phi-table-control`,
`gregory-calendar-adapter-client`, `auth-workflow-body`, `phi-area-upload-widget`) have **no eager
dependents** — they live in on-demand chunks and load only when a page renders them (network-level
proof: the background-motion chunk experiment earlier today). The lazy-loading architecture is
working as designed; the barrel import was the one hole.

## 2. "Landing page per Area" idea — assessment

Idea under consideration: give `/` of each Area its own landing page with a different region
split and a small widget set, so the heavier load lands later on `public/<subpage>`.

What the data says:

- **First-load JS is per Area route, not per page.** All Public pages share the same initial
  chunk set; today a slim landing at `/` would save almost nothing of the 2.24 MB, because that
  payload is page-content-independent (barrel + runtime + shell). The barrel fix in §1.1 is worth
  ~25× more than any landing-page slimming and benefits every page at once.
- **After the fix** the per-page cost is exactly the lazy widget chunks + RSC payload of the
  widgets the page actually renders. A slim landing then does help the first paint of `/`
  (fewer lazy chunks, less flight payload, faster LCP) — a real but second-order win.
- **Subsequent navigation is already cheap.** Area base cost is paid once; navigating
  `/` → `public/foo` fetches only the missing widget chunks over client-side navigation. The
  "longer load hides on later pages" effect the idea aims for is how the architecture already
  behaves once first-load is fixed.
- **No architecture change needed for the content side.** Pages own their trees, and per-page
  region layouts are available through the layout plugin system (`page-region-layout-plugin`), so
  a landing with its own region split and reduced widget set is a Builder/content exercise, not a
  platform feature.

Recommendation: do §1.1 first, re-measure, and treat the landing page as a design/content
decision rather than a performance measure.

## 3. Dead code — 116 unused value exports

Scan: all value exports (`export function|const|class`, type-only exports excluded) across
shared-ui, cross-referenced by name against **all consumers** — `phis-site-skeleton` (src and
config roots), `phi-shop`, `phi-support`, `phi-calendar` and shared-ui itself (string occurrences
count as usage, so registry-by-name patterns are covered). phi-server, phis-cli and non-`src`
skeleton files were counter-checked separately: zero references. shared-ui has no test files, so
there is no test-only usage to lose.

Highlights by group (full list reproducible with the scan below):

- **Layout plugin `*_PLUGIN_TYPE` constants (12×)** — every `components/layouts/plugins/*` file
  exports its plugin-type constant; none is referenced anywhere (registration goes through the
  definition objects).
- **Signal surface**: `PHI_SIGNAL_CHANNELS`, `findPhiSignalRouteByKey`, `readPhiSignalAddress`,
  `resolvePhiControllerSignalEndpoints`, `resolvePhiRegionSignalEndpoints`,
  `PHI_STACK_SIGNAL_CHANNEL`, `PHI_PAGE_TITLE_SIGNAL_KEY`, control-signal capability sets (3×).
- **Media/preview store helpers**: `deletePhiImagePreviewStore`, `removePhiImagePreviewAsset`,
  `resetPhiImagePreviewStore`, `setPhiImagePreviewDateRange`,
  `buildPhiImagePreviewFolderPathSegments`, `buildPhiMediaFolderOptions`,
  `usePhiAssetCollectionRuntime`, media flag helpers in `constants/media.ts`.
- **CMS serialization round-trip** (`helpers/cms-config-serialization.ts`, 6 exports) — the
  serialize/deserialize pair for directional layout and renderable block configs is entirely
  unreferenced.
- **Site-structure fossils**: `NAV_ITEMS`, `PRODUCT_PANELS` (`helpers/site-structure.ts`),
  `canAccessPage`, `resolveCmsPath`, `isApiV1Path`, `isMedusaApiPath`, `buildLocalProxyPath`.
- **Misc**: `phiSharedLogger` (`net/log.ts`), `clearPhiLabelSetCache`, `matchesPhiCmsVisibility`,
  `getPhiSiteLocaleConfig`, `PhiDrawer`/`PhiModal` re-exports, `PhiRuntimeModuleAuthoringHost`,
  `PHI_MOTION`, `PhiCmsRegionStatus`, `PhiCmsRevisionFlags`, and ~50 more single items.

Caveats before deleting: several names are deliberate public ABI even if currently unconsumed
(e.g. `phiSharedLogger` is the documented logging entry point; the signal address helpers mirror a
documented contract). Recommended split: delete the clear fossils (site-structure, preview-store
mutations, serialization round-trip, plugin-type constants), keep contract-documented entries and
mark them, decide per item for the rest. Scan script:
`/tmp/…/scratchpad/shared-audit.py` (session scratchpad; re-runnable).

## 4. Consolidation / duplicate paths — no hotspot

> **Follow-up 2026-08-29 — this section asked the wrong question.**
>
> It looked for *semantic* duplicates: two ways to do one thing. There were none, and that verdict
> still holds for what it measured. But the repository did carry a structural problem of the exact
> opposite shape: **one** way, scattered across seven directories. Every first-party Module had its
> definition in `module-definitions/`, its module in `modules/`, its Client loader in
> `client-loaders/`, its Authoring Client in `client-authoring-modules/`, its providers in
> `client-data-providers/`, its presets in a flat `first-party-presets-*.ts`, and its id in a shared
> `ids.ts` — with the implementations again split between `components/<module>/` and
> `components/widgets/{config,client,server,plugins,builder}/`. Roughly 500 files.
>
> A search for redundancy cannot find that, because the number of implementations was always one.
>
> The method is the second reason. This audit measured through the **bundle graph** —
> `firstLoadChunkPaths`, module edges, byte sizes. To a bundler it is irrelevant whether a module
> definition sits in `module-definitions/theme.ts` or in `theme/definition.ts`; the graph is
> identical and the scatter is invisible at that layer.
>
> What was visible, and went unasked: `validate-runtime-module-manifests` has required
> `ids.ts`/`definition.ts`/`module.ts`/`server.ts` per owner folder for some time, and **one Module
> out of eighteen** satisfied it. That ratio sat in the verifier the whole time. Nobody asked why —
> and the natural misreading is to conclude the one conforming Module is the odd one out rather than
> the only correct one.
>
> **For the next audit:** "duplicate paths" is a question about redundancy. The question that would
> have found this is about *conformance* — where does the implementation diverge from the structure
> the verifiers already demand? Both sound like tidying; they measure different things. A cheap
> proxy: run each verifier's own discovery step and count how many owners it finds versus how many
> exist.
>
> Resolved by the module-folder migration of 2026-08-29; the layout is now normative in
> [MODULES.md](./MODULES.md).


- **Gateway layer is thin**: 27 files, 2,874 lines total; site-key headers, URL building and
  envelope reading go through the shared `data-source-fetch.ts` / `mutation-fetch.ts` helpers.
  Only `site-form-route.ts` sets `x-phis-site-key` directly (it proxies, so that is correct).
- **Client envelope gates** were already converged in the server envelope stage 2 work
  (`{error, message?, details?}` + HTTP status; form gateway excluded by design).
- The `types/references.ts` ≙ `phi-server/src/lib/internal-references.ts` codec twin is an
  intentional contract mirror (documented in REFERENCES.md), not duplication to remove.

## 5. Method notes / reproduction

- Build + analyze as the `phis` user: `next build`, then `next experimental-analyze --output`;
  data lands in `.next/diagnostics/` (`route-bundle-stats.json` has per-route
  `firstLoadChunkPaths`; `analyze/data/analyze.data` and `modules.data` are 4-byte-length-prefixed
  JSON with a trailing big-endian u32 CSR graph: `[n][offsets][edges]`, `module_dependents` /
  `module_dependencies` offsets are byte offsets into that trailer).
- `experimental-analyze` performs its own instrumented build with different chunk hashes; match
  analyzer chunks to the regular build's `firstLoadChunkPaths` by byte size (exact match achieved:
  45/45 chunks, byte-identical totals).
- Scratchpad artifacts from this audit: `payload-breakdown.txt`, `payload-after.txt`,
  `import-chains.txt`, `shared-audit.py`.
