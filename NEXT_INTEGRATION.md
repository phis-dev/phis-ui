# Next.js Site Integration Contract

This document defines the target v1 ownership boundary between `@phis/ui` and a generated or
deployed Next.js Site Skeleton.

For the complete package and Site-composition walkthrough for an installed third-party Module, start
with [THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md).

## Ownership

`@phis/ui` owns all reusable Site runtime behavior:

- root metadata and document-shell orchestration;
- locale redirect and request proxy policy;
- CMS Site bridge creation and resolved-request loading;
- static Area and dynamic Public route factories;
- metadata, not-found, and parallel-slot rendering;
- proxy runtime configuration and forwarded-header construction;
- one immutable Server catalog and one separate Client manifest boundary per Area.

The Site Skeleton owns only deployment and App Router registration:

- `config/site-runtime.json`;
- the physical Next.js `app` directory and its required parallel-route directories;
- `dynamic`, `runtime`, and statically analyzable route configuration exports;
- thin API, media, and proxy entrypoints;
- deployment assets and global CSS.

The Skeleton must not copy shared CMS resolution, locale selection, metadata derivation, proxy policy,
viewer redirects, fallback behavior, or optional Module composition. The Skeleton is the versioned base
for every Site and remains an updateable wrapper layer after Site creation. Installing, upgrading, or
removing a Module must not patch the Skeleton source or generate Module-specific route/runtime files.

## Static graph boundary

Next.js discovers filesystem routes and parallel slots at build time, so the physical route files remain
in the Site Skeleton. They delegate immediately to `@phis/ui/next/*`.

Each Area has separate Server and Client package entrypoints:

```text
@phis/ui/next/areas/public
@phis/ui/next/areas/public-client
@phis/ui/next/areas/admin
@phis/ui/next/areas/admin-client
...
```

These entrypoints must remain physically separate. A generic Area switch, namespace import, or shared
index that statically reaches every manifest would merge Admin/Builder implementations back into the
Public Client graph under App Router and Turbopack.

Third-party Modules contribute all optional code through their own physically separated package exports.
`phis-cli` installs those packages and produces one immutable, statically analyzable build manifest outside
the versioned Skeleton source. The stable generic Module host consumes that manifest and projects each
installed Module into its eligible Area Server catalog, Client manifests, and Builder authoring union.

The Skeleton and Site source therefore never import an optional package name, reconstruct Module manifests,
or gain Module-specific routes. Request/database values may select only ids already present in the immutable
build manifest; they never become package import targets. Builder alone may consume the installed target-Area
authoring union for its isolated Canvas, without activating those Modules in the outer Builder runtime.

## Required Skeleton entrypoint shape

A normal Area layout is limited to static registration:

```tsx
import { createPhiNextStaticAreaLayout } from "@phis/ui/next/area-route";
import { PHI_ADMIN_CMS_SITE_BRIDGE } from "@phis/ui/next/areas/admin";
import { PhiAdminRuntimeModuleClientBoundary } from "@phis/ui/next/areas/admin-client";

export const dynamic = "force-dynamic";
export default createPhiNextStaticAreaLayout(
  "admin",
  PHI_ADMIN_CMS_SITE_BRIDGE,
  PhiAdminRuntimeModuleClientBoundary,
);
```

The Skeleton may adapt a Next route parameter name or provide route-specific logging labels and user
agents. Such adapters must remain transport-only and must not interpret CMS, role, module, or locale
semantics. A Module installation must not change this entrypoint shape.

## Patchability

Behavioral fixes belong in `@phis/ui` so a package update patches deployed Sites without
regenerating their Skeleton. Module behavior belongs in its Module package. `phis-cli` may update packages,
the external immutable build manifest, and deployment artifacts, but it must not edit Skeleton source as an
installation mechanism. A Skeleton source update is reserved for an explicitly approved change to the
physical Next.js route graph, deployment configuration, or another genuinely Site-owned entrypoint.

If a Module needs `phi-server` implementation code, that implementation is a separate Add-on package whose
physical package name appends `-server` to the Module package name: `@scope/name` pairs with
`@scope/name-server`. The Site never imports that Add-on package.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility
contract. If it cannot express a requirement, implementation stops and asks the operator first.
