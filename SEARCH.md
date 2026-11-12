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
Areas, and nobody reaches an App Page without signing in. The operator's Areas are not indexed, and
the Search Module is not offered there.

## The Search Module

The box, the results and the Pages that answer are a Module of their own, `@phis/ui/modules/search`
(`plugins/runtime-modules/search/`), for Public and App and switched on in both as shipped. A box is
only worth placing where something answers it, and what answers it is the Module's own results Page,
which always holds the results Widget. Switched off in an Area, its Widgets are gone from the Area's
catalog and from every Page that placed one, its Page is gone, and the indexer leaves the Area alone.

What stays outside it is what any search needs: `searchText` on every Widget plugin, the indexer's
reading of a Page, and phis-server's index and query endpoints. A package that brings a search of its own
brings its own box, Page and results the same way, as a Module, over the same endpoints.

## The pieces

| | |
|---|---|
| `searchText` on a Widget plugin | The words a Widget shows, in reading order, translated for the language being indexed (`types/cms-plugins.ts`). A Widget without it contributes nothing. Markdown, Simple Text, HTML, Description and Card say theirs; a Module's Widget that draws words a visitor would search for says them the same way (THIRD_PARTY_MODULES.md "Add a Widget"). |
| `server-helpers/search-text.ts` | What a `searchText` is made of: the Widget's own sentences masked, translated and filled the way its render does them; a rendered Markdown document as lines; an HTML fragment without its tags. |
| `server-helpers/search-index.ts` | The indexer. For each Area the Search Module is on in, it enumerates the Pages the way the sitemap does, resolves each one per language as a lookup, asks every Widget on it for its words, and writes one set per Area and language to phis under a fingerprint of what it was built from. |
| `gateway/site-read-marker-listeners.ts` | How the indexer learns of a publish: the Site config read says when the read marker was first seen or moved, and the indexer listens. |
| `search-box` Widget | A `GET` form the browser submits to the results Page, `?q=` in the URL. It works before anything hydrated and in a static render. It always leads to the Module's results Page of the Area it stands in (`search/page-references.ts`), which always holds the results; there is no Page to pick. `variant` draws it as the input, as a magnifier alone that opens into the field (`icon-only`, see below), or `auto`: the input, and the magnifier on a phone. The Builder draws it as a visitor sees it, inert. Its placeholder, like the results Widget's heading, is always translated: neither offers the "Translate text" switch. |
| `search-results` Widget | Reads `q` from the page's address, asks phis with the Areas this reader may search, and lists the hits: title, address, description, the passage with the words marked. No `q` says what to do; a `q` too short says what a query needs. |
| The results Pages | The Module's routes (`search/presets.ts`): `/search` in Public, and in App under the package as every Module route outside Public, `/app/phis/ui/search`. The box at a form's width and the results, no menu entry, `NoIndex`. The Public header preset carries a magnifier before the locale switch; the App's preset carries a Search Box in its Sider above the navigation. Both are ordinary Widgets of their presets: nothing places a box on its own, and a Builder removes or moves them like any other. |

## The magnifier

A header has no room for a field beside a brand, a menu and an account, and a field that wrapped would
push the page down on a phone. So the box can stand as a magnifier:

- Until the page has hydrated it is a link to the results Page, so it leads somewhere without a script.
- After that, pressing it opens the field where it stands, the field growing out of it; on a phone (the
  Shell's phone, below 768px of the render viewport) it opens as a row over the whole header band, the
  field and a close mark, on the page's ground.
- Escape, the close mark, or leaving the field empty closes it. Enter submits as the field always does.
- Outside a header band it always opens in place: a row over the content Region would cover the page.

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
