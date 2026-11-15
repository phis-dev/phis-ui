# Record template pages

A page that shows one record of many -- a product, a content entry, an order -- laid out once in the
Builder, so that changing the template changes the page of every record. Decided by the owner
(2026-11-15): the template is a general `@phis/ui` capability, any Module can provide one, and authors
rebuild it in the Builder. Nothing of it is built.

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
   description from fields the preset names. The loader stays as the template's starting tree.
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

A Core Grid, two columns from the 987 "wide" threshold, stacked below it. Whether the Core Gallery can
draw a main picture with thumbnails is to be checked; if not, it is a proposal for a Gallery variant. The
related products need the shop's product list rebuilt on the Core Card collection, which is due anyway.

## Open

- Field bindings to a page record (recommended) or placeholders in binding params.
- The field kinds a record provider declares, and how a Widget refuses a field of the wrong kind
  (strict config readers: a wrong type is an error the Builder shows).
- Formatted fields from the Module (recommended for prices) or a Core price Widget.
- Whether a Site Page stored at an exact record path (`/shop/p/foo`) still wins over the template, as
  today.
