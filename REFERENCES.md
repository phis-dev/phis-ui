# Internal Reference and Page Path Contract

This document defines the normative target-v1 `@phis/ui` contract for mutable Site Page paths,
structured internal Page and Asset references, navigation targets, and references embedded in Markdown
or HTML. Persistence, authorization, reference indexing, and authoritative resolution are owned by
`phi-server` and must remain compatible with this contract.

## Identity and canonical Page paths

A Page path is routing data, not Page identity. Site-authored Pages use their immutable positive Page
Scope id as identity. Module-owned Pages use their immutable `(ownerModuleId, presetKey)` identity. A
Builder `pageKey`, a CMS node id, a title, a path, a navigation item id, and a revision id must never be
substituted for either Page identity.

For a Site-authored Page, the canonical normalized path is the relational Page Scope path owned by
`phi-server`. It is independent of Page revision JSON, Builder history, Undo/Redo, and publish pointers.
A serialized Page render model may carry the currently resolved path as transport data, but
`tree_json.page.path` must not remain an independently writable or authoritative persistence path.

A Page path change is an explicit structural command addressed by Page Scope id. It is never inferred
from an ordinary Page Form save. The server normalizes and validates the destination, locks the Scope,
rejects collisions and reserved or cross-Area paths, changes the canonical path atomically, and records
an audit event. The command does not create an Undo/Redo entry and cannot be reverted by restoring a
Page revision.

Module-owned Page paths remain owned by the active route descriptor. A Page Scope with Module preset
identity must reject path mutation even when the Site has a Draft derived from that preset. The Page
Meta Form presents the path as disabled with an ownership reason for a Module Page and as editable for a
Site-authored Page; this presentation is not authorization and the server repeats the ownership check.

## Stable internal targets

All Phi-owned controls that select an internal Page persist a stable Page reference rather than a path.
The canonical logical reference variants are:

- Site Page: the current Site plus Area and positive Page Scope id;
- Module Page: the current Site plus Area and `(ownerModuleId, presetKey)`.

The Site and Area are validated resolution context and must not be accepted as authority from arbitrary
browser input. A serialized reference value is opaque to Controls and Widgets: it is issued and parsed by
the central reference contract and must not be assembled from labels, paths, package titles, or indexes.

Navigation authoring creates an internal link only by inserting or dragging a Page from the active
Area's Page source Tree. That source node supplies the stable Page reference; its displayed path and
optional Page title are resolved metadata and are never the persisted value. The Navigation Table shows
the resolved current path read-only and must not render a second Page SelectBox or another internal-target
editor. A free text field is available only for an explicitly external target. Root-relative or
locale-relative strings are not a second internal-target format. Module and Site targets share the same
source/resolver contract.

Changing a Site Page path therefore does not rewrite structured internal links. Navigation, Markdown,
HTML, and other typed reference consumers resolve the same identity to the new canonical path. The path
command must still consult the reference index and return affected-reference counts for audit and
operator feedback. Legacy internal path strings are migration input: v1 migration resolves them to one
unambiguous target or reports them for operator repair; runtime path fallbacks are forbidden.

Deleting a referenced Site Page is a logical tombstone operation: it retains the Page Scope, its
immutable id, and its canonical `(Site, Area, path)` ownership. It does not rewrite or discard the stable
reference in a Navigation Draft. Authoring resolves it as a deleted target and renders an explicit
deleted diagnostic in that row; Live navigation omits the unresolved link entirely.

Creating or restoring a Site Page at a tombstoned canonical path reactivates that retained Page Scope
and therefore its original id. It must not allocate a second Page identity. Existing structured links
then become valid again through normal id resolution. This reuse belongs exclusively to the
transactional Page-create/restore workflow; runtime resolvers must not add a path-based identity
fallback. If the Page still exists and only its path changes, both Draft and Live resolve the same
reference to the new current path without a navigation mutation.

External URLs remain literal URLs and are never converted into an internal Page reference implicitly.
Fragment-only document links remain local document anchors. A fragment may be attached to a valid Page
reference and is preserved after Page resolution; it is not part of Page identity.

## Markdown and HTML reference syntax

Internally persisted Markdown and HTML may encode typed references with the reserved Phi URI forms:

```text
phi:page/<opaque-page-reference>
phi:asset/<positive-asset-id>
```

Examples of authored Markdown are `[Account](phi:page/<reference>)` and
`![Logo](phi:asset/4711)`. The equivalent forms are valid in the approved internal HTML subset through
`href` and `src`. The exact Page-reference payload is produced by the central Page picker and is opaque
to Markdown/HTML Widgets. Asset references reuse the canonical id of an Asset owned by the current
Site's Site Media Space; another Asset alias, User-/Group-Space id, Storage key, or copied public URL is
not created.

The server parses references into structured nodes, validates same-Site ownership and Area resolution,
and resolves only the referenced targets in bulk before serializing the render model. A Client never
receives an unresolved `phi:` URI. Page resolution produces the current locale-/Area-correct href. Asset
resolution applies the Asset's current lifecycle, delivery policy, and delivery revision and produces
its authorized public or signed delivery URL; possession of an Asset id never bypasses access checks.
User- and Group-Space Assets require explicit authorized promotion into the Site Space before they are
valid CMS targets.

Link destinations and Asset identities are structural metadata and are never translated. Visible link
text and image alternative text remain normal translation units. Translation round-trips must preserve
the structured reference unchanged.

Internally persisted content must use `phi:page` for a same-Site Page and `phi:asset` for a Site Asset.
Plain root-relative Page links and local Asset paths are invalid internal authoring output. Normal
absolute external URLs remain allowed under the HTML/Markdown sanitizer policy.

## External document trust boundary

External Markdown/HTML (`sourceMode: "url"`) and provider-produced documents are untrusted and must never
address Site-local Phi references. The source classification comes from trusted Widget/provider config,
not from document markup. Server sanitization rejects every `phi:` scheme occurrence before translation
and rendering, including case, whitespace, character-reference, percent-encoding, redirect, and nested
URL forms that normalize to the reserved scheme.

For an external document:

- a forbidden Phi Page link is unwrapped so its visible text remains but no link is emitted;
- a forbidden Phi Asset/image node is removed from live output;
- Authoring may render a non-interactive diagnostic for either removal;
- relative and root-relative HTTP references resolve against the external document's source URL and
  never against the current Phi Site;
- an unresolved or forbidden Phi URI must never reach a browser DOM attribute or translation provider.

The same rule applies when an external document happens to originate from a hostname also used by the
Site. Only internally persisted trusted content may contain resolvable Phi references.

## Validation, indexing, and failure behavior

The server maintains one indexed reference projection for structured Page and Asset references across
current CMS content and navigation. Save/import paths validate and update this index transactionally.
Page and Asset deletion flows query it for affected-reference diagnostics instead of relying on browser
state or broad JSON scans; a deleted Page may intentionally leave a stable unresolved reference for the
Authoring diagnostic and Live omission behavior defined above.

An unresolved internal Page reference renders non-interactive text; an unresolved Asset reference
renders no media. Authoring receives a typed diagnostic containing the owner scope and source location.
Resolvers must batch references per render/request and must not fetch the complete Page or Asset catalog
for Public/App rendering.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through raw path fallbacks, comments attached to Markdown links, Widget-local URI parsers,
Module-specific target shapes, copied Asset URLs, Client-only resolution, or compatibility aliases.
