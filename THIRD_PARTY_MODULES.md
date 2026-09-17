# Third-party Site Module guide

This guide is the practical entry point for building a Site Module package against `@phis/ui`: package
structure, identifiers, Controllers, Widgets, Theme presets, Preset Forms, the fixed package exports,
building, installing, and verification.

The contracts it applies are:

- [MODULES.md](./MODULES.md) -- Module ownership, activation, loading, presets and addresses;
- [SIGNALS.md](./SIGNALS.md) -- signal capabilities, routes, and addresses;
- [FORMS.md](./FORMS.md) and [components/forms/PRESET_FORMS_HOWTO.md](./components/forms/PRESET_FORMS_HOWTO.md)
  -- Forms;
- [TABLES.md](./TABLES.md), [TREES.md](./TREES.md), [COLLECTIONS.md](./COLLECTIONS.md) -- Provider-backed
  data Widgets;
- [THEME.md](./THEME.md) -- Theme presets and blocks;
- [NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md) -- the consuming Next.js Site;
- [STATIC_RENDERING.md](./STATIC_RENDERING.md) -- how Public pages are rendered once for every
  anonymous visitor;
- [ACCESS.md](./ACCESS.md) and [AUTHENTICATION.md](./AUTHENTICATION.md) -- viewer access, Add-on roles,
  and Auth replacement.

`@phis/example` in the Phi workspace (`phis-example`) is the reference package. It follows every rule
here: one Module with routes, a navigation injection, Theme presets and blocks, a `./fonts` boundary, and
all fixed exports. It owns no Widget and no Controller; the Widget and Controller examples below show
those parts.

## Before you start: Public pages are rendered once for everybody

Read [STATIC_RENDERING.md](./STATIC_RENDERING.md) before building anything that renders on a Public page.
In production a Public page is rendered once for every anonymous visitor and served from memory; your
Widget's server half is part of that render. In short:

1. **Nothing your Widget renders on the server may depend on the visitor.** There `cookies()` and
   `headers()` are empty without an error, the viewer is always anonymous and there is no query. Tokens,
   greetings, carts, random values and anything else per visitor are loaded in the browser.
2. **Your Module's own data can be up to 60 seconds old on a Public page.** Only published Pages, Areas,
   Navigation, Themes, Site settings and translations reach it within seconds. News entries, events,
   prices, stock and whatever your Add-on stores wait for the next render at most a minute later. What
   must be current to the second is loaded in the browser.
3. **`next dev` never renders statically**, so development hides both mistakes. Check every Public
   Widget once in a production build, signed out.

Signed-in visitors, requests with a query, the Builder and every staff Area render dynamically as before.

## Terminology and hard boundaries

- A **Module** is a Site/client extension compiled into a Site application.
- An **Add-on** is a server extension installed into `phis` (`@phis/server`) with `phis addon`.
- One package carries one product. `@scope/name` is the Module half; the Add-on half of the same
  package lives under `@scope/name/addon/…`, and the logical Add-on id is `@scope/name`.
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

A Module package has four fixed entrypoints and an optional fifth. Source filenames are the package's
own; a layout like `@phis/example`'s works well:

```text
@acme/status/
├── package.json
└── src/
    ├── index.ts              .                  phiModuleDefinitions
    ├── server.ts             ./server           phiModuleServerContributions
    ├── client.ts             ./client           phiModuleClientContributions ("use client")
    ├── authoring-client.ts   ./authoring-client phiModuleAuthoringContributions ("use client")
    ├── fonts.ts              ./fonts            phiModuleFontContributions (optional)
    ├── ids.ts
    ├── definition.ts
    ├── module.ts
    ├── presets.ts
    ├── themes.ts
    ├── controller/
    │   ├── definition.ts
    │   └── client.tsx
    └── widgets/
        └── card/
            ├── config.ts
            ├── plugin.tsx
            └── authoring.tsx
```

`controller/` is optional. Include it only when the Module coordinates runtime state, signals, or several
mounted artifacts; a Module never adds a no-op Controller to satisfy package shape.

`./server` is the Module's server-safe Site catalog contribution -- code that runs in the *Site* process.
It is not code that runs inside `phis`. Server routes, hooks, jobs, migrations, secrets, and provider
adapters live in the Add-on half of the same package, under its own entrypoints:

```text
Package:            @acme/status
Module entrypoints: @acme/status, /server, /client, /authoring-client, /fonts
Add-on entrypoints: @acme/status/addon/manifest, @acme/status/addon/runtime
Logical Add-on id:  @acme/status
```

The Module half never imports the Add-on half, and the Add-on half never imports React or `@phis/ui`.

```json
{
  "name": "@acme/status",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "phis": {
    "sourceLocale": "en",
    "modules": [{ "moduleId": "@acme/status/modules/status", "category": "operations" }]
  },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./server": { "types": "./dist/server.d.ts", "import": "./dist/server.js" },
    "./client": { "types": "./dist/client.d.ts", "import": "./dist/client.js" },
    "./authoring-client": {
      "types": "./dist/authoring-client.d.ts",
      "import": "./dist/authoring-client.js"
    },
    "./fonts": { "types": "./dist/fonts.d.ts", "import": "./dist/fonts.js" }
  },
  "dependencies": {
    "server-only": "^0.0.1"
  },
  "peerDependencies": {
    "@phis/ui": "^0.1.0",
    "next": "^16.2.11",
    "react": "^19.2.8"
  }
}
```

- `@phis/ui`, `react`, and `next` are peer dependencies. A second copy of `@phis/ui` is a second set of
  React contexts, and `next` is needed for the `next/dynamic` calls in the Client boundaries and for
  `next/font` in `./fonts`.
- The `phis` block declares every Module the package carries with its category
  (`PHI_RUNTIME_MODULE_CATEGORIES` in `@phis/contracts/catalog`: `foundation`, `workspace`, `content`,
  `media`, `commerce`, `identity`, `communication`, `events`, `analytics`, `integration`, `operations`,
  `other`) and the language of the Modules' titles. A catalogue reads it without running the package;
  `phis module check` reports a missing or malformed declaration.
- CSS shipped by the package needs `"sideEffects": ["**/*.css"]` instead of `false`.

Modules use Phi Controls for supported presentation and do not import Ant Design directly where a Phi
Control exists: inline feedback is `PhiAlertControl`, anchored confirmation `PhiConfirmControl`, and
application messages and notifications are sent with `usePhiApplicationFeedback`
(`@phis/ui/runtime/signal-client`). A missing reusable capability is a Core contract extension, not a
package-local Ant Design path.

## Distribution and commercial Modules

Distributing compiled and commercial Modules is designed, not built; see
[design/MODULE_DISTRIBUTION.md](./design/MODULE_DISTRIBUTION.md).

## Addresses are granted, not owned

Your Module does not own its Public address. It applies for one, and the Site settles the application
when the Module is enabled. The normative rule is in [MODULES.md](./MODULES.md#who-owns-an-address);
what follows is what it means while you build.

Outside Public there is nothing to settle. Every route lives under your package path --
`/acme/shop/...`, derived from the Module id -- so two packages can never contest an address, and how
your package arranges its routes underneath is your own business.

In Public there is no such namespace. The path your route descriptor declares is an application, and
where it is already held the operator is asked for another one at activation; the dialog refuses to
enable the Module without an answer. The holder keeps what it has, whether that is another Module or a
Page the Site authored. So:

- **The declared path is a wish, not a promise.** In Public your Module may run under a different
  address than it declared, permanently.
- **Your own path must not appear anywhere in your Module.** No link, no forward, no condition on
  `/login`. The way to your own Page is the `(ownerModuleId, presetKey)` reference, resolved through the
  current route table -- the same reference navigation persists.
- **A taken address is not a fault.** On a Site that has grown it is the ordinary case.
- **Yielding an address costs nothing else.** A renamed route, like a landing offer the Site did not
  choose, leaves every other route your Module has standing.
- **A Public base Page is yours to replace.** Declare `/contact`, `/terms-and-conditions`, or
  `/error/404` and your Page is served there, as long as no other package Module declares the same path;
  the base Page steps aside and comes back when your Module is switched off. Links and navigation that
  point at the base Page reach yours through the path, so you do not need a navigation item of your own.
  You may still bring one: the Site then hides whichever of the two it does not want. This holds for the
  Public base Module only -- Pages of the Auth Module or any other Module are ordinary holders.
- **A landing is an offer.** A Page that declares `/` offers the Site a front door. As the only package
  Module offering one it replaces the base landing on activation, like a replaced `/contact`; next to
  other offers it waits until the Site chooses. It is never offered another address, and the Site can
  switch between the offers at any time.

One case runs the other way, and it is worth knowing because your Module cannot resolve it. A Page the
Site authored before your package was installed can sit on your package path outside Public. There your
Module has nothing to yield with -- that path is its identity -- so activation is refused, naming the
occupied path, until the Site moves the Page. It needs an operator, and there is nothing to build
against it: no Module code can avoid or detect it.

Enabling a Module for Public checks its declared paths against Site Pages and other Modules and asks for
another address where one is taken (`plugins/runtime-modules/builder/public-route-collisions.ts`).
Nothing checks a Site Page against a Module's package path outside Public.

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

`@phis/example` (`src/ids.ts`) is written this way.

Persisted keys must remain stable across releases. Labels, paths, and implementation filenames may
change; ABI keys must not be silently renamed.

## 2. Define an optional Controller

A Module owns a Controller only when it needs runtime coordination. The definition is server-safe
metadata used for validation, mounting, and Builder Wiring. The example Module needs coordination and
therefore declares one:

```ts
// controller/definition.ts
import type { PhiRuntimeControllerDefinition } from "@phis/ui/types";
import { STATUS_CONTROLLER_KEY, STATUS_CONTROLLER_PLUGIN_KEY } from "../ids";

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

The Controller's address is `controller:<pluginKey>/<controllerKey>:<instanceKey>`; for the example
above that is `controller:@acme/status/modules/status/controller/default:default`. Handler keys, Area
names, and Widget types do not belong in the address ([SIGNALS.md](./SIGNALS.md#addresses)). Declare signal capabilities through `runtimeSignals`; communicate only via
the Phi signal bus, not a module-global store or a second event bus.

For a controllerless Module, `controllerType`, `controller`, `controllerMountPolicy`,
`controllerDefinition`, and the `Controller` Client are all absent. These fields form one atomic contract:
either every required Controller field and the Client are present, or none is. A controllerless Module
cannot materialize Controller instances, and its Widgets, Layouts, Forms, and providers cannot declare
requirements for a Controller it does not own or for an unavailable external Controller.

Every Module, including a controllerless one, must contribute at least one meaningful artifact such as
a Widget, Layout, Form, data provider, Calendar adapter, Theme, route, shell, or navigation preset.
Empty Modules and artificial no-op Controllers are invalid.

## 3. Define the Module

```ts
// definition.ts
import {
  buildPhiRuntimeModuleControllerDescriptor,
  type PhiRuntimeModuleDefinition,
} from "@phis/ui/cms/plugins";
import { createPhiCoreServerBinding } from "@phis/ui/types";
import { STATUS_CONTROLLER_TYPE, STATUS_MODULE_ID } from "./ids";
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
  category: "operations",
  icon: "antd:dashboard",
  controllerMountPolicy: "area",
} satisfies PhiRuntimeModuleDefinition;
```

`sourceLocale` is the single canonical language for every package-authored user-facing string owned by
the Module. It defaults to `en`. Do not repeat or override it on individual Widgets, Forms, providers,
presets, or navigation contributions. Define Module-owned Label Sets with
`definePhiRuntimeModuleLabelSet(STATUS_MODULE_DEFINITION, ...)` from `@phis/ui/server-helpers`; this
binds their global translation source language and stable Label-Set namespace to the owner Module.

`title`, `description`, and `category` are required non-empty Module metadata; `category` is one of the
Module categories listed above and is the same value the package's `phis` block declares. Every Module must also
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
import { STATUS_MODULE_DEFINITION } from "./definition";

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
// widgets/card/config.ts
import type { PhiCmsWidgetPlugin } from "@phis/ui/types";
import { STATUS_CARD_WIDGET_KEY, STATUS_WIDGETS_PLUGIN_KEY } from "../../ids";

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
  category: "data",
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
Widget and Layout `category` values come from `PHI_CMS_PLUGIN_CATEGORIES` (`content`, `navigation`,
`form`, `data`, `media`, `commerce`, `account`, `configuration`, `structure`, `workspace`, `developer`,
`other`) -- a different list from the Module categories. Package identity is a separate Picker filter.
Config parsing uses the primitives from `@phis/ui/widget-config`, so a package does not reproduce the
renderable base parser.

### Runtime and Preview plugin

```tsx
// widgets/card/plugin.tsx
import type { PhiCmsServerWidgetPlugin } from "@phis/ui/types";
import {
  STATUS_CARD_WIDGET_DEFINITION,
  type StatusCardConfig,
} from "./config";

export const STATUS_CARD_WIDGET_PLUGIN = {
  ...STATUS_CARD_WIDGET_DEFINITION,
  render: ({ config }) => <section><h2>{config.title}</h2><p>Operational</p></section>,
  renderPreview: ({ config }) => <section><h2>{config.title}</h2><p>Preview</p></section>,
} satisfies PhiCmsServerWidgetPlugin<StatusCardConfig>;
```

Runtime/Preview code may load server data and translated labels. Browser interaction belongs in a
small Client component. If that component is selected through
`PhiRuntimeModuleRenderClientHost`, list it in `renderClients` of the package's
`phiModuleClientContributions` ([section 8](#8-export-the-client-and-authoring-contributions)).

### Server Widget loader descriptor

```ts
// widgets.ts
import type { PhiRuntimeModuleWidgetDefinition } from "@phis/ui/cms/plugins";
import { STATUS_CARD_WIDGET_DEFINITION } from "./widgets/card/config";
import { STATUS_MODULE_ID } from "./ids";

export const STATUS_WIDGETS = [{
  definition: STATUS_CARD_WIDGET_DEFINITION,
  ownerModuleId: STATUS_MODULE_ID,
  renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
  loadRuntime: () => import("./widgets/card/plugin")
    .then((module) => module.STATUS_CARD_WIDGET_PLUGIN),
  loadPreview: () => import("./widgets/card/plugin")
    .then((module) => module.STATUS_CARD_WIDGET_PLUGIN),
}] as const satisfies readonly PhiRuntimeModuleWidgetDefinition[];
```

The descriptor must not statically import the plugin implementation.

### Authoring adapter

```tsx
// widgets/card/authoring.tsx
"use client";

import type { PhiCmsBuilderWidgetPlugin } from "@phis/ui/types";
import {
  STATUS_CARD_WIDGET_DEFINITION,
  type StatusCardConfig,
} from "./config";

export const STATUS_CARD_BUILDER_PLUGIN = {
  ...STATUS_CARD_WIDGET_DEFINITION,
  renderEditor: ({ config }) => <section><h2>{config.title}</h2><p>Preview</p></section>,
} satisfies PhiCmsBuilderWidgetPlugin<StatusCardConfig>;
```

Register the adapter only in the owner Module's Authoring Client, which section 8 exports:

```tsx
// authoring-client.ts (excerpt)
"use client";

import {
  createPhiAuthoringWidgetModule,
  createPhiRuntimeModuleAuthoringClient,
  definePhiAuthoringWidgetModuleLoader,
} from "@phis/ui/runtime/authoring-client";
import { STATUS_MODULE_ID } from "./ids";
import { STATUS_CARD_WIDGET_DEFINITION } from "./widgets/card/config";

const StatusAuthoringWidgetModule = createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    STATUS_CARD_WIDGET_DEFINITION,
    () => import("./widgets/card/authoring").then((module) => module.STATUS_CARD_BUILDER_PLUGIN),
  ),
]);

export const PhiStatusAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: STATUS_MODULE_ID,
  WidgetModule: StatusAuthoringWidgetModule,
});
```

The shared Canvas scaffold owns selection, hover chrome, drag/drop, slots, debug outlines, and common
tools. A Widget adds only its body and optional `renderEditorTools()` extension.

### Offering an image picker

A Widget that lets an author choose an image reads the Site's Media library, and it names that library
through a Foundation contract rather than through the Module that serves it:

```ts
import { PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS } from "@phis/ui/constants";

requiredDataProviders: [PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection],
```

Declare it. A Page mounts only the providers its tree asks for, and the tree scan reads a `providerKey`
out of a Widget's config or out of this declaration -- it cannot see a provider the Widget reaches for
from inside its own client code. Without the declaration the picker opens over an empty library,
reporting the provider as unavailable.

The import is the dependency, not the reading. Citing the Asset Module's own ids would bind your package
to that Module at build time, which is the Module-to-Module edge the dependency rule forbids; the
contract above holds no such reference. Whether anything answers the keys is an installation question,
and a Widget whose provider is absent degrades to an empty library instead of failing to build.

Inside the Builder's own chrome the library is always readable, whatever the edited Area activates -- a
`phis:asset/...` reference is resolved by the core reference resolver, so an Area without the Asset
Module still renders its images. That availability is declared by the owning Module through
`availableToAuthoringChrome` on its provider descriptor, not listed anywhere in the Builder.

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
  palette: {
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
import { STATUS_MODULE_ID } from "./ids";

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
preset versions when the published preset contract changes. `palette.seed` carries the seeds both modes
share; `modes.light` / `modes.dark` carry the two base seeds, explicit colour tokens under `overrides`
and the ten custom colours under `customColors`. A Site's own `theme.palette` has exactly this shape and
is laid over the preset field by field.

Palettes travel through `themes`. The other parts of a look are Theme blocks announced through
`themeBlocks` on the same catalog entry, with the `PhiCmsThemeBlockDescriptor` shape from `@phis/ui/types`
and the block types from `@phis/ui/theme`: a **style**, a **ground**, a **fonts** block, and a **Set** that
names the parts by key. What each block holds and how a Site follows or adopts it is
[THEME.md](./THEME.md#theme-blocks).

```ts
// themes.ts
export const STATUS_THEME_BLOCKS = [{
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: "status-night-ground",
  presetVersion: 1,
  blockKind: "ground",
  blockKey: "status-night",
  title: "Status Night",
  loadBlock: () => import("./theme-ground").then((module) => module.STATUS_NIGHT_GROUND),
}, {
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: "status-night-set",
  presetVersion: 1,
  blockKind: "set",
  blockKey: "status-night",
  title: "Status Night",
  loadBlock: () => import("./theme-set").then((module) => module.STATUS_NIGHT_SET),
}] as const satisfies readonly PhiCmsThemeBlockDescriptor[];
```

A ground may carry a picture. A photograph ships as a file beside the module that names it, through
`new URL("./ground.jpg", import.meta.url).href`, and the package build copies the file into `dist` next
to the compiled module. The Site build serves it as `/_next/static/media/ground.<hash>.jpg` with an
immutable cache, so a page fetches the picture only where the ground is shown. Not a static image import:
Node cannot load one, and scripts that read the catalogue run on Node, where the expression is a `file:`
URL. A small SVG drawn from the palette's colours may stay an inline `data:image/svg+xml` URL. The block
catalogue itself reaches the browser only in the Builder, which is the one Area that chooses among
blocks; every other page receives the one Theme the root resolved on the server. A Site that only follows
the ground stores its key and nothing else, and the Module delivers the look.
When a Site saves a Theme that follows a Module's block, the Site adopts it: the values and pictures become the Site's own and later Module updates no longer reach it ([THEME.md](./THEME.md#adoption-on-save)).
A Theme is site-wide, so palettes and blocks are read from the
installed union -- what `phis module add` projected -- rather than from the Areas the Module is
enabled in. `@phis/example` in this workspace ships a complete palette, ground and Set.

Client components consume Ant Design semantics through `usePhiConfig().token` and module-specific
custom colors through the approved Phi config contract. Do not create parallel `--phi-*` variables for
Ant Design tokens or install another root Theme provider. A Module using another UI library may expose
one lazy module UI provider scoped to its own subtree.

## 6. Add a Preset Form

The Form contract is [FORMS.md](./FORMS.md); the step-by-step guide is
[components/forms/PRESET_FORMS_HOWTO.md](./components/forms/PRESET_FORMS_HOWTO.md). In summary:

- create the id with `createPhiFormId(STATUS_MODULE_ID, "incident-report")`, which yields
  `@acme/status/modules/status/forms/incident-report`; catalog construction requires the prefix to be
  the owner Module id;
- define the Form with `definePhiRuntimeModuleForm(...)` from `@phis/ui/forms`;
- declare every referenced field, validation, and handler Provider in the Module definition's
  `formProviders`; a handler Provider declares its `credentialPolicy` and an `endpointKey` or
  `upstreamPath` ([FORMS.md](./FORMS.md#handler-providers));
- contribute the Form through `catalogEntry.forms`; catalog construction rejects a missing or
  mismatched phase handler;
- render fields through Phi Controls, not CMS Widgets;
- place the Form in CMS trees with the generic Form Widget (`@phis/ui/modules/core/widgets/form`) and its
  `formId`; never register a domain Form Widget;
- use the demand-materialized Core Form controller
  (`controller:@phis/ui/modules/core/controller/form:<instanceKey>`) unless the Module has a genuinely
  different lifecycle.

## 7. Export the Server contributions

A package hands its Modules over under fixed names, one per boundary. The root entrypoint exports the
definitions; `./server` exports the catalog contributions. Both helpers come from `@phis/ui/module`:

```ts
// index.ts
import { definePhiModuleDefinitions } from "@phis/ui/module";
import { STATUS_MODULE_DEFINITION } from "./definition";

export const phiModuleDefinitions = definePhiModuleDefinitions([STATUS_MODULE_DEFINITION]);
```

```ts
// server.ts
import "server-only";

import { definePhiModuleServerContributions } from "@phis/ui/module";
import { STATUS_MODULE_DEFINITION } from "./definition";
import { STATUS_ROUTES } from "./presets";
import { STATUS_THEMES } from "./themes";
import { STATUS_WIDGETS } from "./widgets";

export const phiModuleServerContributions = definePhiModuleServerContributions([{
  moduleId: STATUS_MODULE_DEFINITION.moduleId,
  catalogEntry: {
    definition: STATUS_MODULE_DEFINITION,
    widgets: STATUS_WIDGETS,
    layouts: [],
    routes: STATUS_ROUTES,
    themes: STATUS_THEMES,
    load: () => import("./module").then((module) => module.STATUS_RUNTIME_MODULE),
  },
}]);
```

- `definePhiModuleDefinitions` rejects a duplicate Module id and a definition without `eligibleAreas`.
- `definePhiModuleServerContributions` validates each contribution where the package is built: the
  `moduleId` must match the definition, and every Area-addressed descriptor (route, shell, overlay,
  navigation injection) must address an Area the definition lists.
- A contribution never names an Area. `phis module` generates a projection that places each Module into
  the Areas of its `eligibleAreas` (`collectPhiSiteModuleServerAreaContributions` in
  `@phis/ui/module/projection`), and each Area catalog keeps the descriptors addressed to it.
- `createPhiNextCmsSiteBridge` validates the combined catalog with `assertPhiRuntimeModuleCatalog`, so
  invalid ownership, missing loaders, unsupported render policies, or malformed signal metadata fail at
  Site assembly.

Routes, Area shells, overlays, navigation injections, and Themes are descriptors on the same catalog
entry ([MODULES.md](./MODULES.md#descriptor-identity-and-instantiation)). Modules never create physical
Next.js routes. Outside Public, a route answers under its package: `/orders` in `@acme/shop` is served
at `/acme/shop/orders` -- the scope loses its `@`, and the module key is not part of it. Public carries no
namespace, and `/` is an application for the Area root slot. An Area may export a route mount such as
`settings`; a route opts in with `mount: { mountKey: "settings" }`. A Module references its own Pages
through `(ownerModuleId, presetKey)`, never through a literal path.

## 8. Export the Client and Authoring contributions

`./client` exports the live Client contributions, one entry per Module:

```tsx
// client.ts
"use client";

import dynamic from "next/dynamic";
import { definePhiModuleClientContributions } from "@phis/ui/module/client";
import { STATUS_MODULE_ID } from "./ids";

export const phiModuleClientContributions = definePhiModuleClientContributions({
  modules: [{
    moduleId: STATUS_MODULE_ID,
    // A literal next/dynamic call, so the server render preloads the Controller's chunks.
    Controller: dynamic(() =>
      import("./controller/client").then((module) => module.PhiStatusControllerClient)),
    renderClients: [],
    dataProviders: [],
  }],
});
```

- `Controller` is present exactly when the Module owns a Controller. A controllerless Module omits it.
- `renderClients` pairs a namespaced Widget type with a Client made by
  `definePhiRuntimeModuleRenderClient(dynamic(() => import(...)))` from `@phis/ui/runtime/render-client`,
  for Widgets whose Server renderer uses `PhiRuntimeModuleRenderClientHost`. Pure Server-rendered Widgets
  need no entry. The `dynamic` call must be literal and come from `next/dynamic`.
- `dataProviders` lists `{ key, ownerModuleId, loadLive, loadAuthoring? }` for the Provider descriptors in
  the definition. `loadAuthoring` exists only for providers whose `authoringMode` is `read` or `edit`.
- `calendarAdapters` (beside `modules`) lists Calendar adapter Clients. Their Server descriptors are
  `calendarAdapters` in the definition, keyed `<owner>/calendars/<key>`.
- `definePhiModuleClientContributions` rejects a duplicate Module id.

`./authoring-client` exports the Authoring contributions. Every Module brings one, including a Module
with nothing to author: the Builder wraps each active Module's Authoring Client around the Canvas, and
a missing loader is a hard failure.

```tsx
// authoring-client.ts
"use client";

import { definePhiModuleAuthoringContributions } from "@phis/ui/module/authoring-client";
import { STATUS_MODULE_ID } from "./ids";

export const phiModuleAuthoringContributions = definePhiModuleAuthoringContributions([{
  moduleId: STATUS_MODULE_ID,
  loadAuthoring: () => Promise.resolve(PhiStatusAuthoringClient),
}]);
```

`PhiStatusAuthoringClient` is the Client built in [section 4](#authoring-adapter); a Module without
Widgets passes `createPhiAuthoringWidgetModule([])`. `collectPhiSiteModuleClientContributions` refuses a
definition without an Authoring contribution, so the mistake surfaces where the package is composed.

Public calendar values are serializable adapter-neutral records from `@phis/ui/types`. Do not persist or
signal `Date`, Dayjs, Luxon, Temporal, or adapter-private objects. Scalar `date` and `time` signals carry
`YYYY-MM-DD` and `HH:mm[:ss[.fraction]]` strings; calendar-aware selections, ranges, and events use
`json` with a package-namespaced value schema. Core owns the Gregorian adapter and the Date Picker
Widget; `@phis/calendar` is an optional Module package with event calendars and further calendar systems.

## 8a. What a Module package exports

```text
.                   phiModuleDefinitions             definePhiModuleDefinitions            @phis/ui/module
./server            phiModuleServerContributions     definePhiModuleServerContributions    @phis/ui/module
./client            phiModuleClientContributions     definePhiModuleClientContributions    @phis/ui/module/client
./authoring-client  phiModuleAuthoringContributions  definePhiModuleAuthoringContributions @phis/ui/module/authoring-client
./fonts             phiModuleFontContributions       definePhiModuleFontContributions      @phis/ui/module   (optional)
```

A generator cannot guess an export it was never told about, so these names are fixed (`module.ts`). Each
is keyed by Module id, because one package may carry several Modules.

**`./fonts` exists only for a package that declares typefaces, and nothing else in the package imports
it.** A declaration is a `next/font/local` call at module scope: the Site's build evaluates it, hosts the
files from the Site's origin, and computes fallback metrics; outside a Next build the call throws. The
boundary exports catalogue entries, not loader results: the family name a fonts block may write in a
slot, the CSS variable in the Module's own namespace (`var(--phi-font-<module>-<family>)`), and the class
that puts the variable in scope. `definePhiModuleFontContributions` rejects an unnamed or duplicate
family, a family `@phis/ui` already declares, and a variable outside that namespace. Declarations say
`preload: false`, because the Theme decides per request which family a page uses. The files travel in
`dist` under a licence that permits redistribution and subsetting. The boundary does not begin with
`"use client"`. Font delivery is described in [NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md#fonts).

**A Widget names itself from its own package.** `resolvePhiCmsWidgetPluginKey` maps a bare type key to a
first-party Module and refuses an unknown one. A Module package composes its own plugin key
(`@acme/status/modules/status/widgets`) and builds the namespaced type with
`buildPhiCmsWidgetNamespacedTypeKey`; the namespaced type is what the Server manifest and the Render
Client manifest carry. The authoring editor is built from Controls in `@phis/ui/controls`.

**Navigation.** An injection that names no anchor lands at the end of its surface, ordered by
`ownerModuleId`, `presetKey`, and `itemKey`. `before`, `after`, and `parentItemKey` must point at an item
the surface exports through `exportedItemKeys` or at one the Module injects itself.

## 8b. How the package is built

A Module package ships compiled. `dist` holds transpiled ESM with `"use client"` intact, `.d.ts` beside
each file, and copied assets (CSS, fonts, pictures). Use `tsc`, not a bundler: `tsc` emits one file per
source file and leaves the directive and the bare imports of `react` and `@phis/ui` alone, while bundlers
tend to drop the directive and inline peer dependencies. `@phis/example`'s `build` script is
`tsc -p tsconfig.build.json` plus copying its font and picture files.

`phis module check` inspects the installed package without loading it
(`phis-server/src/cli/module-package.mts`):

- `.`, `./server`, `./client`, and `./authoring-client` are exported and point at existing files;
- `./client` and `./authoring-client` begin with `"use client"`; `.` and `./server` do not;
- `react` and `@phis/ui` are not ordinary dependencies, and the package carries no copy of its own;
- a package that ships CSS states CSS side effects;
- the `phis` block declares the package's Modules, each id belongs to the package, and each category is
  known.

`.d.ts` files are not checked there, but the generated projection imports the package by name and the
Site's build typechecks it. A package with Widgets still needs a Site build after installation, because
its Client code enters the bundle graph. Compiled, only the declared `.d.ts` surface is typechecked
against the installed `@phis/ui`; the peer range states compatibility.

## 8c. Gating a surface on a Server Add-on's role

A Module may hide a page or a navigation entry from somebody who does not hold a role its Add-on half
declared:

```ts
accessPolicy: {
  access: "addon-roles",
  providerId: "@acme/market",
  allowedRoles: ["vendor"],
}
```

Names, not flags. An Add-on's roles are frozen from the first assignment and declared in its own
manifest; a bit position would have to be handed out and kept forever, reordering the manifest would
silently change what a policy means, and thirty-two would be the ceiling.

The names reach the client with the rest of the viewer, as `addonRoleClaims`, filtered to what the
Add-on's **current** manifest declares and to Add-ons enabled for this Site. A viewer that never carried
them denies the policy rather than assuming: absent is not the same as empty-and-known.

**This is presentation, not protection.** Leaving a link out spares somebody a refusal they could not
have acted on; it does not make the page safe. What the link leads to is decided again on the server, by
the handler, against `roles:v1`. A Module that gates only in the client has hidden a door, not locked it.

Like the other provider-scoped policies, this one is owner-checked: a Module may name its own Add-on and
Core, and not somebody else's. The policy is part of [ACCESS.md](./ACCESS.md); Add-on roles are declared
as described in [phis-server AUTHORIZATION.md, "Add-on roles"](../phis-server/AUTHORIZATION.md#5-add-on-roles).

## 9. Install without patching the Skeleton

Installing a Module never adds or rewrites Skeleton source. `phis module` records the installation and
generates a projection, which the Skeleton hands to the generic hosts from the files under
`src/runtime-modules/` -- each Area host, each Area's Client boundary, and the root. Those files do not
change when a Module is installed or removed; placement by `eligibleAreas`, collision checks, and the
Builder's union across Areas stay in `@phis/ui`.

```text
phis module list  [--site <site key>]
phis module add   --site <site key> --package <@scope/name> [--spec <version or workspace:*>] [--path <site root>]
phis module del   --site <site key> --package <@scope/name> [--force] [--path <site root>]
phis module sync  --site <site key> [--path <site root>]
phis module check --site <site key> [--package <@scope/name>] [--path <site root>]
```

(`phis-server/src/cli/phis.mts`)

- `--path` names the Site root when it is not the Site's configured source path.
- `add` records the package in `config/phis-modules.json`, rewrites the projection, and runs the package
  check. With `--spec` it writes the package into the Site's dependencies; without one the package must
  already resolve. Nothing is fetched.
- `del` refuses while the package still draws blocks on published pages of the Site and lists them;
  `--force` removes it anyway. The blocks stay in their pages and stop being drawn. It also removes the
  dependency and rewrites the projection.
- `sync` regenerates the projection from the recorded state.
- `check` runs the package check from [section 8b](#8b-how-the-package-is-built).

A recorded entry is exactly `{ packageName, origin, spec? }` (`phis-server/src/cli/modules.mts`).
`origin` is `resolved` when `add` was given a `--spec` and `local` otherwise; the type also admits
`source`.

The projection is four generated files, written together: `src/generated/site-modules.ts`,
`site-modules-client.ts`, `site-modules-authoring-client.ts`, and `site-modules-fonts.ts`. The fourth
lists only the packages that export `./fonts`, read from each package's `exports` in the Site's
`node_modules` -- the boundary itself calls `next/font/local` and throws outside a Next build, so the
manifest is what decides it. A package the install has not brought in yet reads as one without
typefaces, so run `phis module sync` after installing what `add --spec` recorded. All four files are
preserved when the Skeleton is reconciled, so regenerating a Site does not uninstall its Modules.

After installation, rebuild the Site. Installing never enables a Module: the Site selects it per Area
in the Builder, and only ids present in the build can be selected. If the package also carries an
Add-on half, install and enable the Add-on through `phis addon` ([phis-server
SERVER_ADDONS.md](../phis-server/SERVER_ADDONS.md)); Module activation never installs or enables it.

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
- Controller fields and the `Controller` Client are either complete as one group or absent as one group.
- Every controllerless Module contributes at least one meaningful owned artifact and no no-op Controller.
- Widgets use Phi Controls, providers, signaling, and the shared Canvas scaffold contracts.
- Server handlers revalidate Form input and enforce authorization independently of Client validation.
- No Public Widget's server half reads cookies, headers or the viewer, or renders a per-visitor value
  (token, nonce, timestamp, random value); those are loaded in the browser (STATIC_RENDERING.md).
- Module data a Public page must show without delay is loaded in the browser, not rendered on the server.
- Every handler-mode Form has an owned phase-matching handler Provider, and the owner Module is selected in
  every intended effective Area preset.

## Verification

Run the package's own checks:

```bash
pnpm typecheck
pnpm build
```

A package may add its own script; `@phis/example` has `pnpm verify`, which checks that its catalog
contributions resolve. Then, against a Site:

```bash
phis module add --site <site key> --package @acme/status --spec workspace:* --path <site root>
phis module check --site <site key> --package @acme/status --path <site root>
```

Rebuild the Site and test at least:

- one Area with the Module inactive and the same Area with it active;
- the code-owned Area baseline on a Site with no persisted Area revision;
- Runtime and Preview rendering of every contributed Widget;
- Builder Picker, Inspector, Canvas, and Authoring output;
- Controller mounting and the declared signal routes;
- the diagnostics for a missing or incompatible server capability;
- that Public does not download Builder or unrelated optional-Module code;
- every Widget on a Public page in a production build, signed out and without a query
  ([STATIC_RENDERING.md](./STATIC_RENDERING.md#checking-a-page)).

Measure payload from the production browser resource list; development Turbopack chunks are not a
production bundle.
