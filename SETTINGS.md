# Settings Container Contract

This document defines the `@phis/ui` contract for Module configuration surfaces: the Area-owned Settings container, its routing and navigation shape, the shared Settings page
shell, and the Form basis every Settings section must use. Route compilation, mount injection,
module-derived path segments, and navigation overlays follow the central contracts in
[MODULES.md](./MODULES.md); access policies follow [ACCESS.md](./ACCESS.md).

## 1. Purpose and scope

The Settings container is the one place in an Area where Modules offer their configuration. It is an
additional, specialized contribution contract: it does not replace or restrict the ordinary Module
contributions (routes, navigation entries, Widgets, Layouts, Forms, Providers) defined in
[MODULES.md](./MODULES.md).

The boundary between the two is intent:

- **Configuration** — "how does the Module behave" — belongs in the Settings container.
- **Working surfaces** — "I work with the Module's data" — remain ordinary Module routes with their own
  navigation entries (for example Users, Locales, Logs, the Builder Media library, a Dashboard page).

A Module may have both, either, or neither. A Module without configuration simply does not appear in the
Settings container and loses nothing.

Whose configuration it is follows from the Area. In a staff Area the subject is the Site: how a Module
behaves for everyone who visits it. In the App Area the subject is the account of the person signed in --
their name, the language they read in, what the Site sends them, how it is presented to them. Both are
configuration in the sense above: both are decided once and stored, rather than held for the length of a
visit. What differs is only whose record is written, and the container treats them the same.

## 2. Routing

An Area that offers Module configuration declares exactly one Area-owned `settings` route mount. Modules
contribute Settings pages by opting into that mount, which is how their entry reaches the container
without the Module having to know the container's item key.

A Settings page addresses itself like any other route outside Public: under its own package.

```text
/<area>/<scope>/<package><the path the route declares>
```

`@phis/ui/modules/admin` declaring `/settings/general` in the Admin Area is therefore served at
`/admin/phis/ui/settings/general`, and the Auth Module's `/settings/authentication` at
`/admin/phis/ui/settings/authentication`.
Collisions between packages are impossible by construction, and the mount says nothing about the path -- it
places the navigation entry, nothing more.

Each mounted Settings route declares its own access policy. Access is enforced per route; the Settings
container itself adds no access of its own.

The container has no address of its own and no redirect. It is a navigation node whose children are
ordinary pages under their packages, so there is no `/settings` page to answer, and nothing to decide when
no child is visible: a container with no visible child hides, the way a navigation item with an unrouted
target hides.

## 3. Navigation

Settings navigation lives in the Area sidebar: the sidebar surface (`admin:sidebar`,
`builder:sidebar`) declares one exported "Settings" container item, and the `settings` route mount
(`routeMounts` in `plugins/runtime-modules/area-definitions.ts`) targets that surface with the container
as its `parentItemKey`. There is no separate `<area>:settings` navigation surface and no in-content Settings navigation.

The sidebar is rendered by the persistent Area shell (the root layout), which survives client-side
navigation between pages. This placement is deliberate and normative: per-path content (content
regions and header slot pages) remounts on navigation, so any Settings navigation presented there
re-renders visibly on every switch. Settings navigation must therefore stay in the persistent shell.

- The Settings container is a container item, not a link, and has no route behind it.
- It stands after every entry Modules contribute, by declaring `standing: "last"` on the surface item.
  An Area's own entries otherwise precede all contributed ones, which would put the one entry a person
  visits to change something above everything they came to work with -- and would send an Area root
  that forwards to the first visible entry into the Settings. It stays an ordinary exported anchor:
  a contribution placed `before` it stands ahead of everything held back to the end, and one placed
  `after` it ends the surface.
- The base Area Module's General page (section 5) is declared statically as the container's first
  child by the Area definition. All other Modules contribute their entries through the mount's
  navigation injection, ordered after the static items. Ordering is owned by the surface declaration
  and the injection contract; independent Modules never coordinate order among themselves.
- Entries are access-filtered per viewer with the route's access policy: a viewer who cannot reach a
  Settings route does not see its entry.
- Navigation overlays may reorder, reparent, or tombstone presentation items without changing effective
  routes, under the central navigation contract. Tombstoning the container hides its remaining subtree
  at runtime and retains it disabled in Builder navigation authoring.

## 4. The shared Settings page shell

Every mounted Settings page composes its tree through the one shared Settings page shell builder owned
by this package. Modules pass their content panels; they do not build Settings layout themselves. The
shell guarantees that all Settings pages of all Modules look and behave identically.

The shell (`buildPhiSettingsPageShellTree`, `components/regions/presets/phi-settings-page-shell-tree.ts`)
renders content only (navigation is the sidebar's job, section 3): the page content region roots on the
shared base page scaffold, which owns padding and background, and one Collapsible Layout fills its slot.
There is no page-level heading block above it — the page title is already in the header, and the panel
titles name the sections.

Each Settings panel is one Collapsible slot: the panel title is the slot title, an optional
description leads the panel, and the panel's sections (descriptor Forms, Tables, description blocks)
stack inside it. The Collapsible runs in accordion mode with the first panel open, so exactly one
panel is open at a time. A panel is one coherent unit of configuration; a Module
with more configuration takes further free slots rather than growing one panel. The Collapsible
Layout supports at most 12 slots ([LAYOUTING.md](./LAYOUTING.md)), which is therefore the per-page
budget; a Module exceeding it splits into multiple mounted pages.

Panels wrap their sections in a vertical Layout because a sequential Layout slot renders exactly one
child node, while a panel is a description and then what it is about, or several sections at once.

Each Form panel carries its own primary Save button: the shell states it as the Form Widget's `submit`
([FORMS.md](./FORMS.md)), so it is drawn in the control column under the inputs rather than placed as a
Button Widget in the slot below. Save is per panel; a shared page-level save action is not part of this
contract. A panel whose whole content is one switch states `submitOnChange` instead and carries no
button at all — flipping the switch is the submit, routed from the Form's own `stateChange` back to its
`submit` channel.

A panel may hand its Form what only this Site knows -- the languages it publishes, for one. That travels
in the Form Widget's placement config, where the options resolution reads it under the field's own
([FORMS.md](./FORMS.md)), so the list is in the HTML the Server sends. A panel whose save changes
something only the Server applies asks the runtime for the Page again on `reload/activate`
([SIGNALS.md](./SIGNALS.md)); the Form itself never navigates or reloads.

Cross-Module aggregation must never be built as in-page tabs or slot contributions; Modules always
switch via routes through the sidebar container.

## 5. The base Area Module's General page

The base Area Module contributes the Area's "General" Settings page through the same mount, the same
shell, and the same rules as every other Module — first-party and third-party Modules are treated
identically. The only distinction is position: the Area definition declares the General entry statically
as the first child of the sidebar's Settings container.

The Public Area has no Settings container. A visitor who has not signed in has no record to write to, so
what they prefer -- the theme they picked, the cookies they accepted -- stays in their browser, owned by
Widgets and Overlays with local persistence, and must not be modeled as Settings routes.

The line is drawn by where a value is kept, not by what it is about. The same theme choice, stored on the
account of somebody signed in, is configuration like any other: it survives the visit, it survives the
device, and it belongs in the App container with a Save of its own. A Widget may still offer the choice
outside the container -- that is how a guest makes it at all -- and writes the account only when there is
one to write.

## 6. Sections and the Form basis

Settings sections are built exclusively on the shared Form and control basis:

- Field sections use the Form descriptor stack ([FORMS.md](./FORMS.md)): a `PhiFormDescriptor` with a
  label set, provider-based validation, and submission through a registered handler Provider with
  `credentialPolicy: "site-session"`, relayed by the Site Form gateway.
- List- or collection-shaped configuration uses the generic Table/Collection contracts
  ([TABLES.md](./TABLES.md), [COLLECTIONS.md](./COLLECTIONS.md)).
- Hand-rolled `fetch` calls, ad-hoc antd forms, hardcoded copy, and per-surface envelope parsing are not
  permitted in Settings surfaces. All copy comes from label sets.

Secrets in Settings surfaces are write-only and follow the secret-handling rules of the owning server
contract (see [AUTHENTICATION.md](./AUTHENTICATION.md) section 8 for the Auth precedent).
