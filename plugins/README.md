# plugins

Runtime Module infrastructure. Nothing in this folder is a Widget or Layout implementation.

- `runtime-modules/<module>/` -- one folder per first-party Runtime Module, in the layout defined by
  [MODULES.md](../MODULES.md#required-first-party-physical-layout).
- `runtime-modules/area-contributions/`, `client-area-contributions/`, `client-authoring-providers/`,
  `client-manifests/`, `area-catalogs/` -- the per-Area aggregators that list which Modules an Area
  carries. They import Module projections and nothing else.
- `runtime-modules/contracts.ts`, `resolver.ts`, `descriptor-compiler.ts` -- catalog construction and
  validation, request-time Module resolution, and the descriptor and route compiler.
- `runtime-modules/site-modules*.ts(x)` -- composition of installed Module packages from the projection
  `phis module` generates.
- `registries/` -- Controller contract helpers (`runtime-controller-core.ts`) and strict parsing of
  persisted Controller settings (`runtime-controllers.ts`). Controller metadata comes from the Module
  catalog, never from a list here.
- `runtime/` -- renderer-owned slot helpers: slot-size policy (`slot-size-policy.ts`) and the slot child
  frame that carries it through live, preview, and editor rendering (`phi-slot-child-frame.tsx`).
- `factories/` -- shared adapters for Widget plugins (`widget-builder-plugin.ts`,
  `widget-renderers.ts`).

The contracts these files implement are [MODULES.md](../MODULES.md) (ownership, activation, loading,
Canvas sandbox), [THIRD_PARTY_MODULES.md](../THIRD_PARTY_MODULES.md) (the package walkthrough), and
[SIGNALS.md](../SIGNALS.md) (capabilities and routes).
