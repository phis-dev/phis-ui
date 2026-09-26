# Designs

The documents in this directory are designs and plans, not contracts. Nothing in them is binding, and
most of it is not built. Building any of it requires operator approval; the part that is built then moves
into the matching contract document, and open work is tracked in [TODOS.md](../TODOS.md).

- [BUILDER.md](./BUILDER.md) -- Builder surfaces that do not exist: page tree drawer, shell profiles and
  selector, a brand workspace, creation actions, breadcrumbs.
- [CONSENT.md](./CONSENT.md) -- what a Site may store in a device without asking, the gate a Widget passes
  before it loads a third party, and why a Site that asks for nothing shows no banner.
- [FONTS.md](./FONTS.md) -- copying a Module's font files into the Site's Media library on Theme save, and
  the licence survey behind font subsetting.
- [MEDIA.md](./MEDIA.md) -- a seam for deriving one file from another, so that a transcoding pipeline is an
  Add-on's business rather than Core's; the single storage-contract gap that blocks both video seeking and
  an out-of-process worker; and what the Video Widget must not burn in while it grows a second source.
- [MODULE_DISTRIBUTION.md](./MODULE_DISTRIBUTION.md) -- distributing compiled and commercial Modules and
  acquiring them from a configured source.
- [OVERLAY_AUTHORING.md](./OVERLAY_AUTHORING.md) -- authoring Modal and Drawer Overlays in Builder.
- [RESPONSIVE_BLOCK_GEOMETRY.md](./RESPONSIVE_BLOCK_GEOMETRY.md) -- letting a block state a size per
  profile, decided by a container query on the room it is offered rather than by anything that measures.
- [STATE_MACHINES.md](./STATE_MACHINES.md) -- a shared description of multi-step work: states,
  transitions, server-owned projections, and where a flow's state lives.
- [TOURS.md](./TOURS.md) -- guided UI Tours, visual-anchor resolution, and user progress.
- [USER_STATE.md](./USER_STATE.md) -- an account-bound store for what a person decided: dismissed cards,
  a read marker, a Tour's progress. **Built.** It stays here as the reasoning; what a Module needs in
  order to use it is [THIRD_PARTY_MODULES.md](../THIRD_PARTY_MODULES.md) §11.
