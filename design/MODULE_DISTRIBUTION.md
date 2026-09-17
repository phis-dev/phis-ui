# Module distribution design

This is a design direction, not a contract. What `phis module` does today is described in
[THIRD_PARTY_MODULES.md](../THIRD_PARTY_MODULES.md#9-install-without-patching-the-skeleton): it installs
a package the package manager can already resolve and fetches nothing itself.

A Module may be distributed as a compiled package without publishing its TypeScript or TSX
sources. The archive form below is unchanged by how it travels: phis packages are fetched from a
source rather than resolved from a registry, and the delivered package carries the Module half, the
Add-on half, or both. See [DISTRIBUTION.md](../../phis-server/design/DISTRIBUTION.md) in `@phis/server`. The source repository may remain private while CI publishes only the generated ESM,
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
