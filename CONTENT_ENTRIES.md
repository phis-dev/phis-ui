# Content Entries

This document defines how `@phis/ui` shows and writes the entries of a content type -- News, Blog, and
whatever kind Core declares next. What an entry is, who may write and publish it, and how versions and
submissions work is Core's ([phis-server CONTENT.md](../phis-server/CONTENT.md)); this is the surface over
it.

## One surface, several kinds

A kind is a name in `PHI_CONTENT_ENTRY_KINDS` (`constants/content-entry-kinds.ts`), the same list Core
serves under `/api/site/editor/entries/<kind>` and `/api/v1/entries/<kind>`. Every kind has the same
words -- title, subtitle, Markdown body, link, tags, a category, an author, language -- and the same acts, so everything that
shows or writes them exists once and takes the kind as data:

| Piece | Where | Takes the kind as |
| --- | --- | --- |
| Reading published entries | `gateway/content-entries.ts` | an argument |
| The entries Table Provider | Core Module, `PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntries` | the resource key |
| The tags Options Provider | Core Module, `PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryTags` | the field's `config.kind` |
| The list Widget `entry-list` | Core Module | `config.kind` |
| The header Widget `entry-header` | Core Module | `config.kind`, with `config.slug` |
| The text Widget `entry-detail` | Core Module | `config.kind`, with `config.slug` |
| One entry with its relatives | `server-helpers/content-entry-page.ts` | an argument |
| The editor Page, its dialogs and Table | `components/regions/presets/content-entry-editor-page-tree.ts` | the builder's input |
| The Public list and detail Pages | `components/regions/presets/content-entry-public-page-trees.ts` | the builder's input |
| The entry and publication Forms | `components/forms/content-entry-forms.ts` | the factory's input |
| The words around the entries | `components/widgets/label-sets/content-entries.ts` | -- |

The Widgets and Providers are the Core Module's because Core is active in every Area and no Module may
name another: a News list that depended on a separate content Module would break the day that Module was
switched off. A Widget per kind would be a wrapper that only injects a value, which `AGENTS.md` forbids.

## A kind's Module

A kind is brought to a Site by its own Module (`@phis/ui/modules/news`, `@phis/ui/modules/blog`), and the
Module is thin. It contributes:

- three routes: the Public list (`/<kind>`), the Public detail (`/<kind>/:slug`) and the editor Page
  (`/<kind>` in the Editor Area), each built by the shared tree builders;
- its navigation entries;
- its two Forms, made by `definePhiContentEntryForms` so their ids and handler keys are the Module's own;
- the nouns that differ by kind -- "News entry", "Blog post" -- as its Label Set.

It owns no Widget, no Provider and no data. Switching it off removes its Pages and its entries in the
navigation; entries already written stay in Core.

## The detail route

The detail Page is a route with one parameter, `/<kind>/:slug` (MODULES.md). Its tree loader reads the
entry before anything is drawn: the entry's title and subtitle become the Page's title and description, and
a slug that names no published entry answers **404** -- the loader calls `notFound()`, which the request
resolution raises in the Area Layout before the shell flushes, so the status line says so. A detail Page
that answered 200 with "not found" in its body would be filed by a crawler as a page.

The list links each entry to the detail route through a Page target with a parameter (REFERENCES.md):
`entry-list` carries `detailTarget` -- the detail route's Module Page reference -- and fills `slug` per
entry. A list placed on any Page links the same way; a list whose `detailTarget` does not resolve -- the
Module is off, or the Site moved the route -- shows its entries without links.

A detail Page is three Widgets in one vertical Flex: `entry-header` (category, title, subtitle, byline),
`entry-detail` (the text, then tags and link) and `entry-list` with `source: "related"` (the entries
closest to this one, under a heading drawn only where there are any). All three and the tree loader read
through `loadPhiContentEntryPage`, which asks Core's `/api/v1/entries/<kind>/<slug>?include=related` once
per request: the options are built in that one place, because the request memo only shares an answer
between callers that ask the same question.

## Showing an entry

What an entry Widget shows is a mask of parts (`constants/content-entry-parts.ts`): title, subtitle, date,
author, author picture, category, tags, link. One vocabulary for every entry Widget, edited in the Inspector
as a `flags` field. Each Widget offers the parts that belong to it -- the header everything but the text,
the text Widget only tags and link -- and the rest of a mask means nothing to it. `PhiEntryMeta` and
`PhiEntryBody` are the two halves every Widget composes from, so an entry looks the same in a list, a
header and a card.

## The editor Page

One Table of the kind's entries, its toolbar's plus opening the create dialog, and per row: edit, submit
(Authors) or publish and withdraw (Publishers), delete. The Table is the Core Provider's resource named by
the kind; the dialogs and Forms are wired by signal routes in the tree, without a Controller. Who sees
which row action is decided when the tree is built (`canPhiViewerAccess`), and Core repeats every check.
