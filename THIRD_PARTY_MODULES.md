# Third-party Site Module guide

This guide is the practical entry point for building a Site Module package against `@phis/ui`: package
structure, identifiers, Controllers, Widgets, Theme presets, Preset Forms, the Pages a Module brings
([section 6a](#6a-pages-a-module-brings)), the fixed package exports, building, installing, and
verification.

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
   `cards`, `signals`, `background-patterns`, `video-providers`. A third-party package invents Modules
   and leaves, not namespaces.

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
    "modules": [{
      "moduleId": "@acme/status/modules/status",
      "category": "operations",
      "eligibleAreas": ["public", "app", "admin", "builder", "editor", "accounting"]
    }]
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
  `other`), the Areas it may serve (`eligibleAreas`), and the language of the Modules' titles. A
  catalogue reads it without running the package; `phis module check` reports a missing or malformed
  declaration.
- `eligibleAreas` is stated here and nowhere else -- not in the Module's definition. `phis module` writes
  one Client projection per Area and imports a package's Client door only into the Areas its Modules
  serve; it has to know them without loading the package, and this file is the one it may read. The
  generated projection completes the definition with them, so the catalog and the Builder read
  `eligibleAreas` as usual.
- CSS shipped by the package needs `"sideEffects": ["**/*.css"]` instead of `false`.

Modules use Phi Controls for supported presentation and do not import Ant Design directly where a Phi
Control exists: inline feedback is `PhiAlertControl`, anchored confirmation `PhiConfirmControl`, text
`PhiTypographyControl`, the arrangement inside one Widget `PhiFlexControl` (a gap, not `Space`), a
placeholder `PhiSkeletonControl`, and a count on a button the `badge` of `PhiButtonControl`; icons are
drawn with `PhiIcon` by name (`@phis/ui/navigation`), never imported from `@ant-design/icons`. A
picture is `PhiImageControl`, drawn from what `resolvePhiImagePresentation` answers (both from
`@phis/ui/controls`); a file an Add-on keeps in a slot is `{ sourceKind: "url", sourceUrl: contentPath }`
with `source="url"`.
Application messages and notifications are sent with `usePhiApplicationFeedback`
(`@phis/ui/runtime/signal-client`). A missing reusable capability is a Core contract extension, not a
package-local Ant Design path. The one place a Module renders Ant Design itself is where it supplies the
component a Control delegates to -- a calendar adapter for `PhiCalendarControl` -- and there it uses
what Ant Design draws, since that is what it is supplying.

## The contract between a package's two halves

A package with an Add-on half is one product in two processes. The Module half runs in the Site and the
browser, the Add-on half inside `phis`, and neither imports the other. They still have to agree on a
handful of values: the route and hook paths the Module calls, a header of the package's own, the role
names the Module gates on, the states a row answers in, and the paths of the Module's Pages that the
Add-on writes into links. Those values are the package's own contract, and they live in one place:

```text
@acme/status/
└── src/
    ├── contract/
    │   └── index.ts      values and types both halves import; it imports nothing
    ├── ids.ts            the Module half's identifiers; re-exports what it uses from contract/
    └── addon/
        └── constants.ts  the Add-on half's names; re-exports what it uses from contract/
```

- **It imports nothing.** No React, no `@phis/ui`, no server library, no Node built-in: it is compiled
  into both halves, and whatever it imported would be imported by both. Plain constants and types only.
  `@phis/contracts` is the wire contract between an Add-on and Core; this is the contract between the
  two halves of one package, and nobody outside the package reads it.
- **It is shared when the package is built, not while it runs.** The Add-on bundler and the Module build
  each copy the values into their own artifact. Once installed, the halves know nothing of each other
  and meet only on the wire, so a value both copies carry is a promise between two separately installed
  artifacts.
- **Changing a value is a breaking change between the halves.** The two halves are installed by
  different commands (`phis addon upgrade`, `phis module`) and may run at different versions for a
  while. Change a contract value only by rolling both halves out together, or answer the old value
  beside the new one until no installed half speaks it.
- **A header of the package's own never starts with `x-phis-`.** The Site's door drops every request
  header with that prefix, and `authorization`, before it forwards to Core.
- **Add-on import paths carry their extension.** `phis` loads the manifest entrypoint unbundled in Node,
  so the Add-on half imports `../contract/index.js`; the Module half imports `./contract` as the rest of
  its source does.

### Paths the Add-on writes into links

Inside the Site a link is a page reference, never a path
([Links are references, never paths](#links-are-references-never-paths)). Some links are made outside
it: the return address a payment Provider sends the buyer back to, the link in a confirmation mail.
Nothing resolves a reference there, so the Add-on writes a Site-relative path, and Core puts the Site's
public address in front of it. That is safe to promise for a Page the Module brings: a Module Page's
path is owned by the Module and locked in the Builder, so no Site author can move it. The path belongs
in the contract, and the Module's route descriptor is built from the same constant:

```ts
// src/contract/index.ts
/** The receipt page: served by the Module, written into return addresses and mails by the Add-on. */
export const ACME_STATUS_INCIDENT_PAGE_PATH = "/status/incident" as const;

// src/presets.ts (Module half)
path: `${ACME_STATUS_INCIDENT_PAGE_PATH}/:number`,

// src/addon/runtime.ts (Add-on half)
link: `${ACME_STATUS_INCIDENT_PAGE_PATH}/${number}`,
```

`@phis/shop` (`phis-shop`) follows this layout: its order page path, order-token header, route bases,
roles and order states are in `src/contract/`.

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
Module has nothing to yield with -- that path is its identity. Activation is not refused today: nothing
checks a Site Page against a package path outside Public (the check is open in [TODOS.md](./TODOS.md)).
What happens instead is decided by how a request is resolved (`plugins/runtime-modules/route-page-resolution.ts`):
for a static route of your Module the Page is looked up by your preset's identity, not by its path, so
your Page answers and the Site's Page stays stored but is no longer reached at that address until the Site
moves it or your Module is switched off. For a route with parameters an exact Site Page at the concrete
path still wins. It needs an operator, and there is nothing to build against it: no Module code can
avoid or detect it.

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
  type PhiModuleDefinition,
} from "@phis/ui/module";
import { createPhiCoreServerBinding } from "@phis/ui/types";
import { STATUS_CONTROLLER_TYPE, STATUS_MODULE_ID } from "./ids";
import { STATUS_CONTROLLER_DEFINITION } from "./controller/definition";

export const STATUS_MODULE_DEFINITION = {
  moduleId: STATUS_MODULE_ID,
  kind: "module",
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
} satisfies PhiModuleDefinition;
```

`sourceLocale` is the single canonical language for every package-authored user-facing string owned by
the Module. It defaults to `en`. Do not repeat or override it on individual Widgets, Forms, providers,
presets, or navigation contributions. Define Module-owned Label Sets with
`definePhiRuntimeModuleLabelSet(STATUS_MODULE_DEFINITION, ...)` from `@phis/ui/module/labels`; this
binds their global translation source language and stable Label-Set namespace to the owner Module.

**From `@phis/ui/module/labels`, not from `@phis/ui/server-helpers`.** The same names are on the server
barrel, and a package that takes them there imports `server-helpers/cms-root` and `next/headers` along
with them. Nothing fails to compile. What happens instead is that every page of the Site answers `500`
with an import trace naming the barrel -- because the Module definition is reachable from both sides of
the seam: the Label Sets that bind to it are rendered by Client Widgets, so the browser graph gets
whatever the definition's chain touches. `@phis/ui/module/labels` is one file wide and carries the
credentials reader as well, for the same reason.

`title`, `description`, and `category` are required non-empty Module metadata; `category` is one of the
Module categories listed above and is the same value the package's `phis` block declares. Every Module must also
declare at least one non-empty visual source: an exact `icon`, a semantic `iconFamily`, or both. The
Server catalog validates these rules at runtime in addition to the TypeScript contract, so JavaScript
packages and cast values cannot bypass them. `icons`, optional, is something else: the icons the
Module's presets and Widget configs may name, registered as data ([8d](#8d-icons-a-module-brings)).

Module title, description, and package-authored component labels are global product copy shared across
Sites. The server translates Authoring metadata before it reaches Client option providers. Site CMS
content, external documents, and Provider/user content keep their separate content-locale contracts;
they must not inherit the Module source locale merely because a Module renders them.

`eligibleAreas` in the package's `phis` block is the module-level installation boundary. A third-party
Module may list every canonical Area as above and can then be activated independently per Site and Area. Its Widgets appear
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

import { createPhiConfigReader } from "@phis/ui/widget-config";

export function parseStatusCardConfig(config: Record<string, unknown>): StatusCardConfig {
  const reader = createPhiConfigReader(config);
  // Absent is "Status"; a title that is there and not a text is an error naming the field.
  return { title: reader.string("title")?.trim() || "Status" };
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

### Reading a config

`parseConfig` reads what an author stored, and what it cannot read it says. A value that is absent is
the Widget's to default; a value that is present and wrong -- a number where a text belongs, a mode the
Widget does not know, a list entry without its key -- throws. `createPhiConfigReader` from
`@phis/ui/widget-config` does both: `string`, `number`, `integer`, `boolean`, `oneOf`, `object`, `list`
and `stringList` answer `undefined` for an absent value and throw a `PhiConfigError` naming the path
(`columns[2].sizing.width`), what was expected and what was found. `fail` throws the same for a rule
the field types cannot state. Do not put a default in place of a wrong value or drop an entry you
cannot read: that is a setting an author made which the page then silently ignores.

What a throw does is the same for every Widget, Core's or yours, and whatever it throws:

- The Site refuses to store it. A write under `/api/site/cms` runs each Widget's `parseConfig` first and
  answers 422 with the Widget type, the node and -- for a `PhiConfigError` -- the field.
- A live page leaves that one Widget out and logs `cms.render.block_not_renderable`; everything else on
  the page renders.
- The Builder and the preview show the error in the Widget's place (`invalid-config` for a
  `PhiConfigError`), with the Inspector still open to correct it.

The older lenient readers (`readString`, `readNumber`, ...) are still exported for parsers that have not
moved; they turn a wrong value into `undefined` and should not be used in a new Widget.

A Provider binding in a config -- `{ providerKey, scopeKey?, params? }` -- is read with
`readPhiRuntimeDataProviderBinding` from `@phis/ui/types`, the reader Core's own Widgets use, so the
shape is read once and the same everywhere. It answers `null` for anything that is not a binding (no
namespaced Provider key) rather than throwing, so a strict parser decides what `null` means: absent may
be the Widget's default, while present-but-unreadable, or a binding to a Provider the Widget cannot draw,
is a stored mistake and goes to `fail` like any other field.

A config that parses can still name data the page cannot have: the Provider it is bound to is not
offered in this Area, the record cannot be read, the read itself failed. That is not a throw from
`parseConfig` -- the setting is right, the world is not -- and it is not the Widget's to explain to a
visitor. Render the shared failure piece instead of drawing an alert of your own:
`PhiWidgetFailureServer` from `@phis/ui/module/records` where the Server half finds it, `PhiWidgetFailure`
from `@phis/ui/runtime/data-provider-client` where a Client finds it after hydration. Both take
`{ renderMode, widgetType, widgetId?, title, description?, error? }` (`PhiWidgetFailureProps`) and do what
Core's Widgets do: in the Builder an error card with `title` and `description` stands in the Widget's
place, on a live page -- a revision preview included -- the Widget is absent and the rest of the page
stands, and either way one `cms.widget.unavailable` warning is logged with `error` attached. The render
mode is `widget.config.renderMode` in the render arguments, `"preview"` or `"editor"`, and live
otherwise; pass it to a Client half as a prop. The Server variant logs during the render, the Client
variant from an effect once per distinct failure, so pick the one where the failure is found. What a
visitor is meant to read -- a form's own answer, an empty state, "no such record" answered as a 404 --
is content and does not go through them.

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

A Widget whose Preview is simply its live output, made inert, need not write `renderPreview` by hand:
`definePhiPassiveWidgetRenderers(render)` from `@phis/ui/cms/plugins` returns `{ render, renderPreview }`,
where the Preview is the same render wrapped in an `inert` frame -- the way a Core Widget draws its
Preview, so links do not navigate and controls do not take focus on the Canvas:

```tsx
export const STATUS_CARD_WIDGET_PLUGIN = {
  ...STATUS_CARD_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers<StatusCardConfig>(({ config }) =>
    <section><h2>{config.title}</h2><p>Operational</p></section>),
} satisfies PhiCmsServerWidgetPlugin<StatusCardConfig>;
```

Runtime/Preview code may load server data and translated labels. Browser interaction belongs in a
small Client component. If that component is selected through
`PhiRuntimeModuleRenderClientHost`, list it in `renderClients` of the package's
`phiModuleClientContributions` ([section 8](#8-export-the-client-and-authoring-contributions)).

A Widget that draws words a visitor would search for says them to the Site's search index
([SEARCH.md](./SEARCH.md)) with `searchText` on the same plugin: the text as the reader sees it, in
reading order, one entry per line or paragraph, translated for `runtime.locale` the way the render
translates it (`translatePhiSearchWidgetTexts` from `@phis/ui/server-helpers` does that for a Widget's
own sentences). A Widget without it contributes nothing, which is right for a picture, a form or a
navigation.

```tsx
export const STATUS_CARD_WIDGET_PLUGIN = {
  ...STATUS_CARD_WIDGET_DEFINITION,
  searchText: ({ config, runtime }) =>
    translatePhiSearchWidgetTexts(runtime, [config.title, "Operational"], { translate: true }),
  ...definePhiPassiveWidgetRenderers<StatusCardConfig>(({ config }) =>
    <section><h2>{config.title}</h2><p>Operational</p></section>),
} satisfies PhiCmsServerWidgetPlugin<StatusCardConfig>;
```

### What a Server half may import

A Widget's server half -- `plugin.tsx`, `server.tsx` and what they import -- is part of the server graph
of **every route of the Site**, not only of the Pages the Widget stands on. The Site registers every
installed Module's Server contributions in one catalog, and the loaders in it are reachable from every
route, lazy or not. Next turns every `"use client"` file the server graph reaches into a Client reference
of the route, and the browser fetches the chunks of all of them on every page. A Control is such a file:
every `Phi*Control`, `PhiIcon` and the other Client components in `@phis/ui/controls`,
`@phis/ui/navigation` or `@phis/ui/forms/client` are Client components.

So a server half that renders a Control itself ships that Control, and everything Ant Design brings
with it, to the Public landing of every Site that installs the package -- whether or not any Page uses
the Widget. On 11.11.2026 one Download Widget whose `server.tsx` drew its card from `@phis/ui/controls`
doubled the Public landing's JavaScript (356 to 724 kB gzip). Before `@phis/ui` declared which of its
files have side effects, the bundler also had to keep every other export of the door it imported from,
so it carried Table, Tree, Form and the editing Controls along; now it keeps the ones named, and those
still ship everywhere.

What a server half does instead:

- **Render plain HTML, or hand the browser a view model.** A server half that needs a Control draws
  through its own Render Client: it resolves data, translates words and passes a serializable view model
  to `PhiRuntimeModuleRenderClientHost`; the Client file imports the Controls. The Render Client is listed
  in `renderClients` ([section 8](#8-export-the-client-and-authoring-contributions)) and loaded only in
  the Areas the Module serves and only where the Widget is placed. That is how every Core Widget is built.
- **Import from a door only what runs on the server**: types, constants, helpers, `@phis/ui/module/*`,
  `@phis/ui/server-helpers`, `@phis/ui/theme`. A `type` import is always free.
- **Never import a Client value into `plugin.tsx`, `server.tsx`, a loader descriptor, a Card or a Records
  resolver** -- not a Control, not `PhiIcon`, not a hook. The same holds for the package's `.` and
  `./server` doors.
- **Authoring stays authoring.** The editor of a Widget is built from Controls in `@phis/ui/controls`, in
  the `./authoring-client` door, which only the Builder loads.

`phis module check` refuses it (`client_in_server_graph`): it walks the package's `./server` door --
dynamic imports included, because the Widget loaders are -- and names the file that takes a Client
component, whether a name `@phis/ui` states in `package.json#phis.clientExports` or a file of the package's
own that begins with `"use client"`. `PhiRuntimeModuleRenderClientHost` is the one Client component a
server half renders.

Measure it, do not assume it: build the Site in production with and without the package and compare the
JavaScript the Public landing names (`browser-test/scripts/measure-html-payloads.mjs`). A Widget that
nobody has placed must not change it.

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

### A popup leaves the block

A Widget that opens a Tooltip, a Dropdown, a Select menu or a Popover lets it render in a portal. That is
Ant Design's default -- pass no `getPopupContainer` and the popup lands on `document.body` -- and where
this Foundation names a container it names `document.body` too, through one helper shared by the Canvas
scaffold. Do not point `getPopupContainer` at a node inside your own block.

The reason is not tidiness. A renderable block's frame writes what the author configured, and several of
those things make the block a stacking context of its own: an `opacity` below 1, and every effect that
animates with a transform. A popup anchored inside such a block cannot paint above a later sibling block
however high its `z-index`, and a transform additionally re-anchors a `position: fixed` descendant to the
block instead of to the window. A popup in a portal has left the subtree and meets none of it.

The rule gets wider once a block may state a size per profile: the box that offers a block its room then
declares `container-type: inline-size`, which brings the same stacking context to every slot holding a
responsive block. That work is designed in
[design/RESPONSIVE_BLOCK_GEOMETRY.md](./design/RESPONSIVE_BLOCK_GEOMETRY.md) and is not built; a Widget
written to this rule today needs no change when it is.

## 4a. Add a Layout

A Layout is contributed the way a Widget is, with slots instead of content.

**Declare it in the catalog entry.** Each entry in `layouts` is a `PhiRuntimeModuleLayoutDefinition`:
`ownerModuleId`, the serializable `definition`, `renderPolicies`, and `loadRuntime`, which resolves to
the executable `PhiCmsLayoutPlugin`.

**Name it from your own package**, as a Widget does:
- the `pluginKey` is `@acme/status/modules/status/layouts`;
- the namespaced type comes from `buildPhiCmsLayoutNamespacedTypeKey`.

Core's layout register (the list of Core's own Layouts) is not an extension point, and your Layout does
not appear in it.

**Declare the slots.** Each slot has:
- `key`, `label`, and `slotIndex`;
- `sequential: true`, when the children are an ordered run rather than named places.

For a Layout whose slots are all sequential, `slotPositions` says what an emptied position does:
- `"compact"`, the default: the Builder renumbers the rest after a move or a removal, as in a row.
- `"fixed"`: every position keeps its number, because each one means something on its own, as with
  one panel per slot.

**Render it.** `render` and `renderEditor` receive:
- the node and its parsed `config`;
- the runtime and the tree;
- `renderChildren` or `renderSequentialSlotChildren` for the slot contents.

Style your own markup. `data-layout-kind` and its base CSS belong to Core's own Layout families and are
no contract for yours.

**Place it in a preset** with `buildPhiCmsLayoutNode`:
- Pass your `pluginKey` explicitly. Without it the factory resolves the type key against Core's
  Layouts.
- Leave out `creationPreset`: it selects starting values for Core's families. Give `config` instead.

## 4b. Place Core Widgets

Your Pages are built from Widgets, and most of them will be Core's: Markdown, Simple Text, Button, Table,
Form and the rest. You place them by type key, as data. You never import Core for this; the Foundation
publishes what each one reads.

**Use the node factories.** `buildPhiCmsWidgetNode`, or `widget` and `stack` on
`createPhiCmsPresetNodes`, check `config` against the placement type for the type key:

```ts
nodes.widget({
  typeKey: "button",
  id: STATUS_WIDGET_IDS.refresh,
  parentLayoutNodeId: STATUS_LAYOUT_IDS.toolbar,
  slotIndex: 0,
  label: "status refresh",
  config: { label: "Refresh", variant: "primary", size: { width: "auto" } },
});
```

A misspelt key, or a value outside a vocabulary, fails to compile. At runtime the parser would only
drop it without a word.

**The contract lives in `@phis/ui/core-widgets`.**
- `PhiCoreWidgetPlacements` maps each listed type key to its placement type.
- `PhiWidgetPlacementBase` is the envelope every placement shares: the block geometry, `visibleWhen`
  and `signalRoutes`. The slot frame applies the block to every Widget alike.
- Translation is off through the node flag `PhiCmsFlags.NoTranslate` (`flags`), not through config. The same
  holds for a Layout that translates its own text (`translatesOwnText`), such as the Collapsible's panel
  titles: set the flag where the titles you write are already in the reader's language.

**What stays untyped:**
- a Core Widget not in the map yet, such as Card, whose config is still changing;
- a type key known only at runtime;
- a Widget named with a `pluginKey`, your own included, since its config is yours to define.

Give such a `config` a type of your own with `satisfies`.

`stack` takes no `pluginKey`, so place your own Widgets with `widget`.

`validate-core-widget-placements` checks each placement type against the Widget's Inspector fields in
both directions. The contract cannot drift from what the Inspector writes.

### Dialogs

A dialog is an Overlay with a body and a row of actions, and every dialog looks the same: the body is the
Theme's wash, the base step in from the edge and the small step between what stands in it, with no corner of
its own; the actions are one compact, labelled group. Build one with `dialog` on `createPhiCmsPresetNodes`,
which returns the Overlay, its Layouts and its Command Toolbar for your tree's `overlays`, `layoutNodes` and
`contentWidgets`. Building one node by node, spread `PHI_DIALOG_BODY_CONFIG` into the body Layout and
`PHI_DIALOG_COMMANDS_CONFIG` into the toolbar (`@phis/ui/helpers`); the descriptor compiler refuses a modal
whose body or actions say otherwise. A dialog whose content runs to its edges -- an image to crop, a canvas
-- takes `PHI_DIALOG_BLEED_BODY_CONFIG` instead: the same ground, no inset, and its content draws no corner.

## 4c. Messaging

A conversation is Core's, whichever Module runs it: threads, messages, who may read them and the Add-on
capability `threads:v1` live on the server, and the surfaces for them live in Core. A Module brings a kind
of conversation and places Core's surfaces for it -- it does not grow a conversation Widget or a reply of
its own.

1. **Declare the kind** in your definition (`threadKinds`), and open threads of it through your own
   route or Core's.
2. **List them** with a Table over `PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.table` (`@phis/ui/constants`),
   resource `inbox`, with `fixedFilters: { kind }`. Its summary carries `unread`; `core.totalRows` the
   total.
3. **Read one** with the `thread-conversation` Core Widget (`PhiThreadConversationWidgetPlacement`). It
   listens for `select` and `reload` on the `thread` channel (`signals/thread-selection`), so your
   Controller -- or the Table's selection, where the row is the thread -- tells it which.
4. **Answer it** with `reply: true` on the conversation and Core's Reply Form,
   `PHI_SHARED_FORM_IDS.threadReply` (`@phis/ui/forms`), in a `dialog` with `openActionKey: "reply"`.
   Route the conversation's `reply` emit to the dialog and to the Form; the Form's `source` is the thread
   inbox, so it reads the thread from the row the Reply names. Offer an internal note with
   `formConfig: { initialValues: { internalAllowed: "1" } }` where your readers are Staff; Core writes
   `Internal` for Staff alone whatever arrives.

Everything your Module adds beside a conversation -- a ticket's state, an order it is about -- is a Widget
of its own placed next to it, told by the same Controller. Nothing is put inside Core's Widget.

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
preset versions when a release of your package changes the published preset contract, for the same
reason a route preset raises `presetVersion` ([Pages a Module brings](#6a-pages-a-module-brings)). `palette.seed` carries the seeds both modes
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

**Installing your Module does not apply your Theme.** Unlike a Public address, which your Module takes on
activation when nobody else holds it, a Theme is offered: your blocks join the list the Theme workspace
shows, and the Site chooses. Nothing a visitor sees changes until somebody does. Ship the look, say what
it is in the descriptor's title and description -- that is what an author picks from -- and do not build
a side channel that selects it. The reasoning is in [THEME.md](./THEME.md#selection-and-resolution); the
short of it is that a Site can hold only one Theme, several Modules offer one, and the choice is the
Site's to draft and publish like any other.

Client components consume Ant Design semantics through `usePhiConfig().token` and module-specific
custom colors through the approved Phi config contract. Do not create parallel `--phi-*` variables for
Ant Design tokens or install another root Theme provider. A Module using another UI library may expose
one lazy module UI provider scoped to its own subtree.

## 6. Add a Preset Form

The Form contract is [FORMS.md](./FORMS.md); the step-by-step guide is
[components/forms/PRESET_FORMS_HOWTO.md](./components/forms/PRESET_FORMS_HOWTO.md). In summary:

- create the id with `createPhiFormId(STATUS_MODULE_ID, "incident-report")`, which yields
  `@acme/status/modules/status/forms/incident-report`; catalog construction requires the prefix to be
  the owner Module id -- the Module id and not the package name, whatever the parameter is called, and a
  package carrying two Modules gets two namespaces;
- create it in a file the Module definition does **not** import. `@phis/ui/forms` carries
  `gateway/form-submit`, which is `server-only`, so one `createPhiFormId` call in the definition's import
  chain puts `server-only` in the browser graph and the Site answers `500` everywhere. The handler *key*
  is a plain string and may sit anywhere; the id belongs beside the descriptor;
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

## 6a. Pages a Module brings

A Page a Module brings is a **route preset**: a descriptor that says where the Page answers and a tree
loader that says what it draws. Nothing about it is a Next.js route, nothing is written to the database
when it is installed, and it does not have to be seeded: the tree is built in memory from the descriptor
on each request, until an author changes the Page and the Site saves a Draft of its own
([MODULES.md](./MODULES.md#descriptor-identity-and-instantiation)).

### The route descriptor

`PhiCmsRoutePresetDescriptor` (`types/cms-module-descriptors.ts`, public from `@phis/ui/types`) is one
entry of the catalog entry's `routes` ([section 7](#7-export-the-server-contributions)). The catalog
compiles every active Module's `routes` into the Area's route table; the Module definition itself names
no route.

- `ownerModuleId` and `presetKey` are the Page's identity. The Builder addresses the Page by
  `createPhiPresetCmsPageId({ ownerModuleId, presetKey })`, links reach it by a reference built from the
  same pair, and its node ids are derived from it, so a `presetKey` is as permanent as a Widget type: rename
  it and every saved copy, link and node id belongs to a Page that no longer exists. It is unique among
  all the preset descriptors of the Module, routes, shells, overlays and Themes alike.
- `area` is the one Area the Page answers in; the Module must list it in `eligibleAreas`.
- `path` is the Area-local path. Outside Public it is served under the package path (`/status` in
  `@acme/status` answers at `/app/acme/status/status` in the App Area); in Public it is applied for as
  written, and the Site settles a collision when the Module is enabled ([Addresses are granted, not
  owned](#addresses-are-granted-not-owned)). A path is exact or has one whole-segment parameter
  (`/incidents/:slug`), which reaches `loadTree` as `params`.
- `landingPage: true` on a Public route at `/` offers the Page as the Area's landing; it is an offer and
  not a claim ([MODULES.md](./MODULES.md#who-owns-an-address)).
- `title` is the Page's name in the Builder's Page tree and in link pickers, and its document title
  where the tree's `page.pageMeta` names none; it is translated through the Site-scoped path. A
  description, or a title label of its own, the tree returns through `pageMeta`
  ([NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md#page-metadata-indexing-and-sitemap)).
  `defaultPageFlags` sets the `PhiCmsFlags` a Page of this route starts with -- `NoIndex` keeps it out
  of the sitemap and the index. It is copied onto the Page when the route is instantiated; once the Site
  changes it, the record answers and the descriptor is not consulted again.
- `navigation` optionally places an entry that names this route by `routePresetKey`
  ([section 8a](#8a-what-a-module-package-exports), Navigation). An entry names a preset, never a path.
- `loadTree` returns the Page tree. Import the builder lazily, as below: the descriptors go into every
  request's route table, the tree is needed only for the Page being drawn. The catalog checks what it
  returns -- every id a preset id, every parent and Region root present, no id twice.
- `presetVersion` is a positive integer. It is recorded on a Page built from the preset as its source
  version, and the Revisions table uses it to tell a saved copy that it was made from an older preset. It
  takes no part in ids, and a Page nobody has saved always draws the installed tree, so a changed tree
  needs no bump to appear. Start at `1`, and raise it when a release of your package changes the
  preset in a way a saved copy should hear about -- a Region, Layout or Widget added, removed or
  re-keyed. That is what lets the Revisions table tell an author their saved Page is behind. (The
  Modules that ship inside `@phis/ui` keep theirs at `1` until phis reaches v1; that rule is for this
  repository, not for your package, whose users already hold saved copies.)

### The tree builder

A Page tree (`PhiResolvedCmsPageTree`) is the Page, its Regions, and the Layouts and Widgets inside them.
It is built along one path ([MODULES.md](./MODULES.md#descriptor-identity-and-instantiation)):

1. State the identity once: `{ domain: "page", ownerModuleId, presetKey }`.
2. Turn the node keys into ids with `createPhiPresetCmsInstanceIdMap(identity, nodeKeys)` from
   `@phis/ui/types`. Each id is a hash of the identity and the key, so it is the same in every release, on
   every Site, and on the server side; a key listed twice throws. Two Pages built by one function differ by
   `presetKey`, and so get different nodes from the same keys.
3. Build the nodes with `createPhiCmsPresetNodes(page)` from `@phis/ui/helpers`. Handed the Page row
   `loadTree` received, it returns `page`, `region`, `layout`, `widget`, `stack`, `overlay` and `dialog`,
   and fills in what every node of a Page repeats -- Site, visibility mask, status, flags, and a
   `sortOrder` that follows `slotIndex` unless given.

What the tree contains:

- **Regions** are the Page-owned zones of the shell: `PhiCmsRegionType.Content`, `SiderRight`, `Hero`,
  `HeaderBottom`, `FooterTop`, `Drawer` ([CMS.md](./CMS.md#the-cms-tree)). A Region carries a synthetic
  **negative** `id` the builder picks, unique among the package's presets, a `regionType`, its
  `rootLayoutNodeId`, a `sortOrder`, and `config`: geometry such as `maxSize` and `margin`, and behaviour as
  `PhiCmsFlags` bits in `config.flags` -- `Sticky` keeps a Sider in view under the Header, with
  `offsetTop` as the air between them ([LAYOUTING.md](./LAYOUTING.md), [SHELL.md](./SHELL.md)). A Region
  never holds a Widget directly.
- **Layouts** by `typeKey`: `content` as a Region's root, `flex-vertical` for a stack, `flex` for a row,
  `grid` and the rest of Core's families. `parentLayoutNodeId: null` marks a Region root; every other
  node names its parent and its `slotIndex`, and a slot holds one child. For Core's families give
  `creationPreset` (`{ layoutKind: "verticalflex", preset: "panel" }`, `{ layoutKind: "flex", preset:
  "panel" }`), which selects their starting values; for your own Layouts leave it out
  ([section 4a](#4a-add-a-layout)).
- **Widgets** by `typeKey`, with `config` checked against Core's placement types
  ([section 4b](#4b-place-core-widgets)). There is no heading Widget: a heading is Markdown (`#`).
- **Copy** the tree writes into a Widget -- a Button's label, a Markdown heading -- is the Module's own
  text. A Widget translates its config text from the Site's source language, and a Site written in German
  would read the Module's English as German and never translate it. Read such copy from a Module Label Set
  in `runtime.locale.current` while building the tree, and set `PhiCmsFlags.NoTranslate` on the node
  (`flags`): the text is then already in the reader's language. A Page title is the route's `title` and
  needs neither.

### Links are references, never paths

A Page is linked by what it is, not where it currently answers. `createPhiPageReference({ kind:
"module", ownerModuleId, presetKey })` from `@phis/ui/references` builds the reference; a Site Page is
`{ kind: "site", pageScopeId }`, and the Public base's own Pages are in `PHI_PUBLIC_BASE_PAGE_REFERENCES`
(`contact`, ...). A Widget link carries it as `linkTarget: { kind: "page", reference }`; Markdown carries
it as a `phis:page/...` URI, which `createPhiPageUri(reference)` writes. Both are resolved on the server
per render, to the address the Site assigned, namespace and locale included
([REFERENCES.md](./REFERENCES.md)). A root-relative link such as `/status/incidents` is not a second
way in: the Markdown Widget drops it and renders the text alone, and a link target refuses it on write.
A link made outside the Site -- a payment return address, a link in a mail -- is the one place an
Add-on writes a path; see [Paths the Add-on writes into links](#paths-the-add-on-writes-into-links).

### Distances, colours and corners come from the Theme

A preset never states a look of its own: every distance, colour role and corner in its configs is a
reference the Theme resolves per Site and per mode. `@phis/ui/theme` exports them by their Phi name:

- `PHI_SPACE` -- the one spacing scale (`xxs`, `xs`, `sm`, `base`, `md`, `lg`, `xl`, `xxl`; 3 to 144 px in
  the default Theme, `THEME.md` "Phi scale") for every `padding`, `paddingLeft` ..., `gap` and `offsetTop`.
  It is what the Inspector offers, so an author opening the page sees `md`, not a number.
- `PHI_COLOR` -- colour roles that follow the Theme and the mode: the primary ladder (`primaryBg` ...
  `primaryTextActive`), the text ladder, grounds, fills and borders, the states, and the palette's ten custom
  colours (`custom1` ... `custom10`) -- for example the stop a card picture fades into, or a band's quiet
  tint.
- `PHI_RADIUS` -- corners, where a Surface states its own.

What they resolve to is the adapter's business. A preset that spells it out -- `"var(--ant-padding-lg)"`,
`"var(--ant-color-bg-container)"` -- hides which step it took and breaks the day the adapter changes; Core
refuses it in its own presets (`scripts/validate-preset-theme-vocabulary.mjs`), and a package keeps to the same rule.
`PHI_PADDING` holds the scale as plain numbers; it is for arithmetic, and a preset that writes
`${PHI_PADDING.md}px` freezes the default Theme's value instead of following the Site's.

The same goes for the rest of a look: a Button takes the Theme's gradient by slot (`variant: "gradient"`,
`gradient: "gradient1"`), a Surface its tone (`tone: "dark"`), its ground per mode
(`background`, `backgroundDark`) and its pane strength (`filter: "clear" | "glass" | "haze"`)
([LAYOUTING.md](./LAYOUTING.md)). Literal colours belong in a Theme block ([section 5](#5-add-a-theme-preset)) or
in a picture's own Overlay, where they describe that picture and not the Site.

```ts
import { PHI_COLOR, PHI_SPACE } from "@phis/ui/theme";

nodes.layout({
  typeKey: "flex-vertical",
  /* ... */
  /* The Page column of section 6b: the section gap, and no padding of its own. */
  config: { gap: PHI_SPACE.md, anchor: { horizontal: "left", vertical: "top" } },
});
const fade = {
  kind: "color",
  opacity: 0.85,
  ink: { kind: "gradient", direction: "180deg", stops: [
    { color: "transparent", percent: 40 },
    { color: PHI_COLOR.bgContainer, percent: 100 },
  ] },
};
```

### Example

Two Public Pages of the Status Module from [section 1](#1-define-stable-ids): an overview with an
introduction, a button to the incident log and a sticky note in the right Sider, and the log itself.

```ts
// presets.ts
import { PhiCmsFlags } from "@phis/ui/constants";
import { createPhiPageReference } from "@phis/ui/references";
import type { PhiCmsRoutePresetDescriptor } from "@phis/ui/types";
import { STATUS_MODULE_ID } from "./ids";

export const STATUS_OVERVIEW_ROUTE_PRESET_KEY = "status-overview";
export const STATUS_INCIDENTS_ROUTE_PRESET_KEY = "status-incidents";

/** The incident log, named by identity: the same value wherever it is linked from. */
export const STATUS_INCIDENTS_PAGE = createPhiPageReference({
  kind: "module",
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: STATUS_INCIDENTS_ROUTE_PRESET_KEY,
});

export const STATUS_ROUTES = [{
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: STATUS_OVERVIEW_ROUTE_PRESET_KEY,
  presetVersion: 1,
  area: "public",
  path: "/status",
  title: "Status",
  loadTree: ({ page }) => import("./pages/overview-page-tree")
    .then((module) => module.buildStatusOverviewPageTree({ page })),
}, {
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: STATUS_INCIDENTS_ROUTE_PRESET_KEY,
  presetVersion: 1,
  area: "public",
  path: "/status/incidents",
  title: "Incidents",
  defaultPageFlags: PhiCmsFlags.NoIndex,
  loadTree: ({ page }) => import("./pages/incidents-page-tree")
    .then((module) => module.buildStatusIncidentsPageTree({ page })),
}] satisfies readonly PhiCmsRoutePresetDescriptor[];
```

```ts
// pages/overview-page-tree.ts
import { PhiCmsFlags, PhiCmsPageType, PhiCmsRegionType } from "@phis/ui/constants";
import { createPhiCmsPresetNodes } from "@phis/ui/helpers";
import { createPhiPageUri } from "@phis/ui/references";
import {
  createPhiPresetCmsInstanceIdMap,
  type PhiCmsPageNode,
  type PhiResolvedCmsPageTree,
} from "@phis/ui/types";
import { STATUS_MODULE_ID } from "../ids";
import { STATUS_INCIDENTS_PAGE, STATUS_OVERVIEW_ROUTE_PRESET_KEY } from "../presets";

/** Synthetic Region ids: negative, and unique among this package's presets. */
const REGION_IDS = { content: -710, siderRight: -711 } as const;

const IDENTITY = {
  domain: "page",
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: STATUS_OVERVIEW_ROUTE_PRESET_KEY,
} as const;

const LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(IDENTITY, ["content", "stack", "actions", "sider"]);
const WIDGET_IDS = createPhiPresetCmsInstanceIdMap(IDENTITY, ["intro", "incidents", "siderNote"]);

export function buildStatusOverviewPageTree({ page }: { page: PhiCmsPageNode }): PhiResolvedCmsPageTree {
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    regions: [
      nodes.region({
        id: REGION_IDS.content,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: LAYOUT_IDS.content,
        sortOrder: 30,
        config: { maxSize: { width: 860 }, margin: "0 auto" },
      }),
      // Optional: stays in view under the Header while the content scrolls.
      nodes.region({
        id: REGION_IDS.siderRight,
        regionType: PhiCmsRegionType.SiderRight,
        rootLayoutNodeId: LAYOUT_IDS.sider,
        sortOrder: 40,
        config: { flags: PhiCmsFlags.Sticky, offsetTop: 16 },
      }),
    ],
    layoutNodes: [
      nodes.layout({
        typeKey: "content",
        id: LAYOUT_IDS.content,
        parentLayoutNodeId: null,
        slotIndex: 0,
        label: "status page",
        config: {},
      }),
      nodes.layout({
        typeKey: "flex-vertical",
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        id: LAYOUT_IDS.stack,
        parentLayoutNodeId: LAYOUT_IDS.content,
        slotIndex: 0,
        label: "status sections",
        config: { anchor: { horizontal: "left", vertical: "top" } },
      }),
      nodes.layout({
        typeKey: "flex",
        creationPreset: { layoutKind: "flex", preset: "panel" },
        id: LAYOUT_IDS.actions,
        parentLayoutNodeId: LAYOUT_IDS.stack,
        slotIndex: 1,
        label: "status actions",
        config: { padding: 0 },
      }),
      nodes.layout({
        typeKey: "flex-vertical",
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        id: LAYOUT_IDS.sider,
        parentLayoutNodeId: null,
        slotIndex: 0,
        label: "status sider",
        config: {},
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "markdown",
        id: WIDGET_IDS.intro,
        parentLayoutNodeId: LAYOUT_IDS.stack,
        slotIndex: 0,
        label: "status intro",
        config: { sourceMode: "inline", markdown: "# Service status\n\nAll systems are operational." },
      }),
      nodes.widget({
        typeKey: "button",
        id: WIDGET_IDS.incidents,
        parentLayoutNodeId: LAYOUT_IDS.actions,
        slotIndex: 0,
        label: "status incidents button",
        config: {
          key: "incidents",
          label: "Past incidents",
          variant: "primary",
          linkTarget: { kind: "page", reference: STATUS_INCIDENTS_PAGE },
        },
      }),
      nodes.widget({
        typeKey: "markdown",
        id: WIDGET_IDS.siderNote,
        parentLayoutNodeId: LAYOUT_IDS.sider,
        slotIndex: 0,
        label: "status sider note",
        config: {
          sourceMode: "inline",
          markdown: `Something wrong? See the [incident log](${createPhiPageUri(STATUS_INCIDENTS_PAGE)}).`,
        },
      }),
    ],
  };
}
```

`pages/incidents-page-tree.ts` is built the same way under its own identity. The labels are the nodes'
names in the Builder's structure tree, not visible copy. `@phis/example` shows the smallest form of the
same thing: one landing offered for the Public root, one Content Region with one Markdown Widget, built
node by node with `buildPhiCmsLayoutNode` and `buildPhiCmsWidgetNode`.

### From package to answering route

1. **Contribute** the descriptors as `routes` on the catalog entry ([section 7](#7-export-the-server-contributions)).
2. **Build** the package (`tsc` to `dist`, [section 8b](#8b-how-the-package-is-built)). A Site reads the
   package's `exports`, which point into `dist`: a source change it has not been rebuilt for does not reach
   the Site.
3. **Install** it into the Site: `phis module add --site <site key> --package <@scope/name> [--spec
   <version or workspace:*>] [--path <site root>]`, then rebuild the Site ([section 9](#9-install-without-patching-the-skeleton)).
4. **Activate** the Module for the Area in the Builder and publish that module change. Installing enables
   nothing, and a third-party Module is in no Area's default selection
   ([MODULES.md](./MODULES.md#when-a-modules-page-actually-appears)). In Public, enabling checks the
   declared paths and asks for another address where one is taken.
5. **Request** the path. The route and its navigation entry are computed per request from the active
   catalog, so they need no publish of their own, and the Page renders straight from the preset. A Draft
   exists only once an author edits and saves the Page, and its published copy answers once it is
   published; neither follows later changes to the preset, while an untouched Page always draws the
   installed one.

## 6b. Laying out a Page

A Page is assembled from the Layouts and Widgets phis-ui already has, set through their config. A preset
never draws its own structure: no Layout of its own for arranging, no wrapper, no CSS, no literal size. If
the existing Layouts cannot express a Page, that is a gap to raise ([AGENTS.md](./AGENTS.md), "A missing
piece is asked for"), not something to build beside them. This section is what every Page preset follows,
whoever writes it -- a person or an agent -- so that the Pages of a Site, and the Sites of an installation,
are built alike.

### The skeleton

Every Page has the same three levels in its `content` Region:

1. **Region** `content`: the Page's edge. It carries the only outer inset and the reading width
   (`maxSize`, centred with `margin: "0 auto"`). Nothing inside it adds a second edge. A Page that brings its
   own `content` Region replaces the Area's, padding included, so it states `padding: PHI_SPACE.md` itself.
2. **Page column**: one `flex-vertical` under the Region's `content` Layout, `padding` none, `gap` the
   section role. Its slots are the sections, top to bottom.
3. **Sections**: each slot of the column holds one Widget or one Layout. A section that needs columns uses
   `grid`, two cards side by side use `split-card`, a row of buttons uses `flex`, a section of its own
   rows a `flex-vertical` again. The Page column itself stays one vertical stack.

### Spacing roles

Every distance on a Page is one of four roles, and every role is one step of `PHI_SPACE`
([section 6a](#distances-colours-and-corners-come-from-the-theme)). A preset names the step, never a number,
never a CSS string, never `clamp()`:

| Role | Where | Step |
| --- | --- | --- |
| Page edge | `padding` of the Region `content` | `md` |
| Between sections | `gap` of the Page column | `md` |
| Inside a surface | `padding` of a Layout that carries a Surface -- a band, a card, a Split Card | `md` |
| Inside a section | `gap` of a section's own Layout: heading to content, card to card, button to button | `sm`, the Layout default: leave it unset |

A Layout without a Surface has no padding: it only arranges. Padding belongs to a thing whose edge one
can see.

- **No nesting of insets.** A surface inside a surface does not add its padding to its parent's. A Split
  Card's slot holds its Widget directly; a code block is a Markdown fence and brings its own ground, so it
  needs no Layout with a dark Surface around it.
- **Emphasis is the author's.** A preset or an agent stays at `md` and below. A larger step -- `lg` and up --
  is a deliberate emphasis, and choosing it is the author's decision in the Builder's Paddings panel, on
  that Page. A section that should stand out in a preset takes another Surface (a tone, a wash, a
  gradient), not a larger distance.
- The one fixed exception is a Hero that content reaches into, below.

### The Page's Regions

`content` is one of the Regions a Page owns. The others are the Page's too, and follow the same roles:

| Region | What goes there | Spacing |
| --- | --- | --- |
| `hero` | The Page's opening: its title, one or two sentences, its ways on, a picture or a ground. Only where the Page opens with a statement, and one per Page. | Its root Layout carries the Surface and `padding` `md`. The Shell adds the Header bands' height above it ([SHELL.md](./SHELL.md), "Hero at the top"); never pad for them yourself. |
| `header_bottom` | A band under the Header that belongs to this Page: a breadcrumb, a sub-navigation, a notice. Not a second title. | `paddingLeft`/`paddingRight` `sm`, nothing above or below. |
| `sider_right` | What accompanies the text: a table of contents, related links. | `padding` none; the Region's `offsetTop` keeps it below the Header. |
| `footer_top` | The Page's closing, when it is not a section of the content: a call to action, a newsletter. | Like a section with a Surface: `padding` `md`. |

`header_top`, `header_main`, `footer_main` and `footer_bottom` are the Area's, shared by every Page of it.
A Page preset never places anything in them.

### Content reaching into the Hero

To let the first boxes of the content -- cards, a form -- stand on the lower part of the Hero, set
`heroOverlap` on the `content` Region to a step of `PHI_SPACE`, usually `lg` ([SHELL.md](./SHELL.md),
"Content reaching into the Hero"). The Hero does not make room for it on its own: its root Layout takes a
`paddingBottom` one step above the overlap, so its words end above the boxes. This is the one place a
preset uses a step above `md`, and only together with `heroOverlap`.

### Checking a Page preset

`checkPhiPagePresetLayout(tree)` (`@phis/ui/helpers`) reads a tree a route preset builds and returns what
breaks this section: a distance that is not a `PHI_SPACE` step, a step above `md` outside a Hero's bottom
beside `heroOverlap`, padding on a Layout without a Surface (and a Grid that keeps its default inset), a
content Region without the `md` edge, and a Page column that is not one `flex-vertical`. A package runs it
over every route preset in its own verify step and fails on a finding.

It is for presets only. A Page an author edits in the Builder is never checked against it: the Inspector
offers the scale, and a value off it is the author's choice and is saved as it is.

### Checklist for a Page preset

- One `flex-vertical` Page column under `content`, `padding` none, `gap` `PHI_SPACE.md`.
- Every `padding` and `gap` is a `PHI_SPACE` step; none is a string, a number or a `clamp()`.
- Padding only on a Layout with a Surface, at `md`; the Region's edge is not repeated inside it.
- No Layout whose only job is to give one Widget a background.
- The reading width comes from the Region's `maxSize`, never from padding.
- A Hero only with a ground of its own; `heroOverlap` always with the Hero's larger `paddingBottom`.
- Nothing in the Area's Regions.

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

- `definePhiModuleDefinitions` rejects a duplicate Module id. A definition names no Area
  (`PhiModuleDefinition`); `package.json#phis` does.
- `definePhiModuleServerContributions` checks where the package is built that each `moduleId` matches
  its definition. Whether every Area-addressed descriptor (route, shell, overlay, navigation injection)
  addresses an Area the Module serves is checked where the Areas are known: when the generated projection
  completes the definition, at the Site's build.
- A contribution never names an Area. `phis module` reads the package's `phis` block and generates a
  projection that hands each Module's Areas to `collectPhiSiteModuleServerAreaContributions`
  (`@phis/ui/module/projection`), which completes the definition and places the Module into them; each
  Area catalog keeps the descriptors addressed to it. A package installed but not declared is refused
  there by name.
- `createPhiNextCmsSiteBridge` validates the combined catalog with `assertPhiRuntimeModuleCatalog`, so
  invalid ownership, missing loaders, unsupported render policies, or malformed signal metadata fail at
  Site assembly.

Routes, Area shells, overlays, navigation injections, and Themes are descriptors on the same catalog
entry ([MODULES.md](./MODULES.md#descriptor-identity-and-instantiation)); a route and the tree it draws
are [section 6a](#6a-pages-a-module-brings). Modules never create physical
Next.js routes. Outside Public, a route answers under its package: `/orders` in `@acme/shop` is served
at `/acme/shop/orders` -- the scope loses its `@`, and the module key is not part of it. Public carries no
namespace, and `/` is an application for the Area root slot. A Settings page is placed by its navigation
entry's `anchor: "settings"` (section 8a, Navigation); there is no route mount. A Module references its own Pages
through `(ownerModuleId, presetKey)`, never through a literal path.

### Cards on a Dashboard

A Module puts cards on an Area's Dashboard with `dashboardCards` on the same catalog entry
([DASHBOARD.md](./DASHBOARD.md)):

```ts
dashboardCards: {
  areas: ["app"],
  load: () => import("./cards").then((module) => module.STATUS_DASHBOARD_CARDS),
},
```

- `areas` is the Dashboards the cards belong on, a non-empty subset of the Module's `eligibleAreas`; the
  catalog refuses anything else, and an Area not named never loads the provider. Do not answer the same
  question again in `listCards` with `context.area`.
- The provider and everything it needs come from `@phis/ui/module/dashboard-cards`, a Server-only door:
  the card types, `createPhiDashboardCardId` (`<moduleId>/cards/<leaf>`; a card outside the Module's own
  namespace is refused) and `fetchPhiSiteApi` for the question to Core. A card about the viewer asks with
  `context.cookieHeader`.
- `target` names the Module's own route preset, and `accessPolicy` keeps the card from a viewer who may
  not see it.
- Cards that draw on the same answer share one read: wrap the fetch in
  `definePhiDashboardCardRead(load)` from the same door and call the result from each card. The list
  resolves its cards in a Route Handler, outside a render, so `React.cache` does not reach them; what they
  share is the card context, which the list resolves once and hands to every card, and the read is keyed
  by that object. The cards of one Dashboard make one call; a card refreshed through its endpoint gets a
  fresh context and so a fresh read ([DASHBOARD.md](./DASHBOARD.md)). Four cards each fetching the same
  figures is per-request fan-out.

### Records a Page is about

A Page about one thing of the Module's -- a product, an event -- reads it through a `record` Provider
([MODULES.md](./MODULES.md#record-providers)), so the record is in the HTML and the Page can answer 404:

```ts
// definition.ts: the descriptor, with the parameters a binding carries
dataProviders: [{
  key: SHOP_PRODUCT_RECORD_KEY, ownerModuleId: SHOP_MODULE_ID, kind: "record",
  executionMode: "live", authoringMode: "none", title: "Product",
  settingsFields: [{ key: "slug", type: "string", label: "Address" }],
}],

// server.ts: the server half, on the same catalog entry as dashboardCards
recordProviders: [{
  key: SHOP_PRODUCT_RECORD_KEY,
  load: () => import("./product-record").then((module) => module.resolveProduct),
}],
```

- Everything comes from `@phis/ui/module/records`, a Server-only door: the resolver types,
  `fetchPhiSiteApi` for the question to Core, `resolvePhiRecordSource` for the Module's Server Widgets, and
  `PhiWidgetFailureServer` for the Widget whose read comes back `unavailable`
  ([Reading a config](#reading-a-config)).
- The Widget's parser reads the binding with `readPhiRuntimeDataProviderBinding` from `@phis/ui/types` and
  insists it names the Module's own record Provider.
- The resolver answers the record or `null` for "no such record", and throws where it cannot ask.
- A Widget's config carries the binding, `{ providerKey, params: { slug } }`; the route's tree writes the
  route's parameter into it. The Widget reads it with `resolvePhiRecordSource({ registry, runtime, binding })`
  -- `registry` is in its render arguments -- and every Widget bound to the same record shares one read.

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
  `calendarAdapters` in the definition, keyed `<owner>/calendars/<key>`. An Area holds the adapters of
  the packages its generated Client file imports, which are the packages with a Module for that Area.
- The door is imported only into the generated Client files of the Areas the package's Modules serve.
  Keep it a list of `next/dynamic` loaders and small constants: whatever it reaches statically is paid
  on every page of those Areas.
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
Widgets passes `createPhiAuthoringWidgetModule([])`. `collectPhiSiteModuleAuthoringContributions` refuses a
declared Module without an Authoring contribution, so the mistake surfaces where the Site is composed.

Public calendar values are serializable adapter-neutral records from `@phis/ui/types`. Do not persist or
signal `Date`, Dayjs, Luxon, Temporal, or adapter-private objects. Scalar `date` and `time` signals carry
`YYYY-MM-DD` and `HH:mm[:ss[.fraction]]` strings; calendar-aware selections, ranges, and events use
`json` with a package-namespaced value schema. Core owns the Gregorian adapter and the Date Input
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
is keyed by Module id, because one package may carry several Modules. No generated file imports the
root: the projections read the Areas from `package.json#phis` and everything else from the other doors.
`phiModuleDefinitions` stays the package's own list of its Modules, for its tools and tests.

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

**Navigation.** Place a sidebar entry by role, not by somebody's item key: `anchor: "start"` (top of the
sidebar), `"main"` (the body, ahead of Settings), `"settings"` (inside the Area's Settings container), or
`"end"` (the very bottom). Each Area decides
where its anchors are, and one it does not declare -- `settings` in an Area without a Settings container
-- is refused. The entry is `{ navKey: "<area>:sidebar", anchor, item }`, with no `parentItemKey`.
Entries sharing an anchor, and an injection that names neither an anchor nor an item, are ordered by
`ownerModuleId`, `presetKey`, and `itemKey`; the Site reorders from there.
The older keyed form still compiles: `before`, `after`, and `parentItemKey` must point at an item the
surface exports through `exportedItemKeys` or at one the Module injects itself, and are the only way
into a surface without anchors, such as `<area>:account`.

A surface without anchors -- the Public header and footer, App's header, footer and quick links, every
`<area>:account` -- takes the keyed form. The Public footer's Quick Links read `public:footer`, so an
entry there is one more item in the route's `navigation`:

```ts
navigation: [
  { navKey: "public:header", parentItemKey: null, item: { itemKey: "@acme/site/nav/public/about",
    label: { defaultMessage: "About us" }, routePresetKey: "acme-about-page" } },
  { navKey: "public:footer", parentItemKey: null, after: "@phis/ui/modules/public/nav/terms",
    item: { itemKey: "@acme/site/nav/public/footer/about", label: { defaultMessage: "About us" },
      routePresetKey: "acme-about-page" } },
  { navKey: "public:footer", parentItemKey: null, after: "@acme/site/nav/public/footer/about",
    item: { itemKey: "@acme/site/nav/public/footer/github", label: { defaultMessage: "GitHub" },
      icon: "antd:github", target: { kind: "external", href: "https://github.com/acme", newTab: true } } },
],
```

An entry that leads out of the Site names `target: { kind: "external", href, newTab? }` instead of a
`routePresetKey` or an Overlay, never beside one. Only `https:` is accepted; the catalog refuses anything
else when it is compiled. It rides on any of the Module's routes -- the one it belongs beside -- renders
like a link the Site added in the Builder (`newTab` opens it with `rel="noreferrer noopener"`), and is
shown there as external and from your Module, so the Site can hide it.

Which surfaces each Area declares, and which Widget draws each, is the table in
[MODULES.md](./MODULES.md#navigation-surfaces). An entry is computed per request; it never needs a
database row, and a navigation the Site has saved in the Builder does not hide it.

## 8b. How the package is built

A Module package ships compiled. `dist` holds transpiled ESM with `"use client"` intact, `.d.ts` beside
each file, and copied assets (CSS, fonts, pictures). Use `tsc`, not a bundler: `tsc` emits one file per
source file and leaves the directive and the bare imports of `react` and `@phis/ui` alone, while bundlers
tend to drop the directive and inline peer dependencies. `@phis/example`'s `build` script is
`tsc -p tsconfig.build.json` plus copying its font and picture files.

**Node types are the package's own, and only for server code.** `@phis/ui` points its doors at sources,
so a package compiles what a door reaches. The data doors -- `types`, `constants`, `helpers`, `theme`,
`controls`, `forms`, `layouts`, `navigation`, `module`, `cms/plugins` and the like -- reach no Node API and
no stylesheet, and `validate-module-dependency-direction` keeps it so; a package that only uses them needs
neither Node types nor CSS declarations. The server doors -- `module/labels`, `server-helpers`, `net` --
are server code and reach Node: the credentials reader takes `node:fs`. A package that imports one of them
runs on Node and says so: `@types/node` in its `devDependencies` and `"types": ["node"]` in its
`tsconfig.json`. `@phis/ui` does not hand Node's globals to a package whose
client code has no use for them.

`phis module check` inspects the installed package without loading it
(`phis-server/src/cli/module-package.mts`):

- `.`, `./server`, `./client`, and `./authoring-client` are exported and point at existing files;
- `./client` and `./authoring-client` begin with `"use client"`; `.` and `./server` do not;
- `react` and `@phis/ui` are not ordinary dependencies, and the package carries no copy of its own;
- a package that ships CSS states CSS side effects;
- the `./server` graph takes no Client component
  ([What a Server half may import](#what-a-server-half-may-import));
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
as described in [phis-server AUTHORIZATION.md, "Add-on roles"](https://github.com/phis-dev/phis-server/blob/main/AUTHORIZATION.md#5-add-on-roles).

## 8d. Icons a Module brings

A preset or a Widget config names an icon for `PhiIcon`. The bundled `antd:` set covers what the house
uses; a mark it lacks is the Module's to bring, not the core registry's to grow. A Module registers its
icons on its **definition**, as plain data it bundles itself -- not on the Client door:

```ts
// icons.ts
import { definePhiModuleIcons } from "@phis/ui/module";
import ProductOutlined from "@ant-design/icons-svg/es/asn/ProductOutlined"; // needs the dependency

export const STATUS_MODULE_ICONS = definePhiModuleIcons([
  { name: "product", label: "Product", drawing: ProductOutlined },
  {
    name: "beacon",
    label: "Beacon",
    drawing: { viewBox: "0 0 24 24", paths: ["M12 2a10 10 0 100 20 10 10 0 000-20z"] },
  },
]);

// definition.ts:  icons: STATUS_MODULE_ICONS,
// ids.ts:         export const STATUS_PRODUCT_ICON = createPhiModuleIconName(STATUS_MODULE_ID, "product");
```

- A drawing is a `viewBox`, one or more path strings and an optional `fillRule`, filled with
  `currentColor` so it follows the Theme and the colour a Widget gives its icon. An
  `@ant-design/icons-svg` outline or filled definition is read into one by `definePhiModuleIcons`, so an
  Ant Design icon the core lacks is one import -- if the package depends on `@ant-design/icons-svg`;
  copying the path data in as the Module's own drawing is equally fine. A two-tone definition, or one
  holding anything but `<path>`s, is refused. Nothing is fetched: an `iconify:` icon stays a Builder
  choice and is refused in presets.
- A name is one lower-case kebab segment, unique within the Module; `definePhiModuleIcons` refuses a
  duplicate or a malformed name where the package is written, and the catalog refuses the same again.
  The `label` is what the Builder's icon picker shows.
- The icon is named `module:<moduleId>/<name>` -- `module:@phis/dev/modules/site/product`. `PhiIcon`
  cuts the namespace at the first `:` and the icon name after the last `/`, so a scoped module id reads
  unambiguously. Write it with `createPhiModuleIconName` from `@phis/ui/constants`, which throws on a
  part the grammar refuses, and use the constant in presets, Widget configs and Client code alike.
- **It resolves where the Module is active.** The definition reaches the browser the way `videoProviders`
  do: the Area's root Layout hands the active Modules' icons to the Area as props, and the Builder hands
  the target Area's to its canvas and Inspector. On a live page a name whose Module is not active there
  draws nothing; in the Builder it draws a warning mark with the name as its title. So a preset names its
  own Module's icons, never another package's, and the Module's own `icon` -- the mark the Modules list
  shows for Modules that are not active -- stays an `antd:` name.
- The Builder's icon picker lists the active Modules' icons below the bundled set, one group per Module
  under its title.
- Every page of an Area carries its active Modules' icons in its payload. Register the marks the Module
  uses, not a library.

## 9. Install without patching the Skeleton

Installing a Module never adds or rewrites Skeleton source. `phis module` records the installation and
generates a projection, which the Skeleton hands to the generic hosts from the files under
`src/runtime-modules/` -- each Area host, each Area's Client boundary, and the root. Those files do not
change when a Module is installed or removed; placement by the declared `eligibleAreas`, collision
checks, and the Builder's union across Areas stay in `@phis/ui`.

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

The projection is generated files, written together: `src/generated/site-modules.ts` (Server), one
`site-modules-client-<area>.ts` per Area, `site-modules-authoring-client.ts`, and
`site-modules-fonts.ts`. All of them are read from each package's manifest in the Site's `node_modules`,
because nothing may run the package to ask: the Areas from its `phis` block decide which Area files
import its Client door and are handed to the projection as placements, and its `exports` decide whether
the fonts file imports `./fonts` -- that boundary calls `next/font/local` and throws outside a Next build.
A package the install has not brought in yet has neither answer: it stays in the Server file, the Site's
build refuses it by name, and `add` says to run `phis module sync` after installing what `--spec`
recorded. All files are preserved when the Skeleton is reconciled, so regenerating a Site does not
uninstall its Modules.

After installation, rebuild the Site. Installing never enables a Module: the Site selects it per Area
in the Builder, and only ids present in the build can be selected. If the package also carries an
Add-on half, install and enable the Add-on through `phis addon` ([phis-server
SERVER_ADDONS.md](https://github.com/phis-dev/phis-server/blob/main/SERVER_ADDONS.md)); Module activation never installs or enables it.

## 10. Access, server capabilities, and errors

- Apply `PhiViewerAccessPolicy` to Module, route, navigation, Widget, or Layout descriptors when needed.
- Third-party contributions may use Core roles or roles from their one bound Add-on provider.
- Site Admin retains the documented Core override; other Core and provider roles remain explicit.
- Unavailable server capabilities deactivate only the dependent Module and produce a scoped diagnostic.
- Missing Widget/Layout renderers remain localized to the affected CMS node.
- Do not catch contract failures and substitute a global registry or first-party implementation.

## 11. Remember what somebody decided

A dismissed card, how far a feed was read, where somebody got to in a guided sequence: your Module can
keep these per Site, against the account of the person looking. Declare what you keep on the Module:

```ts
// definition.ts
  userState: [
    { key: `${STATUS_MODULE_ID}/dismissed-banner`, shape: "flag" },
    { key: `${STATUS_MODULE_ID}/read-until`, shape: "marker" },
  ],
```

A key is `<module id>/<key>`, and **the prefix is the whole authorization**: Core admits a write when
an active Module of that Site owns the prefix and the session belongs to the person being written about.
Keys of a Module that is switched off are refused, and the state it already holds is kept and hidden
until it is switched on again.

The declaration itself travels nowhere -- unlike a route or a Widget type, Core never sees it. It is your
own account of what you store: it lets the browser refuse a malformed write before spending a round trip,
and it puts what your Module keeps where the next person reading your code will find it. An undeclared
key still works. Declare anyway.

Four shapes, and the choice is not cosmetic:

| Shape | Value | Use it for |
| --- | --- | --- |
| `flag` | one boolean | a dismissed card, a hint switched off |
| `marker` | one number that only moves forward | "read up to here" |
| `value` | one JSON object under a declared schema | a position in a sequence |
| `set` | a bounded list, oldest evicted, `limit` required | independent entries a marker cannot express |

**Reach for `marker` before `set`.** A reader who has seen everything up to Tuesday has read everything
before it, so one number answers what a growing list of ids answers only by growing -- and that list
travels with the row on every request that resolves a session. A marker also settles the case a set
cannot: it never moves backwards, so a second tab answering late cannot unread what somebody read.

Write from the browser:

```ts
import { writePhiUserState, clearPhiUserState } from "@phis/ui/runtime/user-state-client";

await writePhiUserState({ descriptor: DISMISSED_BANNER, value: true });
await clearPhiUserState(DISMISSED_BANNER.key);   // absent again, which is not the same as `false`
```

Read it while rendering, in an authenticated Area, with `getPhiUserState` from `@phis/ui/server-helpers` --
guarded by `runtime.viewer.access === "authenticated"`, and never on a Public page: those are rendered
once for every anonymous visitor, `cookies()` is empty there without saying so, and "nothing stored"
would be the answer for everybody. A Public surface that wants an account-bound fact loads it in the
browser after the page arrives ([STATIC_RENDERING.md](./STATIC_RENDERING.md)).

Two limits worth knowing before you design around them: your namespace is capped at 4096 serialized
bytes across all of your keys together, and a `set` at 256 entries. Both answer with a refusal rather
than by dropping something quietly.

**What does not belong here.** Anything your Module needs in order to work -- an order, a booking, a
submitted form -- belongs in your own storage with its own lifecycle. The test: if losing it would be a
support case rather than a small annoyance, it is not user state. And it is never a permission: a
signed-in person can write whatever they like into their own namespace, so nothing you read from here
may decide what somebody is allowed to do.

## 12. Add a place a video may come from

The Video Module ships YouTube and Vimeo. If your customer's videos live somewhere else, contribute a
provider instead of a second video Widget:

```ts
// definition.ts
  videoProviders: [
    {
      key: `${STATUS_MODULE_ID}/video-providers/wistia`,
      ownerModuleId: STATUS_MODULE_ID,
      title: "Wistia",
      recipient: "Wistia, Inc.",
      privacyUrl: "https://wistia.com/privacy",
      embedHostname: "fast.wistia.net",
      embedUrlTemplate: "https://fast.wistia.net/embed/iframe/{id}",
      embedParams: { autoPlay: "1", doNotTrack: "true" },
      idPattern: "^[A-Za-z0-9]{10}$",
      idExample: "26sk4fhlnn",
      addressPatterns: ["^https?://[a-z0-9-]+\\.wistia\\.com/medias/([A-Za-z0-9]{10})(?![A-Za-z0-9])"],
      aspectRatio: 16 / 9,
    },
  ],
```

A provider is data and nothing else: no Client loader, no component, no manifest entry. The descriptors
reach the browser as props, and the Video Widget offers yours beside the first-party ones -- a Site picks
Wistia from the provider field and enters an id.

Six rules the catalog enforces when it is built, so a wrong provider stops a build rather than misleading
a visitor:

- `recipient` names a **company**, not a domain, and `privacyUrl` is where that company explains itself.
  The placeholder shows both, and it is what the visitor decides on.
- `embedUrlTemplate` is `https`, carries `{id}` exactly once, and its host must **be** `embedHostname`.
  You cannot name one recipient and load from another.
- The template has no query of its own. What you always send goes in `embedParams`, as a list somebody can
  read -- and those keys become reserved: a Site's own playback parameters are refused where they collide,
  so `doNotTrack` cannot be switched off from an inspector field.
- `idPattern` is anchored at both ends and `idExample` is an id it accepts. The Widget stores a bare id, so
  something has to be able to say that a half-pasted share link is not one; the example is what the Builder
  shows the person who has to type one.
- Every address pattern starts with `^` and has exactly one capture group, which is the video. Addresses
  are not stored -- they are how a pasted link becomes an id -- but without the anchor a pattern reads an id
  out of the middle of somebody else's address.
- There is no "any address" provider, and there will not be one. A frame whose recipient cannot be named
  is a frame whose placeholder cannot tell the truth ([design/CONSENT.md](./design/CONSENT.md)).

Use the provider's privacy-friendlier host and parameters where it has them, the way the first-party
providers use `youtube-nocookie.com` and Vimeo's `dnt=1`. Read what they actually promise before you rely
on the name: `youtube-nocookie.com` is not cookie-free, it only keeps a view out of personalisation. Either
way it is data minimisation after the decision, never a reason to skip asking -- the request still leaves
for the provider and still discloses the page it comes from.

## Boundary checklist

- Server catalog files contain metadata and lazy imports, not Client components.
- Definition/config files are safe for both Server and Client imports. Transitively: a definition is
  reachable from Client code -- Label Sets bind to it, and the package's root door exports it -- so
  nothing its imports reach may be `server-only` or touch `next/headers`. Prefer the narrow
  `@phis/ui/module/*` entries over the `server-helpers` and `forms` barrels, which carry both.
- A Server file imports Form helpers from `@phis/ui/forms` and nothing Client from it; the Form Control,
  the provider registry and the Form Controller client are in `@phis/ui/forms/client`. A Module's Server
  door is reached by every route of the Site, so a Client value it reaches ships everywhere
  (`scripts/validate-server-contract-doors.mjs` keeps the doors a Server half reads free of them).
- A Widget's server half renders no Control, `PhiIcon` or other Client component itself; it draws plain
  HTML or hands a view model to its Render Client ([What a Server half may import](#what-a-server-half-may-import)).
- A live Widget client takes only types from its `config.ts`. The config module is the parser, with the
  block defaults merge behind it; a helper the client needs at runtime lives in a file of its own beside
  it (`scripts/validate-render-client-boundaries.mjs` checks first-party Widgets).
- `"use client"` appears only at executable Client, Controller, provider, and Authoring boundaries.
- Live Area manifests do not import Authoring modules.
- Public manifests cannot reach Builder/Admin/Editor implementations.
- The Builder Authoring manifest contains only the installed target-Area union.
- Module UI providers wrap only module-owned output and scope CSS and portals locally.
- No registry is populated by import side effects or mutable module globals.
- No database value is passed to an unrestricted dynamic import.
- Every persisted identity and provider key is package-namespaced and stable.
- A preset names bundled `antd:` icons or its own Module's `module:` icons, registered with
  `definePhiModuleIcons` and named with `createPhiModuleIconName`; never `iconify:`, `asset:` or another
  package's Module icon ([8d](#8d-icons-a-module-brings)).
- A preset names distances, colour roles and corners through `PHI_SPACE`, `PHI_COLOR` and `PHI_RADIUS`
  from `@phis/ui/theme`; it never spells out an adapter property such as `var(--ant-padding-lg)`.
- Controller fields and the `Controller` Client are either complete as one group or absent as one group.
- Every controllerless Module contributes at least one meaningful owned artifact and no no-op Controller.
- Widgets use Phi Controls, providers, signaling, and the shared Canvas scaffold contracts.
- A Widget's popups render in a portal; `getPopupContainer` never names a node inside the block.
- Server handlers revalidate Form input and enforce authorization independently of Client validation.
- No Public Widget's server half reads cookies, headers or the viewer, or renders a per-visitor value
  (token, nonce, timestamp, random value); those are loaded in the browser (STATIC_RENDERING.md).
- Module data a Public page must show without delay is loaded in the browser, not rendered on the server.
- User state is declared on the Module, keyed under its own id, read on the server only in an
  authenticated Area, and never read as a permission.
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
