# Site Search

How a visitor searches a Site's own Pages, and which half of it is this package's. The server half --
the index, the query, the endpoints -- is phis-server `SEARCH.md`; the shapes both read are
`@phis/contracts/search`.

## The split

A Page's words are not in one place phis could read: they stand in Widget configs of Pages a package
brings as Presets, in content bound to a Widget instance that only a Page's tree names, and in documents
a Widget fetches while the Page is drawn. Only the Site, resolving a Page the way a visitor's request
resolves it, sees the whole text. So the Site writes the documents and phis keeps and searches them.

## Which Areas

Public and App, as the reader who may search them. The Public Area is read anonymously, as a crawler
reads it; the App as a signed-in member with no further roles -- the least any member holds, so what the
index knows every member may read. A Page with a narrower access policy is not in the set. The results
Widget searches where it stands: on a Public Page the Public Area, on an App Page the App and Public
Areas, and nobody reaches an App Page without signing in. The operator's Areas are not indexed and have
no results Page; a Search Box placed there sends its query to the Public one.

## The pieces

| | |
|---|---|
| `searchText` on a Widget plugin | The words a Widget shows, in reading order, translated for the language being indexed (`types/cms-plugins.ts`). A Widget without it contributes nothing. Markdown, Simple Text, HTML, Description and Card say theirs; a Module's Widget that draws words a visitor would search for says them the same way (THIRD_PARTY_MODULES.md "Add a Widget"). |
| `server-helpers/search-text.ts` | What a `searchText` is made of: the Widget's own sentences masked, translated and filled the way its render does them; a rendered Markdown document as lines; an HTML fragment without its tags. |
| `server-helpers/search-index.ts` | The indexer. It enumerates an Area's Pages the way the sitemap does, resolves each one per language as a lookup, asks every Widget on it for its words, and writes one set per Area and language to phis under a fingerprint of what it was built from. |
| `gateway/site-read-marker-listeners.ts` | How the indexer learns of a publish: the Site config read says when the read marker was first seen or moved, and the indexer listens. |
| `search-box` Widget | A `GET` form the browser submits to the results Page, `?q=` in the URL. It works before anything hydrated and in a static render. Where it leads is a Page reference; absent, the Area's own results Page (`plugins/runtime-modules/search-page-references.ts`). |
| `search-results` Widget | Reads `q` from the page's address, asks phis with the Areas this reader may search, and lists the hits: title, address, description, the passage with the words marked. No `q` says what to do; a `q` too short says what a query needs. |
| `/search` in Public and App | The results Pages every Site has: the box and the results, no menu entry, `NoIndex`. The App's sider carries a Search Box above its navigation. |

## When the index is written

- When a Site process first sees the Site's read marker, and whenever it moves -- which a publish does.
  A burst of publishes is one run; a marker that moves during a run queues one more.
- Only the sets whose fingerprint phis does not hold: the fingerprint names the live revisions, the Area
  preset, the active Modules, the Site's locales, the extraction format, the Site's read marker and its
  translation markers, so a publish, an unpublish, a path change, a Module switched on or off, a
  language added, published content a Widget is bound to, a corrected translation, or a new version of
  this package rewrites the set, and nothing else does. Several processes noticing one publish produce
  one write.
- An Area is indexed by the process that hosts it: the Area host registers its Bridge when it is created
  (`next/areas/public.ts`, `next/areas/app.ts`).

## What a Page contributes

Its title and description, and every Widget's `searchText`, in tree order -- of the Widgets the reader
of that set would see: a Layout or Widget whose access policy is narrower than the Page's is filtered
out as the live render filters it, so nothing a reader cannot see reaches that reader's index. A Page
that resolves to nothing, forwards, is `NoIndex`, or needs more than the reader has is not written. A
Widget that fails to answer costs the Page its words and is logged; a Page that fails to resolve is
logged and the rest of the set is written.

## Not in v1

- News and Blog entries as hits of their own. Their text is in Core's tables; a second path that
  indexes them there, or a Widget that lists them saying its words, is open.
- App Pages with a narrower access policy than "signed in". They are left out rather than indexed for
  a reader who may not see them; a per-reader index is a different product.
- Suggestions while typing. The box submits; a list under it that asks as the visitor types is a later
  Widget over the same endpoint.
