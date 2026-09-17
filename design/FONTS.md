# Font adoption design

What [NEXT_INTEGRATION.md](../NEXT_INTEGRATION.md#fonts) describes is built: the font catalogue, Module
font contributions, Site-owned font Assets with fallback metrics and unicode-range cuts, and adoption of a
Module's family *names* on Theme save. This document covers what is not built: a Site keeping a Module's
lettering after the Module leaves.

## What a Site keeps when the Module leaves

A family a Module contributes is the Module's for as long as it is installed. Switch it off and a Theme
that named it is left pointing at nothing -- the record still says the family, the catalogue no longer
has it, and `resolveThemeFont` hands the bare name to the browser, which renders whatever the viewer
happens to have. The look a Site decided on would depend on a package staying installed.

The answer is the one pictures already have. `plugins/runtime-modules/theme/materialize-images.ts`
copies a ground a Module shipped into the Site's own Media library at the moment the Theme is saved, and
the draft then points at the Asset. Saving is the moment somebody decides to keep what they see, so it is
the moment ownership moves. Lettering would travel the same way, in the same act: the file goes into the
library as a `font` Asset, and the slot names `phis:asset/<id>` instead of a family. From there the
Site-owned font path renders it. What is missing is a way for the Module to say where its files are.

Two things this forces on the Module side:

- **The Module must ship the file, not only the declaration.** `next/font` returns a class name, a style,
  and a variable -- never a URL -- so there is nothing for an adoption step to read. A family that is meant
  to survive its Module has to arrive the way a ground does: as a file in the package, declared through
  `next/font/local` for the fast path while the Module is installed, and readable as bytes when the Theme
  is saved. A Google family declared through `next/font/google` can be offered, but it cannot be adopted,
  and a Site that picks one keeps it only as a name.
- **After adoption the fast path ends.** An Asset cannot go back through a build-time loader. It renders
  through the Site-owned `@font-face` rules, with the fallback metrics read at upload.

## Tool licences

The subsetting tools are all permissive, which matters because the core is Apache-2.0 so that Add-ons may
stay closed: HarfBuzz is under the Old MIT license and reachable from Node as `harfbuzzjs` (MIT) or
`subset-font` (BSD-3-Clause), woff2 packing as `wawoff2` (MIT), and the metrics through `fontkit` or
`@capsizecss/unpack` (both MIT). fontTools is MIT as well but is Python, which would put a second runtime
in the server for something WASM does in-process.

Subsetting modifies the file. Most webfont licenses permit that, a few commercial ones do not; the upload
surface should say so once.
