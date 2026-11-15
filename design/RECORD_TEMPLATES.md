# Record template pages

A page that shows one record of many -- a product, a content entry, an order -- laid out once in the
Builder, so that changing the template changes the page of every record. Decided by the owner
(2026-11-15): the template is a general `@phis/ui` capability, any Module can provide one, and authors
rebuild it in the Builder.

Built so far (the contract is MODULES.md, "The fields of a record, and the record a Page is about"):
declared fields and the page record, read by Core for the Module's tree and a stored override alike; the
`record-field` Inspector field; Simple Text, Markdown, Image and the Button's signal value bound to a
field, the Gallery on `pictures`, the Button's link on a `link` field; and the Builder's Preview of a
template, which takes the first sample the record Provider offers (`loadSamples`). Not built: a sample
picker and the canvas showing sample values (the Editor canvas shows each Widget's own content), Core
Widgets for `list` and `tag`, and the product page (phis-shop's next step). The Gallery's main picture with
thumbnails is built: the `thumbnails` option (LAYOUTING.md, "Carousel movement").

## What there is today

A dynamic route preset (`/shop/p/:slug`, `/<kind>/:slug`) is built only by its Module's `loadTree`.
The loader receives the route `params`, resolves the record, answers 404 for an unknown one and writes
the slug into each Widget's binding (`phis-shop/src/trees/product-page-tree.ts`,
`content-entry-public-page-trees.ts`).

- **Not editable as a template.** An override of a preset is stored once per preset identity
  (`ownerModuleId`, `presetKey`; `phis-server/src/db/site-pages.ts`) and replaces the loader, so a
  stored override would serve every slug with the slug frozen into its bindings. The Builder opens a
  preset page with `params: {}`, so the product loader answers `notFound()`.
- **No binding follows the address.** `PhiRuntimeDataProviderBinding.params` are fixed values from the
  Inspector, and the Widget runtime carries `request.searchParams`, not route params
  (`types/widget-runtime.ts`).
- **Few Core Widgets show a record's field.** `simple-text`, `image`, `page-title` and `card` read
  their own config. `gallery` is bound to the Media folder provider only. The `record` Widget reads a
  client table provider, fed by a row signal. `entry-header` and `entry-detail` are for content entries
  only.

## The shape

1. **A dynamic preset declares its page record.** Next to `loadTree`, the descriptor names a record
   provider and how the route fills its params (the shop: the product provider, `slug` from `:slug`).
   Core resolves it once per request, answers 404 when it is missing, and takes the page title and
   description from fields the preset names; `runtime.page.record` carries those two names with the
   binding, so a Widget such as the Breadcrumb can read the title field itself. The loader stays as the template's starting tree.
2. **One template per preset.** The override that exists per preset identity becomes the template: it
   stores no slug, only Widgets bound to the page record, so it serves every record. Reset deletes it and
   the Module's tree answers again.
3. **Widgets bind to fields of the page record.** A text, image, gallery or tag Widget gets one more
   source, "field of the page record", in the Inspector. Fields come from the record provider's
   declared field list (key, label, kind: text, markdown, picture, pictures, list, tag). A Button's
   value can name a field as well (add to cart with the record's slug).
4. **The Builder previews with a sample record.** Opening a template asks which record to show,
   from a sample list the provider offers; without one the page shows the template's empty state, not 404.
5. **Domain formatting stays in the Module.** A price depends on currency, tax listing and billing
   period, which only the shop knows. The provider hands it over as a formatted field, and Core only shows
   text.

The same mechanism makes the content entry detail pages editable, and is what a Module providing its
own record pages uses.

## The product page as the first template

```
┌──────────────────────────────┬──────────────────────────┐
│  main picture                │  title                   │
│                              │  short description       │
│                              │  price   [in stock]      │
│  ▢ ▢ ▢ ▢  thumbnails         │  (later: tier choice)    │
│                              │  [add to cart]           │
├──────────────────────────────┴──────────────────────────┤
│  description (Markdown), features                       │
├─────────────────────────────────────────────────────────┤
│  more products of the same category (Core Card)         │
└─────────────────────────────────────────────────────────┘
```

A Core Grid, two columns from the 987 "wide" threshold, stacked below it. The Core Gallery draws a main
picture with thumbnails through its `thumbnails` option (one picture visible). The
related products need the shop's product list rebuilt on the Core Card collection, which is due anyway.

## Decided (owner, 2026-11-15)

- **Field bindings, not placeholders.** A Widget names a field of the page record; nothing writes the
  record's address into binding params. Placeholders would have been the smaller change, but text, image
  and title Widgets still could not show a field, and the template would have to carry the address.
- **Declared field kinds, strict.** A record provider declares its fields: `text`, `markdown`,
  `picture`, `pictures`, `list`, `tag`, and `date`, `number` and `link` -- Core formats a date and a number
  in the page's language, and a link is what a licence's download or a record's own page is. A Widget
  handed a field of a kind it does not draw is a config error the Builder shows. Free paths into the
  record were the alternative: nothing for the Inspector to offer, and errors only on the page.
- **Formatted fields from the Module, no Core price Widget.** A price is a `text` field the shop
  formats. A Core price Widget is proposed only once a second Module shows prices and text is not enough.
- **A Page stored at an exact record path wins over the template**, as today, so one record can have a
  Page of its own.
- **A provider says whose its record is.** `public` (a product: the same for everybody, so the page may
  be rendered once) or `viewer` (a licence, an order: the signed-in account's own, rendered per request).
- **One field declaration for the page and for lists.** The same declared fields are what a card
  collection of such records will bind to ("more products", "my licences"). Only the single page is built
  now; the declaration is cut so a list can reuse it.
