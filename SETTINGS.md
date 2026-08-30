# Settings Container Contract

This document defines the normative target-v1 `@phis/ui` contract for Module configuration
surfaces: the Area-owned Settings container, its routing and navigation shape, the shared Settings page
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

## 2. Routing

An Area that offers Module configuration declares exactly one Area-owned `settings` route mount with
base path `/settings`. Modules contribute Settings pages only by opting into that mount; a Settings
surface must not be registered as an absolute-path route.

The effective path of a mounted Settings page is built centrally as

```text
/settings/<module-segment><mount-relative path>
```

where the module segment is derived from the immutable Module id by the normal module-segment builder
(for example `@phis/ui/auth` → `phis+ui+auth`, as documented in
[AUTHENTICATION.md](./AUTHENTICATION.md)). Path collisions are therefore impossible by construction, and
a Module never chooses its own top-level Settings path.

Each mounted Settings route declares its own access policy. Access is enforced per route; the Settings
container itself adds no access of its own.

The container root `/settings` is not a content page. It resolves by redirecting to the first Settings
entry visible to the current viewer. If no entry is visible, the container is not reachable for that
viewer.

## 3. Navigation

Settings navigation lives in the Area sidebar: the sidebar declares one exported "Settings" container
item, and the `settings` route mount targets the sidebar surface with that container as its parent
item. There is no separate `<area>:settings` navigation surface and no in-content Settings navigation.

The sidebar is rendered by the persistent Area shell (the root layout), which survives client-side
navigation between pages. This placement is deliberate and normative: per-path content (content
regions and header slot pages) remounts on navigation, so any Settings navigation presented there
re-renders visibly on every switch. Settings navigation must therefore stay in the persistent shell.

- The Settings container is a container item, not a link. The container root `/settings` remains a
  route (section 2) for deep links and redirects to the first visible child.
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

The shell renders content only (navigation is the sidebar's job, section 3): the page content region
roots directly on one Collapsible Layout carrying the page chrome (`bgLayout`, base padding). There
is no page-level heading block above it — the page title is already in the header, and the panel
titles name the sections.

Each Settings panel is one Collapsible slot: the panel title is the slot title, an optional
description leads the panel, and the panel's sections (descriptor Forms, Tables, description blocks)
stack inside it. The Collapsible runs in accordion mode with the first panel open, so exactly one
panel is open at a time. A panel is one coherent unit of configuration; a Module
with more configuration takes further free slots rather than growing one panel. The Collapsible
Layout supports at most 12 slots ([LAYOUTING.md](./LAYOUTING.md)), which is therefore the per-page
budget; a Module exceeding it splits into multiple mounted pages.

Panels wrap their sections in a vertical Layout because a sequential Layout slot renders exactly one
child node, while a Form panel is always at least the Form plus its Save Button.

Each Form panel carries its own primary Save button, wired by the shell over the standard submit
signal channel. Per-panel save is the accepted v1 model (operator decision 2026-08-19); a shared
page-level save action is explicitly not part of this contract.

Cross-Module aggregation must never be built as in-page tabs or slot contributions; Modules always
switch via routes through the sidebar container.

## 5. The base Area Module's General page

The base Area Module contributes the Area's "General" Settings page through the same mount, the same
shell, and the same rules as every other Module — first-party and third-party Modules are treated
identically. The only distinction is position: the Area definition declares the General entry statically
as the first item of the `<area>:settings` surface.

The Public Area has no Settings container. Viewer preferences (theme selection, cookie consent) are
per-visitor presentation state owned by Widgets and Overlays with local persistence; they are not Site
configuration and must not be modeled as Settings routes.

## 6. Sections and the Form basis

Settings sections are built exclusively on the shared Form and control basis:

- Field sections use the Form descriptor stack: a `PhiFormDescriptor` with a label set, provider-based
  validation, and submission through a registered Form gateway handler (site-session credential policy,
  CSRF per the handler descriptor). Responses follow the converged error envelope.
- List- or collection-shaped configuration uses the generic Table/Collection contracts
  ([TABLES.md](./TABLES.md), [COLLECTIONS.md](./COLLECTIONS.md)).
- Hand-rolled `fetch` calls, ad-hoc antd forms, hardcoded copy, and per-surface envelope parsing are not
  permitted in Settings surfaces. All copy comes from label sets.

Secrets in Settings surfaces are write-only and follow the secret-handling rules of the owning server
contract (see [AUTHENTICATION.md](./AUTHENTICATION.md) section 8 for the Auth precedent).

## 7. Migration boundary

The Admin area container is implemented: General is the Admin base Module's mounted page on the
descriptor Form basis, the container root redirects per section 2, and the Asset Module's Media
Settings page is the first surface built directly on this contract (Space kind enablement and default
quotas against the Admin media configuration endpoint).

The Auth Authentication page's policy, password, and two-factor sections live on the descriptor Form
basis against flat per-section Auth Admin endpoints with server-side derivations (role bitmask, grace
clearing, required-TOTP/method coupling); the shared datetime field provider was added for the grace
deadline.

The Auth provider installations are presented through the AUTHENTICATION.md section 8 installation
catalog: a generic Table over the auth-installations data provider (inline enablement edits, test and
guarded delete row actions) with descriptor create/edit Forms wired over the standard table/form
signal channels — the whole Authentication page now runs on generic contracts.

The Builder area container is implemented on the same shape: the container root redirects per section
2 and the base Module's General page is mounted, not routed absolutely. The Builder base Module owns
no configuration of its own yet, so its General page carries only the read-only Technical panel;
further panels are added to that page when Builder configuration exists, and Modules contribute their
own Builder Settings pages through the same mount meanwhile.

No surface predating this contract remains.

## 8. Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or
compatibility contract. If it cannot express a requirement, implementation stops and asks the operator
first.
