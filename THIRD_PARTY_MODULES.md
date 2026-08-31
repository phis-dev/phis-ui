# Third-party Site Module guide

This guide is the practical entry point for building a Site/client Module against
`@phis/ui`. It covers package structure, Module ownership, Controllers, Widgets, Theme presets,
Preset Forms, client manifests, Site composition, and verification.

The normative low-level contracts remain in:

- [MODULES.md](./MODULES.md) for the common first-party and third-party Module contribution shape;
- [TABLES.md](./TABLES.md) for generic Tables, Table Providers, editable static resources, and signaling;
- [README.md](./README.md#runtime-modules-and-area-activation) for Module ownership and activation;
- [plugins/README.md](./plugins/README.md) for registries, lazy loaders, and authoring boundaries;
- [components/widgets/README.md](./components/widgets/README.md) for Widget and signaling behavior;
- [components/forms/PRESET_FORMS_HOWTO.md](./components/forms/PRESET_FORMS_HOWTO.md) for Preset Forms;
- [NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md) for the consuming Next.js Site boundary;
- [ACCESS.md](./ACCESS.md) for viewer access policies and third-party roles.
- [AUTHENTICATION.md](./AUTHENTICATION.md) for Auth UI replacement, multi-Area activation, Account Widget
  delegation, and the server trust boundary.

This guide cannot extend, reinterpret, or replace those contracts. Any such change requires explicit
prior operator approval after the exact gap and affected ABI have been presented. A Module must not work
around a missing capability through a local, parallel, shadow, Provider-specific, fallback, or
compatibility contract; implementation stops and asks the operator first.

`@phis/support` in the Phi workspace is the canonical working reference package. It demonstrates a
separately built Module with routes, navigation injections, two Widgets, one Controller, Server,
Controller Client, Render Client, and Authoring Client contributions.

## Terminology and hard boundaries

- A **Module** is a Site/client extension compiled into a Site application.
- An **Add-on** is a server extension compiled into `phi-server` by `phis-cli`.
- The Site package `@scope/name` and its direct server counterpart use the mandatory physical package
  pair `@scope/name` plus `@scope/name-server`. The logical Add-on id remains `@scope/name`.
- A Module binds to Core or exactly one Add-on and declares required versioned server capabilities.
- One package may export several Modules. Each Module owns at most one Controller type and may be
  controllerless when its declared artifacts do not need runtime coordination.
- Every Widget, Layout, Form, provider, route, Theme preset, and authoring adapter has exactly one
  `ownerModuleId`.
- Installation is build-time. Area activation is persisted separately through `runtimeModules`.
- A database package name must never become a dynamic `import()` target.
- Global registries, import-side-effect registration, and client/server compatibility fallbacks are
  not extension APIs.

Every identifier follows one grammar, and it is the same one first-party Modules use:

```text
<npm-package>/modules/<module>                       the Module itself
<npm-package>/modules/<module>/<namespace>/<leaf>    anything the Module owns
```

```text
Module       @acme/status/modules/status
Controller   @acme/status/modules/status/controller/default
Widget       @acme/status/modules/status/widgets/card
Form         @acme/status/modules/status/forms/incident-report
Provider     @acme/status/modules/status/options/services
Signal JSON  @acme/status/modules/status/signals/service-selection
```

Four rules carry it:

1. **`modules` is required, even for a package with one Module.** Without the marker,
   `@acme/status/options` could be a Module named `options` or a namespace under a nameless Module,
   and nothing can tell which.
2. **The namespace is required.** `.../widgets/card`, never `.../card`.
3. **A leaf does not repeat its Module's name.** Under `modules/status`, the Widget is `card`, not
   `status-card`. A Module never needs to say its own name inside its own namespace.
4. **Namespaces come from a closed set** -- `widgets`, `layouts`, `controller`, `forms`, `form-field`,
   `form-validation`, `form-handler`, `options`, `tables`, `trees`, `collections`, `calendars`,
   `signals`, `background-patterns`. A third-party package invents Modules and leaves, not namespaces.

Name the Module for what it does. `core` means a package's unselectable base Module, which is what
`@phis/ui` has; a package with one Module gives it a real name.

The Module id and the Controller type are separate ABI fields and must not be derived from one
another. Under this grammar they also no longer look alike, which they did before it.

The grammar is enforced, not advised: `createPhiRuntimeModuleCatalog` rejects a Module id that does
not carry the marker, and the route, Controller-address, Form-id, and signal-schema readers each
reject their own identifiers when they do not follow it.

## Required package boundary structure

```text
@acme/status/
├── package.json
└── src/
    ├── constants.ts
    ├── module-definition.ts
    ├── module.ts
    ├── contracts.ts
    ├── controls.ts
    ├── widgets.ts
    ├── routes.ts
    ├── themes.ts
    ├── forms.ts
    ├── server.ts
    ├── client.ts
    ├── authoring-client.ts
    ├── controller/
    │   ├── definition.ts
    │   └── client.tsx
    ├── adapters/
    │   └── calendar-system.tsx
    ├── config/
    │   └── status-card.ts
    ├── plugins/
    │   └── status-card-widget-plugin.tsx
    ├── client/
    │   └── status-card.tsx
    └── authoring/
        ├── status-card.tsx
        ├── widgets.ts
        └── module.tsx
```

The exact source filenames are package-local, but these Server, live Client, Controls, and Authoring
boundaries are required and must be structurally equivalent to `MODULES.md`.

`controller/` is optional. Include it only when the Module coordinates runtime state, signals, or
several mounted artifacts. Adapter-, provider-, preset-, Theme-, and otherwise self-contained Widget
Modules must not add a no-op Controller merely to satisfy package shape.

The Module's `server.ts` export above is a server-safe Site/Next catalog contribution. It is not code
that runs inside `phi-server`. If the Module needs server routes, hooks, jobs, migrations, secrets, or
provider adapters, publish those in a separate package:

```text
Site Module package:  @acme/status
Server Add-on package: @acme/status-server
Logical Add-on id:     @acme/status
```

The Module package never imports the Add-on package, and the Add-on package never imports React or
`@phis/ui`.

Use physically separate package exports so a Server import cannot accidentally retain Client or
Authoring implementations:

```json
{
  "name": "@acme/status",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./server": { "types": "./dist/server.d.ts", "import": "./dist/server.js" },
    "./client": { "types": "./dist/client.d.ts", "import": "./dist/client.js" },
    "./contracts": { "types": "./dist/contracts.d.ts", "import": "./dist/contracts.js" },
    "./controls": { "types": "./dist/controls.d.ts", "import": "./dist/controls.js" },
    "./authoring-client": {
      "types": "./dist/authoring-client.d.ts",
      "import": "./dist/authoring-client.js"
    }
  },
  "dependencies": {
    "@phis/ui": "^0.1.0",
    "server-only": "^0.0.1"
  },
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19"
  }
}
```

React, Next.js, and `@phis/ui` must not be bundled into the published Module. Third-party
Modules use Phi Controls for supported presentation behavior and must not import Ant Design directly
when a matching Phi Control exists. In particular, inline feedback uses `PhiAlertControl`, anchored
confirmation uses `PhiConfirmControl`, and application Message/Notification feedback is emitted with
`usePhiApplicationFeedback`. These contracts deliberately do not expose arbitrary Ant Design props.
If a reusable capability is missing, propose an operator-approved Core contract extension instead of
adding a package-local Ant Design path. A package that has an independently approved, uncovered Ant
Design use may declare it as a peer, but that exception does not widen any Phi Control contract.

## Distribution and commercial Modules (design direction)

A Module may be distributed as a compiled package without publishing its TypeScript or TSX
sources. The archive form below is unchanged by how it travels: phis packages are fetched from a
source rather than resolved from a registry, and the delivered package carries the Module half, the
Add-on half, or both. See [DISTRIBUTION.md](../phi-server/DISTRIBUTION.md) in `phi-server`. The source repository may remain private while CI publishes only the generated ESM,
declaration files, documentation, and license metadata. npm does not require a public source
repository or the original `src/` tree.

A typical published archive contains only:

```text
dist/
├── index.js
├── server.js
├── client.js
├── authoring-client.js
├── chunks/
└── *.d.ts
package.json
README.md
LICENSE
```

Use `package.json#files` and `pnpm pack --dry-run` to make the archive explicit. Do not publish source
maps containing `sourcesContent` when the original source is intended to remain private. The build
must preserve `"use client"` in executable Client entrypoints and retain the physical Server, Live
Client, and Authoring Client export boundaries described above.

The unchanged Skeleton remains the local Site build target. `phis-cli` installs compiled Module packages
in external build state and runs the Site build against the generated immutable manifest; it does not add
imports or composition files to the Skeleton. A Module installation or version change therefore requires
a new Site build, but the deployed runtime may contain only the resulting standalone build or container
image; neither the Skeleton sources nor the Module sources must remain on the production host.

This also permits commercial Modules. `phis-cli` acquires such a package from a configured source:
the source's list states the version, the package digest, and the minimum `phisVersion` the Module
half requires, and the digest stated by the list -- not one derived from the received bytes -- is what
makes the delivery checkable. Entitlement is the source's business and not Core's. Acquisition is
followed by the ordinary steps: the Add-on half through the Add-on workflow, the Module half into
external build state, then the Site build. Compilation and minification are packaging
measures, not reliable copy protection: browser-delivered JavaScript can still be inspected. Secrets
and security-critical or commercially sensitive enforcement must remain in Core or an authorized
Server Add-on, while package access and contractual licensing govern purely client-side Modules.

## 1. Define stable ids

Build every identifier from the Module id rather than spelling it out. The factories validate as they
go, so a name that breaks the grammar fails where it is written and not in whichever consumer parses
it first.

```ts
import {
  createPhiModuleIdentifier,
  createPhiModuleNamespace,
  createPhiRuntimeModuleId,
} from "@phis/ui/constants";
import type { PhiRuntimeModuleId } from "@phis/ui/types";

export const STATUS_PACKAGE_NAME = "@acme/status";
export const STATUS_MODULE_KEY = "status";
export const STATUS_MODULE_ID = createPhiRuntimeModuleId(
  STATUS_PACKAGE_NAME,
  STATUS_MODULE_KEY,
) as PhiRuntimeModuleId;

export const STATUS_CONTROLLER_PLUGIN_KEY = createPhiModuleNamespace(STATUS_MODULE_ID, "controller");
export const STATUS_CONTROLLER_KEY = "default";
export const STATUS_CONTROLLER_TYPE = createPhiModuleIdentifier(
  STATUS_MODULE_ID,
  "controller",
  STATUS_CONTROLLER_KEY,
);

export const STATUS_WIDGETS_PLUGIN_KEY = createPhiModuleNamespace(STATUS_MODULE_ID, "widgets");
export const STATUS_CARD_WIDGET_KEY = "card";
export const STATUS_CARD_WIDGET_TYPE = createPhiModuleIdentifier(
  STATUS_MODULE_ID,
  "widgets",
  STATUS_CARD_WIDGET_KEY,
);
```

`@phis/support` in this workspace is written exactly this way and is the reference to read.

Persisted keys must remain stable across releases. Labels, paths, and implementation filenames may
change; ABI keys must not be silently renamed.

## 2. Define an optional Controller

A Module owns a Controller only when it needs runtime coordination. The definition is server-safe
metadata used for validation, mounting, and Builder Wiring. The example Module needs coordination and
therefore declares one:

```ts
// controller/definition.ts
import type { PhiRuntimeControllerDefinition } from "@phis/ui/types";
import { STATUS_CONTROLLER_KEY, STATUS_CONTROLLER_PLUGIN_KEY } from "../constants";

export type StatusControllerConfig = Record<string, never>;

export const STATUS_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: STATUS_CONTROLLER_PLUGIN_KEY,
  key: STATUS_CONTROLLER_KEY,
  title: "Status Controller",
  description: "Coordinates transient status UI state.",
  allowedMountScopes: ["area", "page"],
  runtimeSignals: { emits: [], listens: [] },
  defaultConfig: {},
  parseConfig: (): StatusControllerConfig => ({}),
} satisfies PhiRuntimeControllerDefinition<StatusControllerConfig>;
```

The executable Controller is a Client boundary:

```tsx
// controller/client.tsx
"use client";

import { createPhiRuntimeControllerClient } from "@phis/ui/runtime/controller-client";
import type { PhiRuntimeControllerPlugin } from "@phis/ui/types";
import {
  STATUS_CONTROLLER_DEFINITION,
  type StatusControllerConfig,
} from "./definition";

const STATUS_CONTROLLER_PLUGIN = {
  ...STATUS_CONTROLLER_DEFINITION,
  renderController: () => null,
} satisfies PhiRuntimeControllerPlugin<StatusControllerConfig>;

export const PhiStatusControllerClient =
  createPhiRuntimeControllerClient(STATUS_CONTROLLER_PLUGIN);
```

Choose the mount policy on the Module definition:

- `area`: mount `default` while the Module is active in an Area;
- `demand`: expose the Controller type and materialize concrete instances only from CMS requirements;
- `site`: reserved for the `core` Module and unavailable to normal Modules.

Controller addresses are always
`controller:<npm-package>/<controller-key>:<instance-key>`. Handler keys, Area names, and Widget types do
not belong in the address. Declare signal capabilities through `runtimeSignals`; communicate only via
the Phi signal bus, not a module-global store or a second event bus.

For a controllerless Module, `controllerType`, `controller`, `controllerMountPolicy`,
`controllerDefinition`, and `loadController` are all absent. These fields form one atomic contract:
either every required Controller field and loader is present, or none is. A controllerless Module
cannot materialize Controller instances, and its Widgets, Layouts, Forms, and providers cannot declare
requirements for a Controller it does not own or for an unavailable external Controller.

Every Module, including a controllerless one, must contribute at least one meaningful artifact such as
a Widget, Layout, Form, data provider, Calendar adapter, Theme, route, shell, or navigation preset.
Empty Modules and artificial no-op Controllers are invalid.

## 3. Define the Module

```ts
// module-definition.ts
import {
  buildPhiRuntimeModuleControllerDescriptor,
  type PhiRuntimeModuleDefinition,
} from "@phis/ui/cms/plugins";
import { createPhiCoreServerBinding } from "@phis/ui/types";
import { STATUS_CONTROLLER_TYPE, STATUS_MODULE_ID } from "./constants";
import { STATUS_CONTROLLER_DEFINITION } from "./controller/definition";

export const STATUS_MODULE_DEFINITION = {
  moduleId: STATUS_MODULE_ID,
  kind: "module",
  eligibleAreas: ["public", "app", "admin", "builder", "editor", "accounting"],
  serverBinding: createPhiCoreServerBinding(),
  controllerType: STATUS_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(
    STATUS_CONTROLLER_DEFINITION,
  ),
  sourceLocale: "en",
  title: "Status",
  description: "Service status presentation.",
  category: "data",
  icon: "antd:dashboard",
  controllerMountPolicy: "area",
} satisfies PhiRuntimeModuleDefinition;
```

`sourceLocale` is the single canonical language for every package-authored user-facing string owned by
the Module. It defaults to `en`. Do not repeat or override it on individual Widgets, Forms, providers,
presets, or navigation contributions. Define Module-owned Label Sets with
`definePhiRuntimeModuleLabelSet(STATUS_MODULE_DEFINITION, ...)` from `@phis/ui/gateway`; this
binds their global translation source language and stable Label-Set namespace to the owner Module.

`title`, `description`, and `category` are required non-empty Module metadata. Every Module must also
declare at least one non-empty visual source: an exact `icon`, a semantic `iconFamily`, or both. The
Server catalog validates these rules at runtime in addition to the TypeScript contract, so JavaScript
packages and cast values cannot bypass them.

Module title, description, and package-authored component labels are global product copy shared across
Sites. The server translates Authoring metadata before it reaches Client option providers. Site CMS
content, external documents, and Provider/user content keep their separate content-locale contracts;
they must not inherit the Module source locale merely because a Module renders them.

`eligibleAreas` is the module-level installation boundary. A third-party Module may list every
canonical Area as above and can then be activated independently per Site and Area. Its Widgets appear
in the Picker only for Areas where that Module is actually active. Do not repeat Area lists or
authoring visibility on individual Widget definitions. `category` only groups and describes active
Widgets in the Picker; it is never an authorization or visibility mechanism.

For an Add-on-backed Module, replace the Core binding with the exact provider id and required
capabilities from its neutral wire contract. The Site Module must not import Add-on implementation
code, database clients, secrets, or server migrations.

For a Controller-bearing Module, the executable Module object adds only the Controller implementation
definition:

```ts
// module.ts
import type { PhiRuntimeModule } from "@phis/ui/cms/plugins";
import { STATUS_CONTROLLER_DEFINITION } from "./controller/definition";
import { STATUS_MODULE_DEFINITION } from "./module-definition";

export const STATUS_RUNTIME_MODULE = {
  ...STATUS_MODULE_DEFINITION,
  controllerDefinition: STATUS_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
```

A controllerless executable Module is the unchanged serializable Module definition; it does not add a
`controllerDefinition` placeholder. Module activation, Area eligibility, ownership, server binding,
and catalog validation continue to use `moduleId` and do not depend on Controller presence.

Do not put Widget, Layout, Form, or provider implementation maps inside this executable object. Their
metadata and lazy loaders belong to the catalog entry.

## 4. Add a Widget

A Widget has three separate artifacts:

```text
server-safe definition
├── lazy Runtime/Preview server plugin
└── lazy Authoring Client adapter
```

### Definition and config parser

```ts
// config/status-card.ts
import type { PhiCmsWidgetPlugin } from "@phis/ui/types";
import { STATUS_CARD_WIDGET_KEY, STATUS_WIDGETS_PLUGIN_KEY } from "../constants";

export type StatusCardConfig = { title: string };

export function parseStatusCardConfig(value: unknown): StatusCardConfig {
  const title = value && typeof value === "object"
    ? (value as { title?: unknown }).title
    : null;
  return { title: typeof title === "string" && title.trim() ? title.trim() : "Status" };
}

export const STATUS_CARD_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: STATUS_WIDGETS_PLUGIN_KEY,
  typeKey: STATUS_CARD_WIDGET_KEY,
  title: "Status Card",
  description: "Displays the current service state.",
  category: "operations",
  slotSizePolicy: "intrinsic",
  fields: [{ key: "title", type: "string", label: "Title", required: true }],
  parseConfig: parseStatusCardConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<StatusCardConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "slotSizePolicy"
  | "fields"
  | "parseConfig"
>;
```

`fields` is the complete Inspector-editable config surface. Do not add Widget-specific Inspector
branches. Use generic Phi field types, option/data providers, and declarative signal capabilities.
Widget and Layout `category` values come from the closed semantic CMS plugin category set documented
in [BUILDER.md](./BUILDER.md); package identity remains a separate Picker filter.

### Runtime and Preview plugin

```tsx
// plugins/status-card-widget-plugin.tsx
import type { PhiCmsServerWidgetPlugin } from "@phis/ui/types";
import {
  STATUS_CARD_WIDGET_DEFINITION,
  type StatusCardConfig,
} from "../config/status-card";

export const STATUS_CARD_WIDGET_PLUGIN = {
  ...STATUS_CARD_WIDGET_DEFINITION,
  render: ({ config }) => <section><h2>{config.title}</h2><p>Operational</p></section>,
  renderPreview: ({ config }) => <section><h2>{config.title}</h2><p>Preview</p></section>,
} satisfies PhiCmsServerWidgetPlugin<StatusCardConfig>;
```

Runtime/Preview code may load server data and translated labels. Browser interaction belongs in a
small Client component. If that component is selected through
`PhiRuntimeModuleRenderClientHost`, export its lazy loader from the Module's Render Client manifest;
never add it to a global Client map.

### Server Widget loader descriptor

```ts
// widgets.ts
import type { PhiRuntimeModuleWidgetDefinition } from "@phis/ui/cms/plugins";
import { STATUS_CARD_WIDGET_DEFINITION } from "./config/status-card";
import { STATUS_MODULE_ID } from "./constants";

export const STATUS_WIDGETS = [{
  definition: STATUS_CARD_WIDGET_DEFINITION,
  ownerModuleId: STATUS_MODULE_ID,
  renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
  loadRuntime: () => import("./plugins/status-card-widget-plugin")
    .then((module) => module.STATUS_CARD_WIDGET_PLUGIN),
  loadPreview: () => import("./plugins/status-card-widget-plugin")
    .then((module) => module.STATUS_CARD_WIDGET_PLUGIN),
}] as const satisfies readonly PhiRuntimeModuleWidgetDefinition[];
```

The descriptor must not statically import the plugin implementation.

### Authoring adapter

```tsx
// authoring/status-card.tsx
"use client";

import type { PhiCmsBuilderWidgetPlugin } from "@phis/ui/types";
import {
  STATUS_CARD_WIDGET_DEFINITION,
  type StatusCardConfig,
} from "../config/status-card";

export const STATUS_CARD_BUILDER_PLUGIN = {
  ...STATUS_CARD_WIDGET_DEFINITION,
  renderEditor: ({ config }) => <section><h2>{config.title}</h2><p>Preview</p></section>,
} satisfies PhiCmsBuilderWidgetPlugin<StatusCardConfig>;
```

Register the adapter only in the owner Module's Authoring Client:

```tsx
// authoring/widgets.ts
"use client";

import {
  createPhiAuthoringWidgetModule,
  definePhiAuthoringWidgetModuleLoader,
} from "@phis/ui/runtime/authoring-client";
import { STATUS_CARD_WIDGET_DEFINITION } from "../config/status-card";

export const STATUS_AUTHORING_WIDGET_MODULE = createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    STATUS_CARD_WIDGET_DEFINITION,
    () => import("./status-card").then((module) => module.STATUS_CARD_BUILDER_PLUGIN),
  ),
]);
```

```tsx
// authoring/module.tsx
"use client";

import { createPhiRuntimeModuleAuthoringClient } from "@phis/ui/runtime/authoring-client";
import { STATUS_MODULE_ID } from "../constants";
import { STATUS_AUTHORING_WIDGET_MODULE } from "./widgets";

export const PhiStatusAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: STATUS_MODULE_ID,
  WidgetModule: STATUS_AUTHORING_WIDGET_MODULE,
});
```

The shared Canvas scaffold owns selection, hover chrome, drag/drop, slots, debug outlines, and common
tools. A Widget adds only its body and optional `renderEditorTools()` extension.

## 5. Add a Theme preset

A Theme preset is module-owned data, not a global registration and not arbitrary `ConfigProvider`
state. Ant Design seeds/overrides and Phi-only custom colors are the supported preset surface.

```ts
// theme-preset.ts
import type { PhiThemePresetPlugin } from "@phis/ui/theme";

export const STATUS_THEME_PRESET = {
  key: "status-night",
  version: 1,
  title: "Status Night",
  description: "Dark operations palette.",
  antd: {
    seed: {
      colorPrimary: "#4f8cff",
      colorSuccess: "#45a675",
      colorWarning: "#d99a2b",
      colorError: "#d85c4a",
    },
    modes: {
      light: { seed: { colorTextBase: "#14213d", colorBgBase: "#ffffff" } },
      dark: { seed: { colorTextBase: "#e7edf8", colorBgBase: "#07101f" } },
    },
  },
} satisfies PhiThemePresetPlugin;
```

```ts
// themes.ts
import type { PhiCmsThemePresetDescriptor } from "@phis/ui/cms/plugins";
import { STATUS_MODULE_ID } from "./constants";

export const STATUS_THEMES = [{
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: "status-night-theme-preset",
  presetVersion: 1,
  themeKey: "status-night",
  title: "Status Night",
  description: "Dark operations palette.",
  loadPreset: () => import("./theme-preset")
    .then((module) => module.STATUS_THEME_PRESET),
}] as const satisfies readonly PhiCmsThemePresetDescriptor[];
```

`themeKey` and the loaded preset's `key` must match, as must their titles. Increment the descriptor and
preset versions when the published preset contract changes. A Site's Draft/Published theme override is
separate from the immutable package preset.

Client components consume Ant Design semantics through `usePhiConfig().token` and module-specific
custom colors through the approved Phi config contract. Do not create parallel `--phi-*` variables for
Ant Design tokens or install another root Theme provider. A Module using another UI library may expose
one lazy module UI provider scoped to its own subtree.

## 6. Add a Preset Form

Use the dedicated [Preset Form guide](./components/forms/PRESET_FORMS_HOWTO.md). In summary:

- create `<npm-package>/forms/<form-key>` with `createPhiFormId(...)`;
- define it with `definePhiRuntimeModuleForm(...)`;
- declare every referenced field, validation, and phase-specific handler provider;
- contribute it through the same `catalogEntry.forms` array;
- keep every phase-specific handler Provider in the same owner Module as the Form; normal catalog
  construction rejects a missing or mismatched `submit`, `confirm`, or `preview` handler before runtime;
- render fields through Phi Controls, not CMS Widgets;
- place it in CMS trees through the generic `@phis/ui/widgets/form` Widget with its `formId`;
- do not register a Contact/Login/etc. CMS Widget alias for the Form;
- use the demand-materialized Core Form Controller unless the Module has a genuinely different
  lifecycle.

Preset Forms are package-published defaults. Runtime reads only Published Site overrides. The v1
database already reserves Working Draft, Published, and archived Published revisions so a future visual
Form Builder requires APIs, not a new schema.

## 7. Build the Server catalog

```ts
// server.ts
import "server-only";

import {
  createPhiRuntimeModuleCatalog,
  extendPhiRuntimeModuleCatalog,
  type PhiRuntimeModuleCatalog,
} from "@phis/ui/cms/plugins";
import { STATUS_MODULE_DEFINITION } from "./module-definition";
import { STATUS_WIDGETS } from "./widgets";
import { STATUS_THEMES } from "./themes";

export const STATUS_MODULE_CATALOG = createPhiRuntimeModuleCatalog([{
  definition: STATUS_MODULE_DEFINITION,
  widgets: STATUS_WIDGETS,
  layouts: [],
  themes: STATUS_THEMES,
  forms: [],
  routes: [],
  load: () => import("./module")
    .then((module) => module.STATUS_RUNTIME_MODULE),
}], []);

export function extendStatusRuntimeModuleCatalog(
  base: PhiRuntimeModuleCatalog,
): PhiRuntimeModuleCatalog {
  return extendPhiRuntimeModuleCatalog(base, STATUS_MODULE_CATALOG);
}
```

The catalog above is what the package hands over; the name it hands it over under is fixed in section 8a,
and the Areas it reaches follow from `eligibleAreas` rather than from anything written here.

`createPhiNextCmsSiteBridge(...)` validates the complete combined catalog through the public
`assertPhiRuntimeModuleCatalog(...)` contract. Invalid ownership, missing loaders, unsupported render
policies, malformed signal metadata, or inconsistent declarative artifacts therefore fail at Site
assembly rather than becoming a request-time fallback.

Area-shell and route contributions use the same catalog entry. Routes own immutable effective normalized
paths, stable Area-local `pageKey` values, optional navigation injections, and lazy tree loaders. Modules
do not create physical Next.js routes in the Site Skeleton.

An Area can export a route mount such as `settings`. A Module opts in explicitly with
`mount: { mountKey: "settings" }` and declares a normalized mount-relative path such as `/` or
`/providers/:id`. The compiler inserts one collision-resistant segment derived from the full Module id:
`@acme/status/auth` becomes `acme+status+auth`, producing for example
`/settings/acme+status+auth/providers/:id`. `+` is reserved inside Module identity parts. The Module's
navigation descriptor injects its item under the mount's exported container separately; moving that item
in Builder changes presentation only, never the route path. A mount must be declared by the target Area and
is never inferred from an existing path collision.

Design direction: the derived segment is a collision-resistant fallback, not the intended public shape. The
approved target is a Site-owned base path — the descriptor proposes one, the operator confirms or overrides
it when the Module is activated, and the persisted value feeds route compilation. A Module must therefore
not treat its effective path as derivable from its own id, and must reference its own pages through
`presetKey` rather than through a literal path. See the `phi-server` backlog item "Make Module route paths
Site-owned and add the public SEO surface".

## 8. Export Client and Authoring manifests

For a Controller-bearing Module, the live Controller projection contains exactly one static Controller
loader:

```tsx
// client.ts
"use client";

import {
  definePhiRuntimeModuleControllerClientAreaContribution,
  extendPhiRuntimeModuleControllerClientManifest,
  type PhiRuntimeModuleControllerClientManifest,
} from "@phis/ui/runtime/controller-client";
import { STATUS_MODULE_ID } from "./constants";

const contribution = definePhiRuntimeModuleControllerClientAreaContribution({
  moduleId: STATUS_MODULE_ID,
  loadController: () => import("./controller/client")
    .then((module) => module.PhiStatusControllerClient),
});

export function extendStatusControllerClientManifest(
  base: PhiRuntimeModuleControllerClientManifest,
) {
  return extendPhiRuntimeModuleControllerClientManifest(base, [contribution]);
}
```

A controllerless Module contributes no Controller Client loader and does not need a Controller Client
manifest extension. Its Render, data-provider, Calendar-adapter, and Authoring contributions remain
independent immutable manifests and are included only when the Module actually owns those artifacts.
Server and Client contribution parity is validated by `moduleId`; Controller presence is not the
identity of a Module.

If Widget Server renderers use `PhiRuntimeModuleRenderClientHost`, export matching loaders through
`definePhiRuntimeModuleRenderClientLoader(...)` and `extendPhiRuntimeModuleRenderClientManifest(...)`
from `@phis/ui/runtime/render-client`. Pure Server-rendered Widgets need no Render Client entry.

Calendar-system implementations use the same split. The Server definition declares only serializable
`calendarAdapters` descriptors. The separate Client entrypoint extends the immutable Area manifest
with `extendPhiRuntimeModuleCalendarAdapterClientManifest(...)`; each lazy loader returns a
`PhiCalendarAdapterClient`. The descriptor key uses `<npm-package>/calendars/<adapter-key>`, and its
Server and Client owners must match. The generic Inspector selector receives only adapters from the
active target-Area module set, and live Controls reject loaders whose owner Module is not active.

A package that contributes only a Calendar adapter is a valid controllerless Module. It still needs
its own stable `moduleId`, Area eligibility, Core/Add-on binding, Server catalog contribution, and
Client adapter manifest extension. It does not declare or export Controller artifacts. A domain
Module imports generic date/time Controls from `@phis/ui/controls/date-time`; Core always owns
the Gregorian adapter and the CMS-visible `Date Picker` Widget. The optional `@phis/calendar` Module
adds event-calendar presentation and additional calendar systems. Depending on that package does not
activate the Calendar Module or any adapter Module; `phis-cli` must install the required packages into
external build state, and the Site must explicitly enable the required Modules for the Area.

Public Calendar values remain serializable adapter-neutral records from `@phis/ui/types`.
Do not persist or signal JavaScript `Date`, Dayjs, Luxon, Temporal polyfill, or adapter-private
objects. Date-only values carry an ISO date plus a calendar id; instants use ISO strings; local date
times additionally carry an IANA time zone; ranges and periods use explicit start/end fields.
Scalar signal `valueType` values `date` and `time` carry `YYYY-MM-DD` and
`HH:mm[:ss[.fraction]]` strings respectively. Calendar-aware selections, ranges, date-times, periods,
viewports, and events use `valueType: "json"` with a package-namespaced `valueSchema`.

Authoring is a separate manifest and must never be imported by a normal live Area:

```tsx
// authoring-client.ts
"use client";

import {
  definePhiRuntimeModuleAuthoringClientContribution,
  extendPhiRuntimeModuleAuthoringClientManifest,
  type PhiRuntimeModuleAuthoringClientManifest,
} from "@phis/ui/runtime/authoring-manifest-client";
import { STATUS_MODULE_ID } from "./constants";

const contribution = definePhiRuntimeModuleAuthoringClientContribution({
  moduleId: STATUS_MODULE_ID,
  loadAuthoring: () => import("./authoring/module")
    .then((module) => module.PhiStatusAuthoringClient),
});

export function extendStatusAuthoringClientManifest(
  base: PhiRuntimeModuleAuthoringClientManifest,
) {
  return extendPhiRuntimeModuleAuthoringClientManifest(base, [contribution]);
}
```

The Client and Authoring projections are exported under the fixed names in section 8a. The example names
above describe the shape a package builds internally, not what the generator looks for.

Data providers follow the same split: serializable provider descriptors stay in the Server Module
definition; executable `loadLive` and optional side-effect-free `loadAuthoring` edges stay in immutable
Area-local Data Provider Client manifests. `options`, `table`, and `collection` are the shared provider
kinds. Do not create Widget-specific fetch or option registries.

## 8a. What a Module package exports

A generator cannot guess an export it was never told about. `package.json#exports` says where an
entrypoint is and nothing about what is inside it, so the names are fixed -- one per boundary, the way a
Server Add-on artifact has exactly one export called `phiServerAddon`:

```text
.                   phiModuleDefinitions           @phis/ui/module
./server            phiModuleServerContributions   @phis/ui/module
./client            phiModuleClientContributions   @phis/ui/module/client
./authoring-client  phiModuleAuthoringContributions @phis/ui/module/authoring-client
```

Each is a list keyed by Module id, because one package may carry several Modules. The boundaries are the
ones this document already requires; only the names are new.

**A Module never names an Area.** Where its contributions land follows from `eligibleAreas` on its own
definition, which is also what decides whether a Site may select it for an Area. One statement, read in
both places, rather than two lists that can disagree. This is why the definitions sit at the package root:
they are shared serializable contract, and the Client projection reads the Areas from there instead of
importing the Server boundary.

**Every Module brings an Authoring contribution, including one that owns nothing to author.** The Builder
wraps each active Module's Authoring Client around the canvas, so a missing loader is a hard failure at
render time rather than an absence. A Module with nothing to author registers an empty Widget module:

```ts
// authoring-client.ts
const WidgetModule = createPhiAuthoringWidgetModule([]);
export const phiModuleAuthoringContributions = definePhiModuleAuthoringContributions([{
  moduleId: STATUS_MODULE_ID,
  loadAuthoring: () => Promise.resolve(createPhiRuntimeModuleAuthoringClient({
    moduleId: STATUS_MODULE_ID,
    WidgetModule,
  })),
}]);
```

`collectPhiSiteModuleClientContributions` refuses a definition without one, so the mistake surfaces where
the package is composed and not in the Builder.

**`@phis/ui` is a peer dependency, never a normal one.** A Module consumes its functions and components
directly, and that is exactly why it must receive the Site's instance: a second copy means a second set of
React contexts, so the manifest providers the Site renders are invisible to the Module's own components.
`react` and `react-dom` follow the same rule. The peer range doubles as the compatibility statement a
source's package list carries.

**A Widget names itself from its own package.** `resolvePhiCmsWidgetPluginKey` maps a bare type key to a
first-party module and refuses an unknown one, which is what stops an outside package claiming a
first-party Widget. A Module package composes its own plugin key -- `@acme/status/modules/status/widgets`
-- and builds the namespaced type with `buildPhiCmsWidgetNamespacedTypeKey`. That namespaced type is what
crosses the boundary: the Server manifest carries it, and the Render Client manifest the Area host
composed resolves it. Config parsing uses the primitives from `@phis/ui/widget-config`, so a package does
not reproduce the renderable base parser. The authoring editor is built from Controls in
`@phis/ui/controls`; a Module contributes Widgets and does not bring its own control vocabulary.

**A Module may contribute a navigation entry to any declared surface.** An entry that names no anchor
lands at the end of its surface, ordered by `ownerModuleId`, `presetKey`, and `itemKey` -- deterministic,
and not dependent on which Module happened to be composed first. Nothing has to be opened for this.

What does need opening is a **reference**. `before`, `after`, and `parentItemKey` name someone else's item,
and a named item becomes public API its owner has to keep. Those three must therefore point at an item the
surface exports through `exportedItemKeys`, or at one the Module itself injects. Contributing to a surface
and depending on a particular item in it are separate permissions.

## 9. Install without patching the Skeleton

The canonical Skeleton is the reusable, versioned basis for Sites. A Module installation must not add or
rewrite Area composition files, route handlers, `src/runtime-modules/*`, `src/app/*`, or any other
Skeleton source. The Module package is the only owner of its optional Site code.

`phis-cli` owns build-time installation. It installs package versions and generates an immutable,
statically analyzable projection into build state: a list of imports and one call, which places each
Module's contributions into the Areas its definition names.

The projection is **passed into** the generic Area hosts rather than imported by them. A Site build cannot
redirect an import that happens inside `@phis/ui` -- a bundler alias matches the request string, and a
package's own internal request is not one a Site can name. This was measured rather than assumed: an alias
on the seam module leaves the empty value in the bundle. So the Skeleton hands the projection to the host
factories once, in the twelve files under `src/runtime-modules`, and those files are never touched again
when a Module is installed or removed. All composition stays in `@phis/ui`: placement by `eligibleAreas`,
collision checks against first-party ids, and the Builder's union across Areas.

```sh
phis module add  --site <key> --package @acme/status [--spec <version or workspace:*>]
phis module del  --site <key> --package @acme/status
phis module list [--site <key>]
phis module sync --site <key>
```

`add` and `del` record the installation in `config/phis-modules.json` and rewrite the projection in the
same step: for a Module the generated file *is* the application, so there is no separate reconcile the way
an Add-on artifact needs one. `sync` regenerates from the recorded state, for when the two have drifted.

Nothing is fetched. With `--spec` the package is written into the Site's dependencies and the package
manager resolves it; without one it has to be resolvable already. Acquisition is a separate step, and
folding it in would make an install look as though it had verified something it never saw.

The projection is preserved by `phis reconcile`, like `config/site-runtime.json`. Regenerating a Site's
Skeleton must not silently uninstall its Modules.

The build manifest is deployment state, not a hand-maintained extension surface. It must be regenerated
atomically and must not be assembled from request, database, or environment package names. Module removal
removes its manifest projection and package from the next build; it does not edit the Skeleton back.

Each entry also records what the build cannot otherwise be asked afterwards: the package name and
version it came from, the minimum `phisVersion` it declares, and its origin. A Module reaches a build
three ways, and the manifest keeps them apart: **local**, built here and stamped only by its own
`package.json` version; **resolved**, an ordinary dependency the package manager fetched from a registry,
stamped by the lockfile integrity; **source**, fetched by `phis-cli` and stamped by the package digest
the source's list stated. A private registry therefore remains a perfectly good way for a company to
distribute its own Modules -- it is the resolved door, and Core neither performs nor duplicates that
acquisition. The minimum `phisVersion` is checked against `config/phis-instance.json` before the build,
so an incompatible Module is refused rather than shipped as a broken Site.

The Builder projection receives the complete installed target-Area Authoring union. This makes the Module
available inside an isolated target-Area Canvas without activating or mounting it in the outer Builder Area.
The Site's persisted Area `runtimeModules` activates only eligible ids already present in the build manifest.
Installation must not silently enable a Module, and a Module must not enable itself.

Site verification must also cover the package-owned Area shell baseline before the first Area revision is
persisted. The effective selection is the exact persisted Area override when one exists and otherwise the
code-owned shell preset. Page rendering, provider/controller resolution, Form discovery, and Form handler
dispatch must all consume that same effective Area selection. A missing database override is not an empty
module list.

If the Module requires code in `phi-server`, that Add-on travels in the same package: one repository
delivers one package, which may carry a Module half, an Add-on half, or both under a single version and
a single digest. `phis-cli` installs the Add-on half through the Add-on workflow first, because it is
hot-pluggable while the Module half waits for a build; removal runs in reverse. Module activation never
installs or enables that Add-on.

## 10. Access, server capabilities, and errors

- Apply `PhiViewerAccessPolicy` to Module, route, navigation, Widget, or Layout descriptors when needed.
- Third-party contributions may use Core roles or roles from their one bound Add-on provider.
- Site Admin retains the documented Core override; other Core and provider roles remain explicit.
- Unavailable server capabilities deactivate only the dependent Module and produce a scoped diagnostic.
- Missing Widget/Layout renderers remain localized to the affected CMS node.
- Do not catch contract failures and substitute a global registry or first-party implementation.

## Boundary checklist

- Server catalog files contain metadata and lazy imports, not Client components.
- Definition/config files are safe for both Server and Client imports.
- `"use client"` appears only at executable Client, Controller, provider, and Authoring boundaries.
- Live Area manifests do not import Authoring modules.
- Public manifests cannot reach Builder/Admin/Editor implementations.
- The Builder Authoring manifest contains only the installed target-Area union.
- Module UI providers wrap only module-owned output and scope CSS and portals locally.
- No registry is populated by import side effects or mutable module globals.
- No database value is passed to an unrestricted dynamic import.
- Every persisted identity and provider key is package-namespaced and stable.
- Controller fields and `loadController` are either complete as one group or absent as one group.
- Every controllerless Module contributes at least one meaningful owned artifact and no no-op Controller.
- Widgets use Phi Controls, providers, signaling, and the shared Canvas scaffold contracts.
- Server handlers revalidate Form input and enforce authorization independently of Client validation.
- Every handler-mode Form has an owned phase-matching handler Provider, and the owner Module is selected in
  every intended effective Area preset.

## Verification

Run the Module package's own checks first:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Then verify the consuming Site and the `@phis/ui` runtime boundary:

```bash
pnpm verify runtime
pnpm verify package
```

Finally test at least:

- the code-owned Area baseline on a Site with no persisted Area revision;
- a persisted Area override, including the expected inactive-Module rejection when its `runtimeModules`
  omits the Module;
- one live Area with the Module inactive;
- the same Area with the Module active;
- Runtime and Preview rendering for every contributed Widget;
- Builder Picker, Inspector, Canvas, and Authoring output;
- Controller mounting and declared signal routes;
- missing/incompatible server capability diagnostics;
- package graph isolation so Public does not download unrelated Builder or optional-module code.

Use the actual production browser resource list for payload evidence. Development Turbopack/HMR chunks
are not a production bundle measurement.
