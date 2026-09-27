# Media derivation design

Two derivations are built and both are special cases: image variants and font subsets. This document is
about the third one somebody will want -- a video that plays on every device -- and about the seam that
should exist before it, so that the pipeline behind it is an Add-on's business and not Core's.

Nothing here is built. What *is* built, and what the reasoning below has to stay compatible with, is the
Video Widget's provider half: a placeholder that asks at the embed and fetches nothing until somebody
presses it ([CONSENT.md](./CONSENT.md), [MODULES.md](../MODULES.md)).

## What phis records about a file today

`phis.media_assets` keeps `content_type`, `bytes`, `checksum_algorithm`/`checksum_value`,
`variant_version`, `width`, `height`, `blur_data_url`, `meta`, `title`, `alt_text`, `lifecycle_status`,
`delivery_policy`, `delivery_revision` and `presentation_flags`.

What it does not keep matters more here:

- **No `duration`, no codec, no frame rate**, and nothing equivalent in `meta` -- that column carries
  `focalRect`, `font` and `source`.
- **No `kind` column.** The class of a file is derived from `content_type` on every projection, through
  `resolvePhiMediaKindFromContentType`.
- **`width` and `height` are never filled for anything but an image.** `readImageMetadata` returns nulls
  for a non-`image/*` upload, so a video Asset has `width = height = null` and always will until something
  probes it.

A video would be accepted today. There is no global MIME allowlist: the Site space accepts every kind, and
User and Group spaces list theirs -- the Groups Module and Threads both name `video`. The byte sniffer
recognises `video/mp4`, `video/webm`, `video/ogg` and `video/quicktime`. Delivery names `video/mp4`,
`video/webm` and `video/ogg` in the closed list that gets `content-disposition: inline`, sends the stored
MIME type, and streams rather than buffers. One limit is global and blunt: `max_object_bytes` defaults to
128 MiB, which at 1080p and roughly 5 Mbit/s is about three and a half minutes.

## The same derivation, built twice

`image_asset_variants` holds ten fixed renditions per image. `font_asset_subsets` holds unicode-range cuts
per family. Strip the subject matter and the two are one pattern:

1. derive on first request,
2. keep the result beside the original under its own storage key,
3. invalidate by a version constant.

They are also both closed by construction. `PhiImageAssetVariantSpec` fixes `format: "webp"`, so the
variant system can only ever produce rasters; `ensureImageAssetVariant` returns `null` for a non-image and
the variant route answers `404`, which is why `thumbnailUrl` and `previewUrl` are `null` for every
non-image Asset. Font subsetting reaches for HarfBuzz compiled to WebAssembly precisely so that there is
"nothing on the host to install".

A third special case for video is the moment to generalise rather than to write the same table a third
time. That is the whole argument for a seam.

## Where a pipeline belongs

The seam belongs in Core. The pipeline does not.

phis already separates the two kinds of extension: a **Module** is a Site extension compiled into a Site
application, an **Add-on** is a server extension installed into `phis` through `phis-cli`. A Module cannot
contribute server code at all, and `SERVER_ADDONS.md` names the attempt as a contract violation. Add-ons,
on the other hand, are a real server extension surface -- `apiRoutes`, `hooks`, `jobs`,
`serviceProviders`, a schema of their own -- and `phis-storage-s3` is a working example of the shape.

Four things stand between that surface and a derivation pipeline today:

- **The service-kind list is closed.** Three kinds exist: `mediaStorage`, `directory`, `translation`.
  Manifest validation refuses anything else with "is not a Core service kind". A derivation kind would be
  the fourth, and adding it is the seam this document is about.
- **There is no hook in the upload lifecycle.** `init` and `finalize` stay Core routes for every storage
  Provider; a Provider may name an upload plan and seal the object, and "an Add-on never gains a browser
  endpoint or a second upload lifecycle of its own". Transforming the content is deliberately not
  available there, and it should not become available there -- a derivation is not part of an upload.
- **There is no scheduler**, and `jobs.ts` says there should not be one: "The operator schedules
  `phis addon job run` -- through systemd, cron, or whatever already runs their maintenance." This is less
  of an obstacle than it looks. A derivation is not a request-time need; it is "this object arrived, make
  it usable, say when you are done", which is exactly what an operator-driven job is for.
- **A native dependency is refused.** Add-ons are one self-contained artifact with no bare import beyond
  `node:` builtins; sidecars are designed and not built, and `ADDONS_PLANNED.md` states that until the
  first real case a native dependency is refused. `ffmpeg` is one. This is the only obstacle that is about
  the pipeline rather than the seam, and it is a packaging question -- not a statement that derivation
  belongs to Core.

The WebAssembly answer that solved font subsetting does not carry over, and the reason is duration rather
than dependency. A font cut takes milliseconds and an image variant a fraction of a second, so both fit
"derive on first request". A transcode takes minutes. No language choice changes that.

## S3 is already accounted for, on the write side

`PhisMediaStorageAdapter` is richer than a derivation pipeline would need to be given. `createUploadPlan`
returns either `proxy-stream` -- the body through a Core route -- or **`presigned-put`**, the Provider's own
endpoint, with the explicit rule that Site credentials are never attached to it. From the storage layer's
point of view a derivation worker is simply another uploader, and on S3 the derivative's bytes never pass
through phis-server.

Around it: `probeCapabilities()` establishes per Profile which checksum algorithms the endpoint genuinely
verifies -- an algorithm is listed only when a correct digest was accepted *and* a wrong one refused --
plus `verifiesWholeMultipartObject` for objects above the single-request limit. `applyCorsPolicy(origins)`
exists for direct reads. `copyObject` and `listPrefix` exist.

So the compatibility question has a better answer than expected: a derivation that writes through an
upload plan is *more* S3-compatible than a Core pipeline would be, because a Core pipeline would have to
stream both directions through a Next.js route handler.

## One direction, two additions

There is no read counterpart. No download plan, no presigned GET, and `getObjectStream(storageKey)` takes
no offset and no length; `readObjectHead(storageKey, byteLength)` reads only from the beginning -- though its
own comment says a remote Provider "reads a range rather than the body", so the shape is half there and
lacks a starting point.

Two things want reading, and they want different additions:

- **Seeking in a video** wants a **ranged read on the adapter**. Without one there is no
  `206 Partial Content`: measured on the live delivery route, a request carrying `Range: bytes=0-99` was
  answered `200` with the whole body and no `Accept-Ranges`. Chrome and Safari both need ranges to seek,
  and Safari frequently refuses to play at all without them.
- **A derivation worker outside the process** wants a **read plan** -- a `presigned-get` beside the
  existing `presigned-put` -- because reaching the original through Core defeats the economics that
  `presigned-put` was designed for.

Only the first is needed for a video to be delivered at all, and it is the smaller of the two: Core keeps
streaming, the route and the URL stay as they are, the origin does not move, and nothing about the consent
question changes. The Local adapter is the default and its bytes go through Core either way, so a ranged
read there is unavoidable and a read plan would not substitute for it.

The read plan is for the pipeline, not for delivery -- and it moves the origin, because a presigned GET
names the Provider's hostname. That is the case
[CONSENT.md](./CONSENT.md#the-gate-follows-the-origin-not-the-source-kind) warns about, so it is a
deliberate step and not an optimisation to take quietly.

Neither is specific to video. A ranged read also buys resumable downloads for every large object a Site
offers.

## What a generic derivation would need

A sketch, not a specification:

- A **derivation kind** namespaced to the Add-on that produces it, the way a service provider key must
  begin with its own package name.
- A **derivatives table** keyed by `(asset, kind, parameter digest)` holding the storage key, the content
  type, the byte size and whatever the producer probed. `image_asset_variants` and `font_asset_subsets` are
  its two ancestors, and both should eventually be expressible in it rather than beside it.
- A request shape for **work that takes minutes**: ask for a derivative, poll, have it become available --
  the "work-shaped Capability" already sketched in `ADDONS_PLANNED.md` -- rather than the
  derive-on-first-request that the two built cases use.
- The rule that a **derivative never replaces the original**. The original is what the Site uploaded and
  what every checksum was recorded against.
- Optionality through the existing Capability mechanism: a Module declares a `serverBinding`, a Site
  without the Add-on simply has the Module deactivated, and its Widgets report `missing-module` naming the
  missing capability without disturbing anything else.

## Video: what the Widget must not burn in

The Video Widget will grow a second source: `provider` for YouTube and Vimeo, `asset` for the Site's own
file. Eight constraints keep that compatible with everything above. None of them is extra work; three of
them forbid a shortcut, and the rest are things to get right once.

1. **No delivery URL in Widget config.** The provider branch already obeys this -- it stores a provider key
   and a video id, and the address is assembled at render. The asset branch stores an Asset id and nothing
   about how to fetch it.
2. **A rendition may name a size or an intent. It must never name a codec**, and the list of renditions is
   registry-fed rather than a Core enum. The Image Widget's `variantKey` is the good precedent and shows
   why: its ten keys are Thumbnail, Card, Hero, Portrait and so on, and `format` is *constant* across all
   of them, so the author chooses geometry and never a format. For video, AV1 against H.264 is not a
   layout intent -- it is a per-device negotiation, and an author who picks AV1 has written a black
   rectangle for every Safari without a hardware decoder. And because the renditions of a video would come
   from whichever Add-on produces them, their list cannot be a fixed enum in `phis-contracts` the way the
   image keys are; it has to travel as descriptors, the way `calendarAdapters` and `videoProviders` do.
   Storing the chosen key is then exactly right. The field can exist from the first day with a single
   option -- the Image Widget already spells it, `emptyOption: "Original"` with `emptyValue: null` -- and
   fill up when an Add-on arrives, with no migration. It also degrades better than the provider branch: a
   rendition whose Add-on is gone falls back to the original, which still plays, where an unresolvable
   provider leaves nothing to render.
3. **The Control takes a list of sources, not one `src`.** Today the list holds one entry, the original.
   Later it holds AV1, WebM and MP4 with their `type` strings and the browser picks the first it
   understands. This is the one decision that has to be made *now*, because changing it later is a
   migration; making it now costs nothing.
4. **The Widget never branches on a MIME type or a codec.** It renders what it is handed. Otherwise every
   new rendition is a Widget change.
5. **The aspect-ratio default means "ask the source".** It already means "whatever the provider said". For
   an Asset it falls back, because `width` and `height` are never filled for a video -- and if something
   later probes them, the same default silently starts being right.
6. **The poster stays an Asset reference resolved on the Server.** It already is. A derived still frame can
   answer the same question later without touching a stored config.
7. **No pipeline state in Widget config.** No `transcoded`, no `status`. An Asset knows its own readiness;
   a Widget that recorded it would force every pipeline run to rewrite page revisions, which is the worst
   coupling available here.
8. **The gate follows the delivery origin, not the source kind.** See
   [CONSENT.md](./CONSENT.md#the-gate-follows-the-origin-not-the-source-kind).

## What is true about video formats today

The advice to ship two files is from 2009 to 2013, when H.264 in MP4 covered Safari and IE while Firefox
and Opera would only take Ogg Theora and later WebM. Firefox gained H.264 between 2012 and 2014. Since
then **H.264 video with AAC audio in an MP4 container plays in every mainstream browser on every mainstream
system**, and one file is enough. The remaining grain of truth: on Linux both Firefox and Chromium decode
through system libraries, so a distribution shipping a codec-stripped ffmpeg can lack H.264. That has
become rare and is not a reason to plan around.

Two details matter more than the container:

- **8-bit 4:2:0.** H.264 High 10 or 4:2:2 is not broadly decodable, and some ffmpeg invocations silently
  produce `yuv420p10le` from a 10-bit source.
- **`-movflags +faststart`.** With the `moov` atom at the end of the file the browser has to fetch
  practically all of it before the first frame. This is the most common self-hosting mistake there is.

A second file is worth having for **bytes**, not for reach: AV1 saves 30 to 50 per cent against H.264 and
VP9 20 to 35, offered as earlier `<source>` entries. Safari decodes AV1 only where there is hardware for
it, with no software fallback, which is another reason the choice belongs to the browser and not to an
author.

Without a pipeline, none of this can be guaranteed, and one trap deserves naming: the sniffer accepts
`video/quicktime`, and **an iPhone records HEVC in `.mov` by default**, which Chrome and Firefox largely
cannot play. An editor uploads it, watches it on a Mac, and half the audience sees nothing. Until something
transcodes, an upload check that refuses what browsers cannot play -- with a message saying what to do
instead -- is part of the feature rather than a nicety.

## Non-goals

- **Transcoding in Core.** It would burn one pipeline into the platform and answer the generic question
  with a special case, which is what the two existing special cases already cost.
- **Adaptive streaming.** HLS or DASH means segmenting, several bitrates, a manifest and a JavaScript
  player. A Site that needs it is better served by a hosted provider, which the video provider registry
  already accommodates -- and where the placeholder applies correctly, because such a provider genuinely
  is a third party.
- **A second upload lifecycle.** Whatever produces derivatives writes through an upload plan like everybody
  else.

## Open questions

- **Captions.** WCAG 1.2.2 requires them for prerecorded video with sound, and a WebVTT file is a second
  Asset that belongs to a video. That is a data-model question -- a relation between Assets -- and it has
  to be answered before a Site's own video is more than decoration.
- **Where duration and dimensions live.** A `meta.video` object needs no migration; a column is honest
  about being queried. Neither is obviously right, and whoever probes them should decide.
- **Whether `media_storage_profiles` should describe its delivery origin**, since
  [CONSENT.md](./CONSENT.md#the-gate-follows-the-origin-not-the-source-kind) needs that answer and there is
  nowhere to read it today.
- **An Asset field type for the Inspector.** There is none, so `assetId` is a bare number field with a
  toolbar button beside it, and the Video Widget's poster has the same gap. The picker can already filter
  by kind; every call site hard-codes `Image`.
- **The single-request size limit.** 128 MiB is about three and a half minutes of 1080p, settable in the
  Admin media settings, and `phis-server/TODOS.md` notes that the figure does not know which transport
  carries it. Above 2 GB `nginx` ends it either way, on the proxied path and on the presigned one.
- **Which digest a multipart object carries: settled.** It is `sha256-composite`, SHA-256 over the
  concatenated part digests with the division named in the value, and a whole-object digest for such an
  object turned out to be impossible rather than merely unmeasured -- `ChecksumType: FULL_OBJECT` is
  accepted for the CRC algorithms alone. The Client hashes per part for a second reason that matters here:
  Web Crypto has no incremental digest, so a video too large to hold in memory can only be described per
  part. What this means for video specifically is that a two-gigabyte upload is resumable *and*
  deduplicable, which is the combination the Widget's asset branch was going to need. The measurements and
  what is left frozen are in `phis-server/TODOS.md`, "Media and storage".
