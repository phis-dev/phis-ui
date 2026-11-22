# Third-party Site Module guide

This guide is the practical entry point for building a Site Module package against `@phis/ui`: package
structure, identifiers, Controllers, Widgets, Theme presets, Preset Forms, the Pages a Module brings
([section 6a](#6a-pages-a-module-brings)), the fixed package exports, building, installing, and
verification.

The contracts it applies are:

- [MODULES.md](./MODULES.md) -- Module ownership, activation, loading, presets and addresses;
- [SIGNALS.md](./SIGNALS.md) -- signal capabilities, routes, and addresses;
- [FORMS.md](./FORMS.md) and [components/forms/PRESET_FORMS_HOWTO.md](./components/forms/PRESET_FORMS_HOWTO.md)
  -- Forms;
- [TABLES.md](./TABLES.md), [TREES.md](./TREES.md), [COLLECTIONS.md](./COLLECTIONS.md) -- Provider-backed
  data Widgets;
- [THEME.md](./THEME.md) -- Theme presets and blocks;
- [NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md) -- the consuming Next.js Site;
- [STATIC_RENDERING.md](./STATIC_RENDERING.md) -- how Public pages are rendered once for every
  anonymous visitor;
- [ACCESS.md](./ACCESS.md) and [AUTHENTICATION.md](./AUTHENTICATION.md) -- viewer access, Add-on roles,
  and Auth replacement.

`@phis/example` in the Phi workspace (`phis-example`) is the reference package. It follows every rule
here: one Module with routes, a navigation injection, Theme presets and blocks, a `./fonts` boundary, and
all fixed exports. It owns no Widget and no Controller; the Widget and Controller examples below show
those parts.

## Before you start: the Foundation's Widgets and Controls come first

This holds for every Page and every Area -- Public, App and staff alike -- and for every part of a Widget
of your own:

1. **A Page is composed from Core Widgets first.** A list, a row of cards, a form, a button, a heading, a
   picture: if a Core Widget draws it, your preset places that Widget on your Module's provider or
   Controller ([section 4b](#4b-place-core-widgets)). A Widget of your own is for what no Core Widget
   draws at all.
2. **A Widget of your own is drawn from the Foundation's Controls**, never from Ant Design or hand-built
   markup, and never as a second version of something a Core Widget already draws.
3. **Where a Core Widget or Control lacks something, there is no quick solution of your own.** Not a
   Widget of yours that draws it a little differently, not a wrapper that patches it from outside. It is
   a finding for `@phis/ui`, put to the operator as a proposal: what the Core Widget or Control would
   have to gain, or what a new Core Widget would have to look like -- its configuration, what it reads
   from a provider, and which existing Widgets it sits beside. The operator decides; until then the gap
   stays open rather than being closed in your package.
4. **Arrangement and spacing are the Foundation's as well.** A preset composes the Layouts the Foundation
   has -- Flex, vertical Flex, Grid, Split Card and the rest ([Layouts](#layouts)) -- and sets their
   documented configuration: `gap`, `padding`, `anchor`, `ratio`, columns. It invents no spacing, no
   wrapper structure and no placement rule of its own, and a package's own content model or tree
   builder is no place to grow one either: a new option there that the Foundation does not have is a
   new Layout in disguise. Where the Layouts' configuration does not reach what a Page needs, ask the
   operator before building anything; the answer is either a configuration that already exists or a
   finding for `@phis/ui`.

   The reason is the Builder. A Page a preset lays out is a Page somebody edits later, with the Builder's
   Layouts, Widgets and Inspector fields and nothing else. What a preset composes from those stays
   editable there: the gap of a vertical Flex, the ratio of a Split Card, the Widget in a slot. What a
   package invents for itself has no form in the Builder -- it cannot be seen as what it is, changed or
   rebuilt, and the next edit undoes it or cannot reach it. This holds for presets written by hand and
   by an AI alike: only what the Builder can express is built.

5. **A collection is a `collection-view` on your Provider, drawn by a shipped renderer.** A Collection
   View is meant for any data source; what your Module brings is the Provider (what it reads, which
   actions it has), not a renderer. Items that are Assets of the Media library -- a gallery, a set of
   pictures, attachments -- name the Media renderer (`PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY`) as the
   resource's `itemRendererKey` and are answered in its item shape; records shown as cards use the card
   View. A renderer of your own is for items no shipped renderer draws
   ([COLLECTIONS.md](./COLLECTIONS.md#one-collection-view-for-every-source-shipped-renderers-first)).

`@phis/shop`'s catalogue is what breaking this looks like: its product list is a Widget of its own that
draws cards the Core Card Widget already draws as a Collection (`body: "plan"`), with its own price line
and its own button. It lines up differently, misses what the Card gains, and has to be rebuilt. Its first
listing gallery (0.8.13) was the same mistake one level down: a Render Client of its own drawing
`PhiMediaAssetTileControl`s with its own confirm dialog, empty state and words, and a Form beside it to
add a picture -- a copy of the Media renderer with neither its upload wall nor its picker. It is now the
Shop's Provider drawn by the Media renderer.

## Before you start: what the Foundation already has

Look here before you ask for anything. What follows lists what exists, so a missing piece is a real one and
not one that was only hard to find. It names things and points at the document that explains each; it does
not repeat them. Every typeKey and Control name below is checked against the code by
`plugins/runtime-modules/third-party-modules-reference.test.ts`, the Widgets and Form field types of
every Module declared `activation: "always"` included.

The Foundation is Core and the Modules that are active in every Area. A domain's capabilities are its
owning Module's, so a Media question is answered by the Asset Module ([Media](#media-what-the-asset-module-already-does)),
not by the one field or Widget you started from. How to check before you call something missing is in
[AGENTS.md](./AGENTS.md#before-you-call-something-missing).

### Layouts

A Layout arranges the Widgets and Layouts in its slots. Every one takes the shared `padding` field (the
Paddings panel, which also holds the gap between slots) and a `surface` (what its box looks like). The
contract is [LAYOUTING.md](./LAYOUTING.md); the definitions are `components/layouts/layout-definitions.ts`.

| typeKey | Title | For | Main config |
| --- | --- | --- | --- |
| `content` | Content | A neutral full-width wrapper with one slot. | `padding` |
| `flex` | Flex | Slots in a row. | `distribution`, `wrap`, `verticalSeparators`, `separatorBeforeFirst`, `separatorSpan` |
| `flex-vertical` | Flex Vertical | Slots in a column; the Page column is one. | `padding` |
| `collapsible` | Collapsible | One collapsible panel per slot, titles kept on the Layout. | `defaultOpenSlotKeys`, `accordion`, `ghost`, `slotDescriptions`, `collapseSize`, `headerPadding`, `innerPadding` |
| `stack` | Stack | One slot at a time (tabs, steps), or all slots piled in one box. | `slotDisplay` (`single`/`stacked`), `defaultActiveSlotKey`, `mountPolicy`, `slotTransition` |
| `carousel` | Carousel | A run of slots shown a few at a time, moving on their own or on a signal. | `visibleSlots`, `windowAnchor`, `transition`, `slotGap`, `controls`, `loop`, `autoplayMs` |
| `grid` | Grid | Slots in rows, as many to a row as the width allows. | `columns` (per width, with span and offset) |
| `masonry` | Masonry | Slots in columns at their own heights, without rows. | `columns` |
| `split-card` | Split Card | Two cards side by side (golden ratio, 50/50 or 20/80), one Surface for both. Surface is a creation value, not a default; how it reads in a Preset: [LAYOUTING.md](./LAYOUTING.md#layout-config). | `ratio`, `swapRatio`, `padding`, `surface` |
| `three-column` | Three Column | Fixed left, middle and right slots. | `balancedSides`, `sideShare`, `leftWidth`, `middleWidth`, `rightWidth` |

- A box around an area is the Layout's `surface`, not a Widget: `PHI_SURFACE_CARD` (container ground, quiet
  line, soft shadow) and `PHI_SURFACE_WASH` (the Theme's quietest filling) from `@phis/ui/helpers`, and
  `padding` for the inset ([LAYOUTING.md](./LAYOUTING.md), "Surface").
- Distances between sections, inside a surface and at the Page edge are fixed by
  [6b. Laying out a Page](#6b-laying-out-a-page).
- `structure-region` and `page-region` are the Builder's own preview Layouts and are not offered to
  authors.

### Core Widgets

Place these by type key ([4b](#4b-place-core-widgets)). The last column says which field of the record a
Page is about the Widget can show or follow instead of its own value
([Records a Page is about](#records-a-page-is-about)); the words in brackets are the field kinds it accepts.
A dash is no binding. The text is each Widget's own `description`; its `fields` are what the Inspector
offers.

The last column says whether a Preset's `config` for the Widget is checked at compile time. `typed` is a
Widget in `PhiCoreWidgetPlacements` (`types/core-widget-placements.ts`, [4b](#4b-place-core-widgets)):
a misspelt key or a value outside its vocabulary fails to compile. `unchecked` is every other Core Widget --
among them `gallery`, `breadcrumb`, `page-title` and `markdown-toc`, and `card`: its config is a plain
record, so a wrong key is dropped without a word. Read its `config.ts` for the fields it takes, and give
the config a type of your own with `satisfies`.

**Content**

| typeKey | What it draws | Record binding | Preset config |
| --- | --- | --- | --- |
| `simple-text` | Plain text or one link, with icon, `fontSize`, `tone`, `marks` and more. | `recordField` (text, number, date) | typed |
| `description` | An introductory block: `eyebrow`, `title`, body, a list, a footer. | - | typed |
| `markdown` | Local or remote Markdown. | `recordField` (markdown, text) | typed |
| `markdown-toc` | An anchor table of contents for a Markdown Widget. | - | unchecked |
| `html` | HTML-backed editorial text (Rich Text). | - | typed |
| `card` | A card with a picture or an icon, a heading or a figure, and a link. | - | unchecked |
| `image` | An image from local media, a trusted URL or a rendition. | `recordField` (picture) | typed |
| `gallery` | A run of pictures shown a few at a time, with arrows, dots and autoplay; with `thumbnails`, one main picture with a row of small ones under it ([LAYOUTING.md](./LAYOUTING.md#carousel-movement)). | `recordField` (pictures) | unchecked |
| `icon` | A standalone icon. | - | typed |
| `spacer` | Takes the room left over on the main axis of its Flex row or column; Spacers share it. | - | typed |
| `result` | A compact result state. | - | unchecked |
| `timeline` | What happened, in order: time, title, a line of text. | - | unchecked |
| `steps` | Where a sequence stands; can follow and drive a Stack. | - | unchecked |

**Navigation and shell**

| typeKey | What it draws | Record binding | Preset config |
| --- | --- | --- | --- |
| `header-navigation` | The horizontal site menu. | - | unchecked |
| `sidebar-navigation` | The vertical site menu. | - | unchecked |
| `quick-links` | A link list from a selected navigation key. | - | unchecked |
| `breadcrumb` | A breadcrumb trail: Site name, Area, then the segments of the request's path; on a record Page the last one is the record's title where its route names a `titleField`, else the slug ([components/widgets/README.md](./components/widgets/README.md#content-widgets)). | - | unchecked |
| `page-title` | The current localized Page title. | - | unchecked |
| `brand` | The Site's brand mark and wordmark. | - | unchecked |
| `account` | The viewer's account control, guest or signed in. | - | unchecked |
| `locale` | The locale switcher. | - | unchecked |
| `theme-mode-switch` | Switches the Site between light and dark. | - | typed |
| `tour-button` | Starts the Tour of the shown Page; hidden where there is none. | - | unchecked |

**Controls** (they report their state as signals, [SIGNALS.md](./SIGNALS.md))

| typeKey | What it draws | Record binding | Preset config |
| --- | --- | --- | --- |
| `button` | A command button that emits a configured signal. | `valueRecordField` (text), `linkRecordField` (link) | typed |
| `command-toolbar` | A toolbar of commands; `compact` joins them into one group. | - | typed |
| `float-button` | Buttons fixed to a corner of the viewport. | - | unchecked |
| `input` | A simple text input. | - | unchecked |
| `number-input` | A numeric input. | - | unchecked |
| `slider` | A scalar slider. | - | unchecked |
| `rate` | A rating. | - | unchecked |
| `checkbox` | A boolean checkbox. | - | unchecked |
| `checkbox-group` | A multi-choice checkbox group, static or provider-backed options. | - | unchecked |
| `switch` | A boolean switch. | - | unchecked |
| `select-box` | A select. | - | unchecked |
| `multi-select` | A multi-select. | - | unchecked |
| `segmented` | A segmented control. | - | unchecked |
| `tab-bar` | A tab control that emits state and can drive the slots of a Stack. | - | unchecked |
| `cascader` | A writable cascader. | - | unchecked |
| `date-input` | A date, period, date-time or range input. | - | unchecked |
| `color` | A colour control. | - | unchecked |
| `length` | A numeric CSS length with a unit. | - | unchecked |
| `dimension` | Width and height with explicit CSS units. | - | unchecked |
| `otp` | A fixed-length code, one character per cell. | - | unchecked |
| `pagination` | A pagination control that emits page state. | - | unchecked |

**Data, forms and entries**

| typeKey | What it draws | Record binding | Preset config |
| --- | --- | --- | --- |
| `table` | A provider-backed table with columns, rows and actions ([TABLES.md](./TABLES.md)). | - | typed |
| `tree` | A provider-backed hierarchical tree ([TREES.md](./TREES.md)). | - | unchecked |
| `collection-view` | A provider-backed visual collection with tools and pagination ([COLLECTIONS.md](./COLLECTIONS.md)). | - | typed |
| `record` | One row of a Table Provider as named values, opened by a row action; runs that row's Provider actions on a press ([TABLES.md](./TABLES.md#the-record-widget)). | - | unchecked |
| `form` | A Preset Form a Module contributes ([FORMS.md](./FORMS.md)). | - | typed |
| `form-preview` | What the token in the address is about, beside the form that spends it. | - | unchecked |
| `slot-upload` | Puts a file into a declared slot on a row of an Add-on's table: a drop area, and the slot's files with preview and remove ([below](#slot-upload-files-on-a-row)). | - | unchecked |
| `draft-status` | Whether a Controller's draft is unsaved, saved or published. | - | typed |
| `entry-list` | A content kind's published entries ([CONTENT_ENTRIES.md](./CONTENT_ENTRIES.md)). | - | unchecked |
| `entry-header` | The opening of one entry: category, title, subtitle, author, date. | - | unchecked |
| `entry-detail` | The text of one published entry. | - | unchecked |
| `thread-conversation` | The selected conversation: messages, authors and what hangs on them ([THREADS.md](./THREADS.md)). | - | typed |

#### `slot-upload`: files on a row

The field for an Add-on's image slot (`@phis/shop`: the cover `cover`, the offer pictures `image`). Config is
unchanged: `addon`, `table`, `slot`, optional `ownerParam` and `label`; the row arrives as a Signal. What the
slot takes -- content types, ceiling, one file or many -- is asked from Core, never configured.

- It draws the same drop area as the Media folder: files are dropped on it or chosen by pressing it (it is
  a focusable button, Enter and Space open the dialog), and the dialog offers the slot's types and, for
  cardinality `many`, several files. It stays disabled until the slot has answered, so no file goes up
  unchecked.
- The slot's rules (type, size, one or many) are checked before anything is sent, as before. A refusal
  shows as an alert; an upload on its way shows as a line with its percentage or "Failed" and Retry.
- A slot of cardinality `one` takes one file; a new one replaces the old one at Core (the client sends the
  file and reads the row's files again; it removes nothing itself). The list below the area keeps the
  slot's files with a preview and a remove button.
- The area's title and hint, the state words and the refusals are the Media upload surface's texts (Core's
  Label Set `widget:upload`, keys `area_drop_title`, `area_drop_hint`, `area_retry_label`,
  `area_failed_label`, ...; `getPhiMediaUploadLabels(...).upload`), so a translation is written once. The Widget's own Label Set `widget:slot-upload` keeps the rest.
- Transport is `usePhiMediaUpload`, the one the Media folder and the form field `upload` use.

### Controls a Module's own Widget may use

`@phis/ui/controls` (`controls.ts`) is the only place a Widget of your own takes interactive parts from; the
rules are in [components/widgets/README.md](./components/widgets/README.md#controls). The ones you will
reach for first:

| Control | For |
| --- | --- |
| `PhiButtonControl` | A button. |
| `PhiNumberControl` | A numeric field, with the unit shown inside it. |
| `PhiTextControl` | A text field; `presentation` picks the shape, such as a textarea. |
| `PhiTypographyControl` | Text, headings, paragraphs and links; `PhiTextControl` is the input, not this. |
| `PhiTagControl` | A coloured mark: `color`, a Theme `gradient`, `variant`, optional `closable`. |
| `PhiToolbarControl` | A row of commands, compact (joined into one group) by default. |
| `PhiCompactGroupControl` | Any Controls joined into one group with shared edges: a number field and its button. |
| `PhiEntryListControl` | A short list of things, one per line: a title, a line about it, a state and one action; it says its own empty state. Not for rows that page. |
| `PhiAmountListControl` | Lines and sums whose amounts stand in one right-aligned column with equal-width digits: a cart, a checkout, an order, a receipt. Display only ([below](#phiamountlistcontrol-amounts-in-one-column)). |
| `PhiFileDropControl` | A file dialog and a drop area, nothing more: it hands you the files, it uploads nothing ([below](#phifiledropcontrol-the-drop-area)). |
| `PhiPlacementMatrixControl` | A 3 by 3 matrix that picks one of the nine anchor placements (`value`, `onChange`). |
| `PhiFlexControl` | Arranges the parts inside one leaf. Several Widgets side by side are Layout slots, not this. |
| `PhiCardControl` | A bordered box with an optional heading bar, on the Theme's inset and corner. |
| `PhiEmptyControl` | The "nothing here" state; never Ant Design's `Empty`. |
| `PhiDialogControl` | A dialog built in code. A dialog around a tree of Widgets is an Overlay ([Dialogs](#dialogs)). |
| `PhiSelectControl`, `PhiSegmentedControl`, `PhiSwitchControl` | Choosing and switching. |
| `PhiImageControl` | A picture, resolved as the Image and Card Widgets resolve it. |
| `PhiSkeletonControl`, `PhiAlertControl` | Loading and inline feedback. |

The complete list of values `@phis/ui/controls` exports, by group (the types that go with them are exported
beside them):

- Text and input: `PhiTextControl`, `PhiLabeledControl`, `PhiNumberControl`, `PhiSliderControl`,
  `PhiRateControl`, `PhiOtpControl`, `PhiDimensionControl`, `PhiLengthControl`, `PhiColorControl`,
  `PhiIconPickerControl`, `PhiColorFieldControl` (the colour field with the Site's Theme and custom
  colours as presets, a Theme default and, if asked, a Theme role stored instead of a colour),
  `PhiMoneyControl` (an amount in minor units with its currency), `PhiBoundRadiusControl`,
  `PhiPresetSizeControl` (the Inspector's corner radius and size-step fields).
- Choosing: `PhiSelectControl`, `PhiMultiSelectControl`, `PhiSegmentedControl`, `PhiSwitchControl`,
  `PhiCheckboxControl`, `PhiCheckboxGroupControl`, `PhiRadioGroupControl`, `PhiCascaderControl`,
  `PhiTreeCascaderControl` (several nodes of a tree you hand it, such as Pages), `PhiTreeSelectControl`.
- Commands and menus: `PhiButtonControl`, `PhiToolbarControl`, `PhiCompactGroupControl`,
  `PhiViewportVisibilityControl`, `PhiPlacementMatrixControl`, `PhiEntryListControl`, `PhiAmountListControl`,
  `PhiFileDropControl`, `PhiFloatButtonControl`, `PhiDropdownControl`,
  `PhiPillDropdownControl`, `PhiMenuControl`, `PhiConfirmControl`, `PhiPopoverControl`, `PhiTabsControl`,
  `PhiPaginationControl`, `PhiBreadcrumbControl`, `PhiAnchorNavControl` (in-page targets that light up
  as they are reached).
- Display: `PhiTypographyControl`, `PhiTagControl`, `PhiCardControl`, `PhiFlexControl`, `PhiEmptyControl`,
  `PhiSkeletonControl`, `PhiAlertControl`, `PhiStepsControl`, `PhiTimelineControl`, `PhiImageControl`,
  `PhiVideoEmbedControl`, `PhiBulletListControl` (a list with the Theme's markers; an entry's `state`
  draws a tick for included and a dash for excluded, as a plan card's features), `PhiDescriptionListControl`
  (named values about one thing), `PhiDividerControl`, `PhiStatisticControl`, `PhiProgressControl`,
  `PhiSpinControl`, `PhiAvatarControl`, `PhiStatusDotControl` (a state as a dot, its word in the tooltip),
  `PhiNameControl` (a graphic that says what it is, such as an icon as a column header),
  `PhiResultControl` (the end of a journey: an outcome and what to do now), `PhiRibbonControl`,
  `PhiRibbonWrapControl` (a band on a box's corner), `PhiQrCodeControl`, `PhiSeriesChartControl` (figures
  over time as lines), `PhiCollapseControl` and `PhiAccordionControl` (sections that fold; a Page's own
  folding sections are the Collapsible Layout).
- Dialogs and forms: `PhiDialogControl`, `PhiFormControl`.
- Data: `PhiTableControl`, `PhiTreeControl`, `PhiTreeActionButton`, `PhiCollectionLayoutControl`,
  `PhiCollectionHeaderControl`, `PhiCollectionViewControl`, `PhiMediaPickerControl`,
  `PhiMediaAssetTileControl` (its `asset` is `PhiMediaAssetTileControlAsset`, the fields a tile reads,
  so an Asset in a shape of your own with those fits, and `onSelect`/`onDelete` hand it back as passed),
  `PhiMediaAssetCollectionSkeletonControl`, `PhiMediaSourceItemTileControl`,
  `PhiMaskPickerControl`,
  `PhiDragHandleControl`. A list of records is a `table` Widget on a provider, not a `PhiTableControl` of
  yours ([a staff page is composed](#before-you-start-a-staff-page-is-composed-not-drawn)).
- Configuration editors: `PhiBackgroundControl`, `PhiBorderControl`, `PhiPaddingControl`,
  `PhiShadowControl`, `PhiSurfaceControl`, `PhiGeometryControl`.
- Helpers and constants: `PHI_CONTROL_SIZES`, `PHI_FEEDBACK_LEVELS`, `readPhiControlSize`,
  `PHI_PICKER_PLACEMENTS`, `PHI_CONFIRM_PLACEMENTS`, `PHI_SLIDER_TOOLTIP_MODES`, `PHI_RATE_DEFAULT_COUNT`,
  `normalizePhiRateCount`, `normalizePhiRateValue`, `normalizePhiCascaderValue`, `readPhiTableControlValue`,
  `resolvePhiImagePresentation`, `PHI_ICON_PICKER_CONTROL_DEFAULT_LABELS`,
  `PHI_MEDIA_PICKER_COLUMN_WIDTH_STEP`, `PHI_MEDIA_PICKER_DEFAULT_COLUMN_WIDTH`,
  `PHI_MEDIA_PICKER_MAX_COLUMN_WIDTH`, `PHI_MEDIA_PICKER_MIN_COLUMN_WIDTH`,
  `normalizePhiMediaPickerMinColumnWidth`, `PHI_RADIUS_CONTROL_DEFAULT_LABELS`.

#### `PhiAmountListControl`: amounts in one column

Lines and sums of a cart, a checkout, an order, a subscription sign-up or a receipt, where every amount --
the items' and the totals' -- stands in one shared, right-aligned column with equal-width digits, so the
right edges are one line. It knows nothing about money, a shop or a currency: an amount is text you have
already formatted.

| Prop | Meaning |
| --- | --- |
| `items` | `PhiAmountListItem[]`: `key`, `title` (wraps), `description` (quiet second line), `media`, `controls` (free: a quantity field, a remove button), `amount`, `amountNote` (quiet, under the amount). |
| `totals` | `PhiAmountListTotal[]`: `key`, `label`, `amount`, `note`, `emphasis` (`normal` or `strong`), `divided` (a rule above, in the Theme's line colour). |
| `size` | `small`, `medium` (default) or `large`, as the other Controls. |
| `emptyText` | Stands in place of the list when there are no items and no totals. |
| `ariaLabel` | Names the list for screen readers. |

```tsx
<PhiAmountListControl
  ariaLabel="Your order"
  items={[
    { key: "a", title: "Annual plan", description: "per year", amount: "120,00 CHF" },
    { key: "b", title: "Extra seat", description: "2 x 12,00 CHF", amount: "24,00 CHF", controls: <MyQuantityField /> },
  ]}
  totals={[
    { key: "sub", label: "Subtotal", amount: "144,00 CHF" },
    { key: "total", label: "Total", amount: "144,00 CHF", note: "incl. VAT", emphasis: "strong", divided: true },
  ]}
/>
```

It is display. It has no data source, sorts, pages and edits nothing, and is not a replacement for the
Table Widget ([TABLES.md](./TABLES.md)); what a row can be operated with is whatever you pass as
`controls`. Below 30rem of the list's own width (a container query, not the viewport) an item becomes two
lines -- media and text, then controls and amount -- and the amounts stay in the same column. The items are
a list (`ul`) and the totals a description list (`dl`). It takes the width of its parent and has none of its
own, so give it a parent with a width, not a shrink-to-fit box. It renders on the server, so a Module's server half
may import it (it is not in `package.json#phis.clientExports`).

#### `PhiFileDropControl`: the drop area

A file dialog and, with `dropZone`, a framed area that also takes a drop. **It is the area; it uploads
nothing.** It calls `onFile` once per file chosen or dropped and holds no list, no progress and no state of
the transfer. The transport is not part of it: the Slot upload Widget (a file on an Add-on's row) and the
form field `upload` (a file in a Form) bring theirs, through `usePhiMediaUpload`.

| Prop | Meaning |
| --- | --- |
| `onFile` | `(file: File) => void`, once per file. Required. |
| `accept` | What the dialog offers, a MIME or extension list. A hint: whoever uploads is what refuses. |
| `multiple` | Several files in one choice or drop. Without it only the first is taken. |
| `disabled` | Takes no click and no drop. |
| `dropZone` | A framed area instead of a trigger. |
| `children` | The trigger, or the inside of the area. |
| `style`, `className` | Presentation. |

```tsx
<PhiFileDropControl dropZone accept="image/*" onFile={(file) => myUpload(file)}>
  <PhiTypographyControl>Drop a picture here or click</PhiTypographyControl>
</PhiFileDropControl>
```

The area is a focusable button, so Enter and Space open the dialog; it takes its accessible name from what you
put inside it, so put the text there. It is a Client Control (listed in `package.json#phis.clientExports`).
`PhiFileDropGuard`, which stops a file dropped beside an area from opening in the tab, is not exported: the
Media folder's drop area (`PhiUploadDropArea`) brings it, and a Module that needs the whole area takes
the Slot upload Widget or the form field instead of assembling one.

### What every block can do

Layouts, Widgets and Regions share `PhiRenderableBlockBase` (`types/renderable-block.ts`), and the slot frame
applies it to every Widget alike, so none of these is a field of your Widget. They are written in the
node's `config`, and [CMS.md](./CMS.md#renderable-blocks) describes them.

| Field | What it does |
| --- | --- |
| `visibility` | `visible`, `collapsed` (takes part with `collapsedSizeHint`) or `hidden` (takes no part in the layout). |
| `enabled` | `false` keeps the block but blocks interaction. |
| `size`, `minSize`, `maxSize` | Preferred and bounding width and height, each axis per screen profile ([LAYOUTING.md](./LAYOUTING.md#sizing-and-nesting)). |
| `anchor` | Where the block stands in its slot: `left`/`center`/`right`, `top`/`middle`/`bottom`. |
| `surface` | What the box looks like: ground, edge, depth. A Layout and a Region draw their own; a Widget's is drawn by its frame if its plugin says so ([LAYOUTING.md](./LAYOUTING.md#surface)). |
| `zIndex`, `opacity`, `className` | Stacking, transparency and the one supported styling hook. |
| `effects` | Entrance transitions and scroll-driven viewport effects (`PhiRenderableBlockEffects`). |
| `accessPolicy`, `viewportFlags` | Who sees the block and on which screen sizes ([ACCESS.md](./ACCESS.md)). |
| `capabilities` | Which interactions it takes part in: `selectable`, `draggable`, `hoverable`, `activatable`, `focusable`, `droppable`. |

A Widget's placement adds two more (`PhiWidgetPlacementBase`, [4b](#4b-place-core-widgets)):

- `visibleWhen` shows the Widget only while a condition holds. The condition reads one source: `row`,
  `form`, `controller`, `page`, `widget`, `feature` or `record` (`PHI_RUNTIME_CONDITION_SOURCES` in
  `@phis/contracts/conditions`), and judges it with `truthy`, `falsy`, `equals` or `contains`. The grammar
  is in [FORMS.md](./FORMS.md#conditions), and a condition on the query is why such a request is never
  static ([STATIC_RENDERING.md](./STATIC_RENDERING.md)). `record` reads a field of the record the Page is
  about, by its key, and is settled on the server
  ([MODULES.md](./MODULES.md#the-fields-of-a-record-and-the-record-a-page-is-about)).
- `signalRoutes` wires the Widget to the signal bus ([SIGNALS.md](./SIGNALS.md)). Runtime changes to the
  fields above travel as `visibility/change` and the other renderable-block signals
  ([SIGNALS.md](./SIGNALS.md#renderable-block-channels)).

### Media: what the Asset Module already does

The Asset Module (`@phis/ui/modules/asset`, `plugins/runtime-modules/asset/`) owns the Media library:
picking, uploading, Folders. It is active in every Area (`activation: "always"`), so everything below is
there wherever your Page stands, and none of it is in the Core table above.

| I need | Use | What it gives back | Code |
| --- | --- | --- | --- |
| An author picks one Asset in a Form (a logo, a cover), or uploads it right there | form field `media-asset` | The Asset id as a number, `null` for none; Site Space only. Its picker uploads a file into the Folder it shows, which is chosen then; `folderPath` (`"Shop Images / Products"`, or with Form values in it, `"Shop Images / {category} / {product}"`) is the Folder it opens on (the deepest part that exists; read only), the missing Folders created by the first upload into it. | `asset/form-providers.ts`, `asset/media-asset-form-control.tsx`, [FORMS.md](./FORMS.md#field-and-validation-providers) |
| Several pictures on a record (a product's gallery, a post's pictures), edited in its Form and saved with it | form field `media-assets` | The Asset ids in the order shown, `[]` for none; Site Space only. The Media tiles with remove (only out of the value) and drag order, "Choose from Media library" and the Media library's upload wall (what arrived joins the value); `folderPath` as `media-asset`'s, `max` the most it holds (up to 100). | `asset/form-providers.ts`, `asset/media-assets-form-control.tsx`, [FORMS.md](./FORMS.md#field-and-validation-providers) |
| Somebody attaches a file to a Form | form field `upload` (Core) | The Asset ids of the finished uploads; `space` picks the Site's or the viewer's Space, not a Folder. | `components/forms/upload-form-control.tsx`, [FORMS.md](./FORMS.md#field-and-validation-providers) |
| Files dropped into a Folder on a Page | Widget `area-upload` | Uploads into the Folder its `folderPath` names (a path of names in the Site Space, `"Shop Images / Products"`, resolved at each upload, missing Folders created on the first), without one into the Folder the Asset Controller holds, inside the Media library into the open one; an upload wall with delete. Demands the Asset Controller and the Media collection Provider. | `asset/widgets/area-upload/`, `components/media/phi-area-upload-widget.tsx` |
| A Media library: Folders, upload, new Folder, lock | Widget `collection-view` with the Media renderer, as the Builder's Media page (`builder-media-page`) places it | Uploads into the open Folder; creating and locking a Folder are its actions. | `core/widgets/collection-view/asset-binding.tsx`, `asset/trees/phi-default-builder-media-page-tree.ts`, [COLLECTIONS.md](./COLLECTIONS.md#the-media-renderer) |
| A collection of Assets my Module keeps (a gallery of references) as a list that acts at once -- every upload, pick, removal and drop written as it is made, no Save -- with upload, choosing from the library, removing and ordering; for a record's pictures edited with the record, the `media-assets` field above | Widget `collection-view` on your collection Provider whose resource names `PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY`; items as `PhiMediaCollectionItem`; actions `add` (`itemKeys`, Asset ids), `delete`, `reorder`, `upload` (`panelKey: "upload"`); placement `features.media` (`folderPath` with `{param}` from the binding params, `mediaType`), toolbar actions `upload` and `add`, the delete's words in `presentation.labels.grid` | The Media library's own upload wall (what arrived is added through `add`), its picker on the same Folder, its tiles; no renderer of yours. | [COLLECTIONS.md](./COLLECTIONS.md#the-media-renderer), `@phis/shop` `manage/gallery/provider.ts` |
| Browse and choose on a Page, wired to other Widgets | Widget `media-picker` | Emits `selection` (`PhiMediaAssetSelection`: `assetId`, `asset`, `variantKey`), `path`, `query`, `pagination`. Imports a media source's item into the Folder it shows; uploads no local file. | `asset/widgets/media-picker/`, `components/media/phi-media-picker-binding.tsx` |
| A picker inside a Widget of mine | `PhiMediaPickerControl`, controlled | What you pass it; the binding that feeds it is internal ([Offering an image picker](#offering-an-image-picker)). | `@phis/ui/controls` |
| A picture's details and focal rectangle | Widgets `image-inspector`, `asset-focal-rect`; form field `focal-rect` (`@phis/ui/modules/asset/form-field/focal-rect`) | The Builder's Media page inspector and its Form. | `asset/widgets/`, `asset/metadata-form.ts` |
| A file in a slot of an Add-on's row | Core Widget `slot-upload` | The slot's files. | [`slot-upload`](#slot-upload-files-on-a-row) |
| The picture of the record a Page is about | A `picture`/`pictures` record field, drawn by `image` or `gallery` with `recordField` | `{ src, alt? }` per picture. | [Records a Page is about](#records-a-page-is-about) |
| The pictures of one Folder | `gallery` on Core's `folderImages` Provider (no Asset Module needed) | The Folder's public pictures, with its subfolders. | [MODULES.md](./MODULES.md#record-providers) |
| Pictures my package ships | `phis.media` in `package.json` | Media Assets on the Site. | [Pictures a Module ships](#pictures-a-module-ships) |
| Files from somewhere else (a DAM, a stock archive) | A media source | Imported Assets. | [Offering a media source](#offering-a-media-source) |

Every upload goes the same way: `usePhiMediaUpload` and `runPhiMediaUploadSession`
(`components/media/phi-media-upload.ts`, `components/media/media-upload-flow.ts`, both internal) take a Space
and a `folderId` and call Core's `POST /api/site/media/uploads/init` (`folderId` in the body, `spaceId` in
the query), then the bytes, then finalize. A `folderPath` instead of a `folderId` is resolved in the Site
Space first, over Core's `GET`/`POST /api/site/media/folders` (`resolvePhiMediaUploadFolderPathId`); a
Folder that cannot be created below a locked one reads as the lock refusal. The `media-asset` field's picker
sends its file the same way, with the Folder it shows as the `folderId` and no Space named, so it lands in the
Site Space, whose Assets Core delivers publicly from the start (the init takes no delivery policy). An Add-on
that reserved a place with `assets:v1` uploads with `runPhiAddonAssetUpload` from `@phis/ui/media`.

Known gaps ([TODOS.md](./TODOS.md), "Media and Theme"):

- `usePhiMediaPickerBinding` is not a public door, so a picker outside a Form is the Foundation's to give.

### I need ... use ...

| I need | Use | Where |
| --- | --- | --- |
| Two cards side by side | Layout `split-card` (the cards are its Surface) | [LAYOUTING.md](./LAYOUTING.md#layout-config) |
| A box around an area | `surface` on the Layout (`PHI_SURFACE_CARD`, `PHI_SURFACE_WASH`), with `padding` | [LAYOUTING.md](./LAYOUTING.md#surface) |
| Hide a section | The block's `visibility` (`visible`, `collapsed`, `hidden`) | [CMS.md](./CMS.md#renderable-blocks) |
| A section that is absent when the record has no content for it | Widgets bound to fields that exist only with content; `visibleWhen` on `record` where its frame and gap should go too | [MODULES.md](./MODULES.md#the-fields-of-a-record-and-the-record-a-page-is-about) |
| Read a record field in a Widget of mine | `resolvePhiPageRecordFields`, then `result.fields.get(key)` | [MODULES.md](./MODULES.md#the-fields-of-a-record-and-the-record-a-page-is-about) |
| A picture of a record | A `picture`/`pictures` field whose `src` is an `http(s)` URL or a Site path; no `data:` URI, no file of the Module | [MODULES.md](./MODULES.md#the-fields-of-a-record-and-the-record-a-page-is-about) |
| Show a section only when something holds | `visibleWhen` on the Widget | [FORMS.md](./FORMS.md#conditions), [4b](#4b-place-core-widgets) |
| A coloured mark in a Widget of mine | `PhiTagControl` | `@phis/ui/controls` |
| A coloured mark in a Core Widget template | `simple-text` with `tone` (`secondary`, `success`, `warning`, `danger`) and an `icon` | `simple-text/config.ts` |
| A heading | `simple-text` with `fontSize` and `marks`, or `description` (`eyebrow`, `title`) | `simple-text/config.ts`, `description/config.ts` |
| A quantity to choose | Widget `number-input`; `PhiNumberControl` in a Widget of mine | `@phis/ui/controls` |
| Controls joined into one group | Widget `command-toolbar` with `compact`; `PhiToolbarControl` for commands or `PhiCompactGroupControl` for any Controls in a Widget of mine | `command-toolbar/config.ts`, `@phis/ui/controls` |
| A value from the record the Page is about | `recordField`, `valueRecordField`, `linkRecordField` on the Core Widget | [Records a Page is about](#records-a-page-is-about) |
| Several pictures | `gallery` | `gallery/config.ts` |
| A main picture with thumbnails under it | `gallery` with `thumbnails` and one picture visible | [LAYOUTING.md](./LAYOUTING.md#carousel-movement) |
| A picture | `image`; `PhiImageControl` in a Widget of mine | `image/config.ts` |
| An author chooses a picture in a Form | form field `media-asset` (the Asset id) | [Media](#media-what-the-asset-module-already-does) |
| An author chooses several pictures in a Form, in order | form field `media-assets` (the Asset ids) | [Media](#media-what-the-asset-module-already-does) |
| Upload files into a Media Folder | Widget `area-upload`, or the Media library page | [Media](#media-what-the-asset-module-already-does) |
| A list or table of records | `table` on a provider you register | [TABLES.md](./TABLES.md) |
| Records as cards | `collection-view` (the Card Widget as a Collection) | [COLLECTIONS.md](./COLLECTIONS.md) |
| Media library Assets as a collection of my Module's (a gallery) | `collection-view` drawn by the Media renderer (`PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY`), never a renderer of your own | [COLLECTIONS.md](./COLLECTIONS.md#the-media-renderer) |
| A Collection for the record a Controller opened it for (a dialog with one listing's pictures) | `collection-view` with a listen route `capabilityId: "bindingParamsChange"`; the Controller sends `{ params: { id } }`, laid over `source.params` and handed to your Provider, the list read again from the first page | [COLLECTIONS.md](./COLLECTIONS.md#loading-and-signals) |
| Records a reader drags into an order | `collection-view` with `features.reorder` (`{ enabled: true, actionKey? }`, grid or stack): a drop calls your collection Provider's action (`"reorder"` unless `actionKey` names another, declared `scope: "resource"`) with `itemKeys`, every item key of the collection in the new order, keys read at the resource's `itemIdentityPath`. Store the order and answer the collection as it now stands, or refuse (throw, or answer `error`): the Widget shows the order at once and takes it back on a refusal. Off while a search or a reader's filter narrows the list and while it spans more than one page | [COLLECTIONS.md](./COLLECTIONS.md#drag-reordering) |
| A form | The `form` Widget on a Preset Form | [FORMS.md](./FORMS.md), [6](#6-add-a-preset-form) |
| Where the reader is | `breadcrumb` (Site, Area, path segments; the last one the record's title on a record Page) | [components/widgets/README.md](./components/widgets/README.md#content-widgets) |
| A dialog | `dialog` on `createPhiCmsPresetNodes`; `PhiDialogControl` in code | [Dialogs](#dialogs), [OVERLAYS.md](./OVERLAYS.md) |
| Tabs or steps over several sections | Layout `stack` with the `tab-bar` or `steps` Widget | [LAYOUTING.md](./LAYOUTING.md), "Stack slot display" |
| Sections the reader opens and closes | Layout `collapsible` | [LAYOUTING.md](./LAYOUTING.md) |
| Tiles that fill a row | Layout `grid`, or `masonry` for uneven heights | [LAYOUTING.md](./LAYOUTING.md), "Grid slot placement" |
| An icon | `PhiIcon` by name | [8d](#8d-icons-a-module-brings) |

What is not listed here either does not exist or is missing from this list. Before you say which, check the
Module that owns the domain as [AGENTS.md](./AGENTS.md#before-you-call-something-missing) says, and name what
you checked. Then propose it to the operator ([Where a Core Widget or Control lacks something](#before-you-start-the-foundations-widgets-and-controls-come-first));
do not build your way around it.

## Before you start: Public pages are rendered once for everybody

Read [STATIC_RENDERING.md](./STATIC_RENDERING.md) before building anything that renders on a Public page.
In production a Public page is rendered once for every anonymous visitor and served from memory; your
Widget's server half is part of that render. In short:

1. **Nothing your Widget renders on the server may depend on the visitor.** There `cookies()` and
   `headers()` are empty without an error, the viewer is always anonymous and there is no query. Tokens,
   greetings, carts, random values and anything else per visitor are loaded in the browser.
2. **Your Module's own data can be up to 60 seconds old on a Public page.** Only published Pages, Areas,
   Navigation, Themes, Site settings and translations reach it within seconds. News entries, events,
   prices, stock and whatever your Add-on stores wait for the next render at most a minute later. What
   must be current to the second is loaded in the browser.
3. **`next dev` never renders statically**, so development hides both mistakes. Check every Public
   Widget once in a production build, signed out.

Signed-in visitors, requests with a query, the Builder and every staff Area render dynamically as before.

## Before you start: a staff page is composed, not drawn

What [the Foundation first](#before-you-start-the-foundations-widgets-and-controls-come-first) means for
the staff Areas, concretely. A page in a staff Area -- Admin, Accounting, Editor, Builder -- and every list in the App Area is a tree
of Core Widgets your preset places, not one Widget of yours that draws the page itself. Every staff page
of phis-ui is built this way, and a Module's page that is not looks, sorts, translates and acts
differently from all of them. `@phis/shop`'s Accounting page follows it too: Core Tables, Form dialogs
and row actions, with no client Widget of its own.

1. **A list is a `table` Widget on a data provider** your Module registers ([TABLES.md](./TABLES.md)):
   columns, sorting, paging and filters are the table's. Never a `PhiTableControl` in a Widget of yours.
   Search and filters are the table's own query tools in its header row (`features.filters`, TABLES.md,
   "Query tools"), never Controls of yours above it, and the table keeps its footer with the paging.
2. **Create is a toolbar action of the table, edit and delete are row actions** (`actions.toolbar`,
   `actions.row`, `display: "icon"`, `execution: "signal"`). No button row of your own above the table.
   The routes answer them: the Table announces the action and its row, each dialog opens on its own
   `openActionKey`, the Form saves and closes its dialog and tells the Table to read again, and a delete
   or a state change is the Provider's action behind a confirmation. Your Module's Controller
   ([section 2](#2-define-an-optional-controller)) answers only what needs state beyond that
   ([OVERLAYS.md](./OVERLAYS.md), "A dialog needs no Controller unless it keeps state"; [SIGNALS.md](./SIGNALS.md)).
3. **Create and edit forms are Form Widgets in a dialog** (`dialog` on `createPhiCmsPresetNodes`,
   [Dialogs](#dialogs), [FORMS.md](./FORMS.md)), not a modal your Widget opens. The Form's own layout
   places the labels: beside the field from 377px of Form width, above it only below that
   (`PHI_FORM_DEFAULT_LAYOUT`). A dialog drawn by hand never gets that, which is why its labels stack.
4. **The page carries no heading of its own.** A staff Area's header bar already shows the Page title as
   a caption; a `page-title` Widget on the page would show it twice.
5. **An icon is a name**, by the one rule every icon name follows: a short name is the Ant Design name
   from `PHI_ANTD_ICON_NAMES` (`plus`, `edit`, `delete`, `reload`), there are no aliases, and an unknown
   name draws nothing ([MODULES.md](./MODULES.md), "Presets, paths, and navigation").
6. **A picture in a list is an address your server answers**, drawn by the Table's `image` renderer (a
   column of its own over a `string` field) or ahead of a column's value through `imageFieldKey`, the way
   `iconFieldKey` puts a named icon there ([TABLES.md](./TABLES.md), "Read renderers"). The row carries a
   Site-relative address of an image variant with its cache revision, built on the server -- for a list the
   Media library's `icon` variant, 64 x 64 and fitted whole -- never an Asset id your Provider turns into
   an address in the browser. A Widget of your own that draws the picture is not needed for it.

The reference is the Admin Users page,
`plugins/runtime-modules/user-management/trees/phi-default-admin-users-page-tree.ts`: one table on a
provider, a create action in its toolbar, history, edit and delete in its rows, create and edit as Form
dialogs, wired by routes and the user-management Controller where a decision needs state. A Widget of your own is for what no Core Widget
draws -- a calendar, a chart of your data. Where a Core Widget lacks something a staff
page needs, that is a finding for `@phis/ui`, proposed to the operator, not a reason to draw the page
yourself.

## Terminology and hard boundaries

- A **Module** is a Site/client extension compiled into a Site application.
- An **Add-on** is a server extension installed into `phis` (`@phis/server`) with `phis addon`.
- One package carries one product. `@scope/name` is the Module half; the Add-on half of the same
  package lives under `@scope/name/addon/…`, and the logical Add-on id is `@scope/name`.
- A Module binds to Core or exactly one Add-on and declares required versioned server capabilities.
- One package may export several Modules. Each Module owns at most one Controller type and may be
  controllerless when its declared artifacts do not need runtime coordination.
- Every Widget, Layout, Form, provider, route, Theme preset, and authoring adapter has exactly one
  `ownerModuleId`.
- Installation is build-time. Area activation is persisted separately through `runtimeModules`.
  `activation: "always"` on a definition -- active in every eligible Area without being selected -- is
  for Modules of `@phis/ui` only, and the catalog refuses it on any other package's
  ([MODULES.md](./MODULES.md#activation)).
- A database package name must never become a dynamic `import()` target.
- Global registries, import-side-effect registration, and client/server compatibility fallbacks are
  not extension APIs.

Every identifier follows one grammar, and it is the same one first-party Modules use:

```text
<npm-package>/modules/<module>                       the Module itself
<npm-package>/modules/<module>/<namespace>/<leaf>    anything the Module owns
```

```text
Module       @acme/status/modules/status
Controller   @acme/status/modules/status/controller/default
Widget       @acme/status/modules/status/widgets/card
Form         @acme/status/modules/status/forms/incident-report
Provider     @acme/status/modules/status/options/services
Signal JSON  @acme/status/modules/status/signals/service-selection
```

Four rules carry it:

1. **`modules` is required, even for a package with one Module.** Without the marker,
   `@acme/status/options` could be a Module named `options` or a namespace under a nameless Module,
   and nothing can tell which.
2. **The namespace is required.** `.../widgets/card`, never `.../card`.
3. **A leaf does not repeat its Module's name.** Under `modules/status`, the Widget is `card`, not
   `status-card`. A Module never needs to say its own name inside its own namespace.
4. **Namespaces come from a closed set** -- `widgets`, `layouts`, `controller`, `forms`, `form-field`,
   `form-validation`, `form-handler`, `options`, `tables`, `trees`, `collections`, `calendars`,
   `cards`, `signals`, `background-patterns`, `video-providers`. A third-party package invents Modules
   and leaves, not namespaces.

Name the Module for what it does. `core` means a package's unselectable base Module, which is what
`@phis/ui` has; a package with one Module gives it a real name.

The Module id and the Controller type are separate ABI fields and must not be derived from one
another. Under this grammar they also no longer look alike, which they did before it.

The grammar is enforced, not advised: `createPhiRuntimeModuleCatalog` rejects a Module id that does
not carry the marker, and the route, Controller-address, Form-id, and signal-schema readers each
reject their own identifiers when they do not follow it.

## Required package boundary structure

A Module package has four fixed entrypoints and an optional fifth. Source filenames are the package's
own; a layout like `@phis/example`'s works well:

```text
@acme/status/
├── package.json
└── src/
    ├── index.ts              .                  phiModuleDefinitions
    ├── server.ts             ./server           phiModuleServerContributions
    ├── client.ts             ./client           phiModuleClientContributions ("use client")
    ├── authoring-client.ts   ./authoring-client phiModuleAuthoringContributions ("use client")
    ├── fonts.ts              ./fonts            phiModuleFontContributions (optional)
    ├── ids.ts
    ├── definition.ts
    ├── module.ts
    ├── presets.ts
    ├── themes.ts
    ├── controller/
    │   ├── definition.ts
    │   └── client.tsx
    └── widgets/
        └── card/
            ├── config.ts
            ├── plugin.tsx
            └── authoring.tsx
```

`controller/` is optional. Include it only when the Module coordinates runtime state, signals, or several
mounted artifacts; a Module never adds a no-op Controller to satisfy package shape.

`./server` is the Module's server-safe Site catalog contribution -- code that runs in the *Site* process.
It is not code that runs inside `phis`. Server routes, hooks, jobs, migrations, secrets, and provider
adapters live in the Add-on half of the same package, under its own entrypoints:

```text
Package:            @acme/status
Module entrypoints: @acme/status, /server, /client, /authoring-client, /fonts
Add-on entrypoints: @acme/status/addon/manifest, @acme/status/addon/runtime
Logical Add-on id:  @acme/status
```

The Module half never imports the Add-on half, and the Add-on half never imports React or `@phis/ui`.

```json
{
  "name": "@acme/status",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "phis": {
    "sourceLocale": "en",
    "modules": [{
      "moduleId": "@acme/status/modules/status",
      "category": "operations",
      "eligibleAreas": ["public", "app", "admin", "builder", "editor", "accounting"]
    }]
  },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./server": { "types": "./dist/server.d.ts", "import": "./dist/server.js" },
    "./client": { "types": "./dist/client.d.ts", "import": "./dist/client.js" },
    "./authoring-client": {
      "types": "./dist/authoring-client.d.ts",
      "import": "./dist/authoring-client.js"
    },
    "./fonts": { "types": "./dist/fonts.d.ts", "import": "./dist/fonts.js" }
  },
  "dependencies": {
    "server-only": "^0.0.1"
  },
  "peerDependencies": {
    "@phis/ui": "^0.1.0",
    "next": "^16.2.11",
    "react": "^19.2.8"
  }
}
```

- `@phis/ui`, `react`, and `next` are peer dependencies. A second copy of `@phis/ui` is a second set of
  React contexts, and `next` is needed for the `next/dynamic` calls in the Client boundaries and for
  `next/font` in `./fonts`.
- The `phis` block declares every Module the package carries with its category
  (`PHI_RUNTIME_MODULE_CATEGORIES` in `@phis/contracts/catalog`: `foundation`, `workspace`, `content`,
  `media`, `commerce`, `identity`, `communication`, `events`, `analytics`, `integration`, `operations`,
  `other`), the Areas it may serve (`eligibleAreas`), and the language of the Modules' titles. A
  catalogue reads it without running the package; `phis module check` reports a missing or malformed
  declaration.
- `eligibleAreas` is stated here and nowhere else -- not in the Module's definition. `phis module` writes
  one Client projection per Area and imports a package's Client door only into the Areas its Modules
  serve; it has to know them without loading the package, and this file is the one it may read. The
  generated projection completes the definition with them, so the catalog and the Builder read
  `eligibleAreas` as usual.
- CSS shipped by the package needs `"sideEffects": ["**/*.css"]` instead of `false`.

Modules use Phi Controls for supported presentation and do not import Ant Design directly where a Phi
Control exists: inline feedback is `PhiAlertControl`, anchored confirmation `PhiConfirmControl`, text
`PhiTypographyControl`, the arrangement inside one Widget `PhiFlexControl` (a gap, not `Space`), a
placeholder `PhiSkeletonControl`, and a count on a button the `badge` of `PhiButtonControl`; icons are
drawn with `PhiIcon` by name (`@phis/ui/navigation`), never imported from `@ant-design/icons`. A
picture is `PhiImageControl`, drawn from what `resolvePhiImagePresentation` answers (both from
`@phis/ui/controls`); a file an Add-on keeps in a slot is `{ sourceKind: "url", sourceUrl: contentPath }`
with `source="url"`.
Application messages and notifications are sent with `usePhiApplicationFeedback`
(`@phis/ui/runtime/signal-client`). A missing reusable capability is a Core contract extension, not a
package-local Ant Design path. The one place a Module renders Ant Design itself is where it supplies the
component a Control delegates to -- a calendar adapter for `PhiCalendarControl` -- and there it uses
what Ant Design draws, since that is what it is supplying.

## The contract between a package's two halves

A package with an Add-on half is one product in two processes. The Module half runs in the Site and the
browser, the Add-on half inside `phis`, and neither imports the other. They still have to agree on a
handful of values: the route and hook paths the Module calls, a header of the package's own, the role
names the Module gates on, the states a row answers in, and the paths of the Module's Pages that the
Add-on writes into links. Those values are the package's own contract, and they live in one place:

```text
@acme/status/
└── src/
    ├── contract/
    │   └── index.ts      values and types both halves import; it imports nothing
    ├── ids.ts            the Module half's identifiers; re-exports what it uses from contract/
    └── addon/
        └── constants.ts  the Add-on half's names; re-exports what it uses from contract/
```

- **It imports nothing.** No React, no `@phis/ui`, no server library, no Node built-in: it is compiled
  into both halves, and whatever it imported would be imported by both. Plain constants and types only.
  `@phis/contracts` is the wire contract between an Add-on and Core; this is the contract between the
  two halves of one package, and nobody outside the package reads it.
- **It is shared when the package is built, not while it runs.** The Add-on bundler and the Module build
  each copy the values into their own artifact. Once installed, the halves know nothing of each other
  and meet only on the wire, so a value both copies carry is a promise between two separately installed
  artifacts.
- **Changing a value is a breaking change between the halves.** The two halves are installed by
  different commands (`phis addon upgrade`, `phis module`) and may run at different versions for a
  while. Change a contract value only by rolling both halves out together, or answer the old value
  beside the new one until no installed half speaks it.
- **A header of the package's own never starts with `x-phis-`.** The Site's door drops every request
  header with that prefix, and `authorization`, before it forwards to Core.
- **Add-on import paths carry their extension.** `phis` loads the manifest entrypoint unbundled in Node,
  so the Add-on half imports `../contract/index.js`; the Module half imports `./contract` as the rest of
  its source does.

### Paths the Add-on writes into links

Inside the Site a link is a page reference, never a path
([Links are references, never paths](#links-are-references-never-paths)). Some links are made outside
it: the return address a payment Provider sends the buyer back to, the link in a confirmation mail.
Nothing resolves a reference there, so the Add-on writes a Site-relative path, and Core puts the Site's
public address in front of it. That is safe to promise for a Page the Module brings: a Module Page's
path is owned by the Module and locked in the Builder, so no Site author can move it. The path belongs
in the contract, and the Module's route descriptor is built from the same constant:

```ts
// src/contract/index.ts
/** The receipt page: served by the Module, written into return addresses and mails by the Add-on. */
export const ACME_STATUS_INCIDENT_PAGE_PATH = "/status/incident" as const;

// src/presets.ts (Module half)
path: `${ACME_STATUS_INCIDENT_PAGE_PATH}/:number`,

// src/addon/runtime.ts (Add-on half)
link: `${ACME_STATUS_INCIDENT_PAGE_PATH}/${number}`,
```

`@phis/shop` (`phis-shop`) follows this layout: its order page path, order-token header, route bases,
roles and order states are in `src/contract/`.

## Distribution and commercial Modules

Distributing compiled and commercial Modules is designed, not built; see
[design/MODULE_DISTRIBUTION.md](./design/MODULE_DISTRIBUTION.md).

## Addresses are granted, not owned

Your Module does not own its Public address. It applies for one, and the Site settles the application
when the Module is enabled. The normative rule is in [MODULES.md](./MODULES.md#who-owns-an-address);
what follows is what it means while you build.

Outside Public there is nothing to settle. Every route lives under your package path --
`/acme/shop/...`, derived from the Module id -- so two packages can never contest an address, and how
your package arranges its routes underneath is your own business.

In Public there is no such namespace. The path your route descriptor declares is an application, and
where it is already held the operator is asked for another one at activation; the dialog refuses to
enable the Module without an answer. The holder keeps what it has, whether that is another Module or a
Page the Site authored. So:

- **The declared path is a wish, not a promise.** In Public your Module may run under a different
  address than it declared, permanently.
- **Your own path must not appear anywhere in your Module.** No link, no forward, no condition on
  `/login`. The way to your own Page is the `(ownerModuleId, presetKey)` reference, resolved through the
  current route table -- the same reference navigation persists.
- **A taken address is not a fault.** On a Site that has grown it is the ordinary case.
- **Yielding an address costs nothing else.** A renamed route, like a landing offer the Site did not
  choose, leaves every other route your Module has standing.
- **A Public base Page is yours to replace.** Declare `/contact`, `/privacy`, `/terms-and-conditions`, or
  `/error/404` and your Page is served there, as long as no other package Module declares the same path;
  the base Page steps aside and comes back when your Module is switched off. Links and navigation that
  point at the base Page reach yours through the path, so you do not need a navigation item of your own.
  You may still bring one: the Site then hides whichever of the two it does not want. This holds for the
  Public base Module only -- Pages of the Auth Module or any other Module are ordinary holders.
- **A landing is an offer.** A Page that declares `/` offers the Site a front door. As the only package
  Module offering one it replaces the base landing on activation, like a replaced `/contact`; next to
  other offers it waits until the Site chooses. It is never offered another address, and the Site can
  switch between the offers at any time.

One case runs the other way, and it is worth knowing because your Module cannot resolve it. A Page the
Site authored before your package was installed can sit on your package path outside Public. There your
Module has nothing to yield with -- that path is its identity -- so activation is refused, naming the Page,
until the Site moves it (`findPhiBuilderSitePageOnModulePackagePath` in
`plugins/runtime-modules/builder/page-address-rule.ts`). It needs an operator, and there is nothing to build
against it: no Module code can avoid or detect it.

The other direction is closed as well. The Builder does not let a Site Page be created on, moved onto, or
put above or beneath an address an active Module answers on: its routes in Public, its whole package path
everywhere else (`findPhiBuilderModuleAddressConflict`).

Enabling a Module for Public checks its declared paths against Site Pages and other Modules and asks for
another address where one is taken (`plugins/runtime-modules/builder/public-route-collisions.ts`).

## Addresses and folders

A Page is never a folder. This holds for a Module's routes as it holds for the Site's own Pages (phis-server
[REFERENCES.md](../phis-server/REFERENCES.md), "A Page is never a folder"): no route of yours answers on a
path another route of yours lies beneath. `/faq` beside `/faq/hosting` is refused; `/faq/overview` beside
`/faq/hosting` is the same pair, done right.

The reason is what a folder is. A path segment with Pages beneath it is a folder, and a folder's address
leads somewhere only through the Navigation: a container whose children share that folder names one of
them, and a request for the folder is forwarded there. A Page on the same address would shadow that
choice, the Builder's Page tree would show the Page and a folder of the same name side by side, and the
Navigation editor would offer a target that can never apply.

**One nesting is allowed: a list's entries directly beneath the list.** `/blog` and `/blog/:slug` stand
together, because one route answers every entry and no Navigation links it -- a link names one entry,
never the family. The Builder shows such a route beneath its list's Page, marked by its parameter
(`Slug · /blog/:slug`). Nothing deeper: `/blog/:slug/edit` and `/blog/archive` are Pages beneath a Page
again.

**An overview is a child like the others.** Put it beside the Pages it introduces and let the container
name it with `folderTarget`, the itemKey of that direct child:

```ts
navigation: [{
  navKey: "public:header",
  parentItemKey: null,
  after: "@phis/ui/modules/public/nav/terms",
  item: {
    itemKey: "@acme/site/nav/public/header/faq",
    label: { defaultMessage: "FAQ" },
    folderTarget: "@acme/site/nav/public/header/faq-overview",
    children: [
      { itemKey: "@acme/site/nav/public/header/faq-overview", label: { defaultMessage: "Overview" }, routePresetKey: "faq-overview" },
      { itemKey: "@acme/site/nav/public/header/faq-hosting", label: { defaultMessage: "Hosting" }, routePresetKey: "faq-hosting" },
    ],
  },
}],
```

`/faq` then forwards to the overview with no step in the Builder. The folder address is the folder the
children's paths share as they answer on this Site -- a Public path the Site reassigned moves it, and
children from different folders give no address and no forward. The catalog refuses a `folderTarget`
that names no direct child going to a route. A Site's own choice for the container, made in the
Builder's Navigation table, replaces yours; the Builder shows yours until it does. A Site cannot switch
a Module's forward off by choosing "nowhere": that choice is read as no choice, and your target answers.

`checkPhiRouteAddresses(routes)` (`@phis/ui/module/page-check`) reports every route beneath another of
the same Area. Run it over your route descriptors in your verify step and fail on a finding.

## 1. Define stable ids

Build every identifier from the Module id rather than spelling it out. The factories validate as they
go, so a name that breaks the grammar fails where it is written and not in whichever consumer parses
it first.

```ts
import {
  createPhiModuleIdentifier,
  createPhiModuleNamespace,
  createPhiRuntimeModuleId,
} from "@phis/ui/constants";
import type { PhiRuntimeModuleId } from "@phis/ui/types";

export const STATUS_PACKAGE_NAME = "@acme/status";
export const STATUS_MODULE_KEY = "status";
export const STATUS_MODULE_ID = createPhiRuntimeModuleId(
  STATUS_PACKAGE_NAME,
  STATUS_MODULE_KEY,
) as PhiRuntimeModuleId;

export const STATUS_CONTROLLER_PLUGIN_KEY = createPhiModuleNamespace(STATUS_MODULE_ID, "controller");
export const STATUS_CONTROLLER_KEY = "default";
export const STATUS_CONTROLLER_TYPE = createPhiModuleIdentifier(
  STATUS_MODULE_ID,
  "controller",
  STATUS_CONTROLLER_KEY,
);

export const STATUS_WIDGETS_PLUGIN_KEY = createPhiModuleNamespace(STATUS_MODULE_ID, "widgets");
export const STATUS_CARD_WIDGET_KEY = "card";
export const STATUS_CARD_WIDGET_TYPE = createPhiModuleIdentifier(
  STATUS_MODULE_ID,
  "widgets",
  STATUS_CARD_WIDGET_KEY,
);
```

`@phis/example` (`src/ids.ts`) is written this way.

Persisted keys must remain stable across releases. Labels, paths, and implementation filenames may
change; ABI keys must not be silently renamed.

## 2. Define an optional Controller

A Module owns a Controller only when it needs runtime coordination. The definition is server-safe
metadata used for validation, mounting, and Builder Wiring. The example Module needs coordination and
therefore declares one:

```ts
// controller/definition.ts
import type { PhiRuntimeControllerDefinition } from "@phis/ui/types";
import { STATUS_CONTROLLER_KEY, STATUS_CONTROLLER_PLUGIN_KEY } from "../ids";

export type StatusControllerConfig = Record<string, never>;

export const STATUS_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: STATUS_CONTROLLER_PLUGIN_KEY,
  key: STATUS_CONTROLLER_KEY,
  title: "Status Controller",
  description: "Coordinates transient status UI state.",
  allowedMountScopes: ["area", "page"],
  runtimeSignals: { emits: [], listens: [] },
  defaultConfig: {},
  parseConfig: (): StatusControllerConfig => ({}),
} satisfies PhiRuntimeControllerDefinition<StatusControllerConfig>;
```

The executable Controller is a Client boundary:

```tsx
// controller/client.tsx
"use client";

import { createPhiRuntimeControllerClient } from "@phis/ui/runtime/controller-client";
import type { PhiRuntimeControllerPlugin } from "@phis/ui/types";
import {
  STATUS_CONTROLLER_DEFINITION,
  type StatusControllerConfig,
} from "./definition";

const STATUS_CONTROLLER_PLUGIN = {
  ...STATUS_CONTROLLER_DEFINITION,
  renderController: () => null,
} satisfies PhiRuntimeControllerPlugin<StatusControllerConfig>;

export const PhiStatusControllerClient =
  createPhiRuntimeControllerClient(STATUS_CONTROLLER_PLUGIN);
```

Choose the mount policy on the Module definition:

- `area`: mount `default` while the Module is active in an Area;
- `demand`: expose the Controller type and materialize concrete instances only from CMS requirements;
- `site`: reserved for the `core` Module and unavailable to normal Modules.

The Controller's address is `controller:<pluginKey>/<controllerKey>:<instanceKey>`; for the example
above that is `controller:@acme/status/modules/status/controller/default:default`. Handler keys, Area
names, and Widget types do not belong in the address ([SIGNALS.md](./SIGNALS.md#addresses)). Declare signal capabilities through `runtimeSignals`; communicate only via
the Phi signal bus, not a module-global store or a second event bus. Two `listens` inputs on one channel and
action are allowed when their `valueType` or `valueSchema` differ
([SIGNALS.md](./SIGNALS.md#capabilities-and-routes)).

For a controllerless Module, `controllerType`, `controller`, `controllerMountPolicy`,
`controllerDefinition`, and the `Controller` Client are all absent. These fields form one atomic contract:
either every required Controller field and the Client are present, or none is. A controllerless Module
cannot materialize Controller instances, and its Widgets, Layouts, Forms, and providers cannot declare
requirements for a Controller it does not own or for an unavailable external Controller.

Every Module, including a controllerless one, must contribute at least one meaningful artifact such as
a Widget, Layout, Form, data provider, Calendar adapter, Theme, route, shell, or navigation preset.
Empty Modules and artificial no-op Controllers are invalid.

## 3. Define the Module

```ts
// definition.ts
import {
  buildPhiRuntimeModuleControllerDescriptor,
  type PhiModuleDefinition,
} from "@phis/ui/module";
import { createPhiCoreServerBinding } from "@phis/ui/types";
import { STATUS_CONTROLLER_TYPE, STATUS_MODULE_ID } from "./ids";
import { STATUS_CONTROLLER_DEFINITION } from "./controller/definition";

export const STATUS_MODULE_DEFINITION = {
  moduleId: STATUS_MODULE_ID,
  kind: "module",
  serverBinding: createPhiCoreServerBinding(),
  controllerType: STATUS_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(
    STATUS_CONTROLLER_DEFINITION,
  ),
  sourceLocale: "en",
  title: "Status",
  description: "Service status presentation.",
  category: "operations",
  icon: "antd:dashboard",
  controllerMountPolicy: "area",
} satisfies PhiModuleDefinition;
```

`sourceLocale` is the single canonical language for every package-authored user-facing string owned by
the Module. It defaults to `en`. Do not repeat or override it on individual Widgets, Forms, providers,
presets, or navigation contributions. Define Module-owned Label Sets with
`definePhiRuntimeModuleLabelSet(STATUS_MODULE_DEFINITION, ...)` from `@phis/ui/module/labels`; this
binds their global translation source language and stable Label-Set namespace to the owner Module.

**From `@phis/ui/module/labels`, not from `@phis/ui/server-helpers`.** The same names are on the server
barrel, and a package that takes them there imports `server-helpers/cms-root` and `next/headers` along
with them. Nothing fails to compile. What happens instead is that every page of the Site answers `500`
with an import trace naming the barrel -- because the Module definition is reachable from both sides of
the seam: the Label Sets that bind to it are rendered by Client Widgets, so the browser graph gets
whatever the definition's chain touches. `@phis/ui/module/labels` is one file wide and carries the
credentials reader as well, for the same reason.

`title`, `description`, and `category` are required non-empty Module metadata; `category` is one of the
Module categories listed above and is the same value the package's `phis` block declares. Every Module must also
declare at least one non-empty visual source: an exact `icon`, a semantic `iconFamily`, or both. The
Server catalog validates these rules at runtime in addition to the TypeScript contract, so JavaScript
packages and cast values cannot bypass them. `icons`, optional, is something else: the icons the
Module's presets and Widget configs may name, registered as data ([8d](#8d-icons-a-module-brings)).

Module title, description, and package-authored component labels are global product copy shared across
Sites. The server translates Authoring metadata before it reaches Client option providers. Site CMS
content, external documents, and Provider/user content keep their separate content-locale contracts;
they must not inherit the Module source locale merely because a Module renders them.

`eligibleAreas` in the package's `phis` block is the module-level installation boundary. A third-party
Module may list every canonical Area as above and can then be activated independently per Site and Area. Its Widgets appear
in the Picker only for Areas where that Module is actually active. Do not repeat Area lists or
authoring visibility on individual Widget definitions. `category` only groups and describes active
Widgets in the Picker; it is never an authorization or visibility mechanism.

For an Add-on-backed Module, replace the Core binding with the exact provider id and required
capabilities from its neutral wire contract. The Site Module must not import Add-on implementation
code, database clients, secrets, or server migrations.

For a Controller-bearing Module, the executable Module object adds only the Controller implementation
definition:

```ts
// module.ts
import type { PhiRuntimeModule } from "@phis/ui/cms/plugins";
import { STATUS_CONTROLLER_DEFINITION } from "./controller/definition";
import { STATUS_MODULE_DEFINITION } from "./definition";

export const STATUS_RUNTIME_MODULE = {
  ...STATUS_MODULE_DEFINITION,
  controllerDefinition: STATUS_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
```

A controllerless executable Module is the unchanged serializable Module definition; it does not add a
`controllerDefinition` placeholder. Module activation, Area eligibility, ownership, server binding,
and catalog validation continue to use `moduleId` and do not depend on Controller presence.

Do not put Widget, Layout, Form, or provider implementation maps inside this executable object. Their
metadata and lazy loaders belong to the catalog entry.

## 4. Add a Widget

A Widget has three separate artifacts:

```text
server-safe definition
├── lazy Runtime/Preview server plugin
└── lazy Authoring Client adapter
```

### Definition and config parser

```ts
// widgets/card/config.ts
import type { PhiCmsWidgetPlugin } from "@phis/ui/types";
import { STATUS_CARD_WIDGET_KEY, STATUS_WIDGETS_PLUGIN_KEY } from "../../ids";

export type StatusCardConfig = { title: string };

import { createPhiConfigReader } from "@phis/ui/widget-config";

export function parseStatusCardConfig(config: Record<string, unknown>): StatusCardConfig {
  const reader = createPhiConfigReader(config);
  // Absent is "Status"; a title that is there and not a text is an error naming the field.
  return { title: reader.string("title")?.trim() || "Status" };
}

export const STATUS_CARD_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: STATUS_WIDGETS_PLUGIN_KEY,
  typeKey: STATUS_CARD_WIDGET_KEY,
  title: "Status Card",
  description: "Displays the current service state.",
  category: "data",
  slotSizePolicy: "intrinsic",
  fields: [{ key: "title", type: "string", label: "Title", required: true }],
  parseConfig: parseStatusCardConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<StatusCardConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "slotSizePolicy"
  | "fields"
  | "parseConfig"
>;
```

`fields` is the complete Inspector-editable config surface. Do not add Widget-specific Inspector
branches. Use generic Phi field types, option/data providers, and declarative signal capabilities.
Widget and Layout `category` values come from `PHI_CMS_PLUGIN_CATEGORIES` (`content`, `navigation`,
`form`, `data`, `media`, `commerce`, `account`, `configuration`, `structure`, `workspace`, `developer`,
`other`) -- a different list from the Module categories. Package identity is a separate Picker filter.
Config parsing uses the primitives from `@phis/ui/widget-config`, so a package does not reproduce the
renderable base parser.

### Reading a config

`parseConfig` reads what an author stored, and what it cannot read it says. A value that is absent is
the Widget's to default; a value that is present and wrong -- a number where a text belongs, a mode the
Widget does not know, a list entry without its key -- throws. `createPhiConfigReader` from
`@phis/ui/widget-config` does both: `string`, `number`, `integer`, `boolean`, `oneOf`, `object`, `list`
and `stringList` answer `undefined` for an absent value and throw a `PhiConfigError` naming the path
(`columns[2].sizing.width`), what was expected and what was found. `fail` throws the same for a rule
the field types cannot state. Do not put a default in place of a wrong value or drop an entry you
cannot read: that is a setting an author made which the page then silently ignores.

What a throw does is the same for every Widget, Core's or yours, and whatever it throws:

- The Site refuses to store it. A write under `/api/site/cms` runs each Widget's `parseConfig` first and
  answers 422 with the Widget type, the node and -- for a `PhiConfigError` -- the field.
- A live page leaves that one Widget out and logs `cms.render.block_not_renderable`; everything else on
  the page renders.
- The Builder and the preview show the error in the Widget's place (`invalid-config` for a
  `PhiConfigError`), with the Inspector still open to correct it.

The older lenient readers (`readString`, `readNumber`, ...) are still exported for parsers that have not
moved; they turn a wrong value into `undefined` and should not be used in a new Widget.

Parse only what the Widget draws. A key the Inspector offers, `defaultConfig` sets or `parseConfig` returns
and only the canvas reads is a setting an author makes and the page ignores. First-party Widgets are held
to that by `scripts/validate-widget-config-reads.ts`; hold your own the same way.

A Provider binding in a config -- `{ providerKey, scopeKey?, params? }` -- is read with
`readPhiRuntimeDataProviderBinding` from `@phis/ui/types`, the reader Core's own Widgets use, so the
shape is read once and the same everywhere. It answers `null` for anything that is not a binding (no
namespaced Provider key) rather than throwing, so a strict parser decides what `null` means: absent may
be the Widget's default, while present-but-unreadable, or a binding to a Provider the Widget cannot draw,
is a stored mistake and goes to `fail` like any other field.

A config that parses can still name data the page cannot have: the Provider it is bound to is not
offered in this Area, the record cannot be read, the read itself failed. That is not a throw from
`parseConfig` -- the setting is right, the world is not -- and it is not the Widget's to explain to a
visitor. Render the shared failure piece instead of drawing an alert of your own:
`PhiWidgetFailureServer` from `@phis/ui/module/records` where the Server half finds it, `PhiWidgetFailure`
from `@phis/ui/runtime/data-provider-client` where a Client finds it after hydration. Both take
`{ renderMode, widgetType, widgetId?, title, description?, error? }` (`PhiWidgetFailureProps`) and do what
Core's Widgets do: in the Builder an error card with `title` and `description` stands in the Widget's
place, on a live page -- a revision preview included -- the Widget is absent and the rest of the page
stands, and either way one `cms.widget.unavailable` warning is logged with `error` attached. The render
mode is `widget.config.renderMode` in the render arguments, `"preview"` or `"editor"`, and live
otherwise; pass it to a Client half as a prop. The Server variant logs during the render, the Client
variant from an effect once per distinct failure, so pick the one where the failure is found. What a
visitor is meant to read -- a form's own answer, an empty state, "no such record" answered as a 404 --
is content and does not go through them.

### Runtime and Preview plugin

```tsx
// widgets/card/plugin.tsx
import type { PhiCmsServerWidgetPlugin } from "@phis/ui/types";
import {
  STATUS_CARD_WIDGET_DEFINITION,
  type StatusCardConfig,
} from "./config";

export const STATUS_CARD_WIDGET_PLUGIN = {
  ...STATUS_CARD_WIDGET_DEFINITION,
  render: ({ config }) => <section><h2>{config.title}</h2><p>Operational</p></section>,
  renderPreview: ({ config }) => <section><h2>{config.title}</h2><p>Preview</p></section>,
} satisfies PhiCmsServerWidgetPlugin<StatusCardConfig>;
```

A Widget whose Preview is simply its live output, made inert, need not write `renderPreview` by hand:
`definePhiPassiveWidgetRenderers(render)` from `@phis/ui/cms/plugins` returns `{ render, renderPreview }`,
where the Preview is the same render wrapped in an `inert` frame -- the way a Core Widget draws its
Preview, so links do not navigate and controls do not take focus on the Canvas:

```tsx
export const STATUS_CARD_WIDGET_PLUGIN = {
  ...STATUS_CARD_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers<StatusCardConfig>(({ config }) =>
    <section><h2>{config.title}</h2><p>Operational</p></section>),
} satisfies PhiCmsServerWidgetPlugin<StatusCardConfig>;
```

Runtime/Preview code may load server data and translated labels. Browser interaction belongs in a
small Client component. If that component is selected through
`PhiRuntimeModuleRenderClientHost`, list it in `renderClients` of the package's
`phiModuleClientContributions` ([section 8](#8-export-the-client-and-authoring-contributions)).

A Widget that draws words a visitor would search for says them to the Site's search index
([SEARCH.md](./SEARCH.md)) with `searchText` on the same plugin: the text as the reader sees it, in
reading order, one entry per line or paragraph, translated for `runtime.locale` the way the render
translates it (`translatePhiSearchWidgetTexts` from `@phis/ui/server-helpers` does that for a Widget's
own sentences). A Widget without it contributes nothing, which is right for a picture, a form or a
navigation.

The index runs outside any request -- at start-up and on a timer after a publish -- and a built Site may
hold the request scope in another copy of its module than the Widget's, so `searchText` must not depend on
it: it receives `runtime` and hands it on. Nothing that reads the request's runtime
(`getPhiRequestRuntime`, `tr`, `trBulk`, `phiRuntime()` without a source) may be reached from it; the
`...ForLocale` translators take the runtime as their last argument (`trBulkForLocale(locale, msgs, 0, "text",
undefined, runtime)`), and the helpers `translatePhiSearchWidgetTexts` and `resolveMarkdownRenderData` take
it as theirs. A `searchText` that throws costs its Page those words; the run logs the Widget type once, with
the number of Pages it failed on.

```tsx
export const STATUS_CARD_WIDGET_PLUGIN = {
  ...STATUS_CARD_WIDGET_DEFINITION,
  searchText: ({ config, runtime }) =>
    translatePhiSearchWidgetTexts(runtime, [config.title, "Operational"], { translate: true }),
  ...definePhiPassiveWidgetRenderers<StatusCardConfig>(({ config }) =>
    <section><h2>{config.title}</h2><p>Operational</p></section>),
} satisfies PhiCmsServerWidgetPlugin<StatusCardConfig>;
```

### What a Server half may import

A Widget's server half -- `plugin.tsx`, `server.tsx` and what they import -- is part of the server graph
of **every route of the Site**, not only of the Pages the Widget stands on. The Site registers every
installed Module's Server contributions in one catalog, and the loaders in it are reachable from every
route, lazy or not. Next turns every `"use client"` file the server graph reaches into a Client reference
of the route, and the browser fetches the chunks of all of them on every page. A Control is such a file:
every `Phi*Control`, `PhiIcon` and the other Client components in `@phis/ui/controls`,
`@phis/ui/navigation` or `@phis/ui/forms/client` are Client components.

So a server half that renders a Control itself ships that Control, and everything Ant Design brings
with it, to the Public landing of every Site that installs the package -- whether or not any Page uses
the Widget. On 11.11.2026 one Download Widget whose `server.tsx` drew its card from `@phis/ui/controls`
doubled the Public landing's JavaScript (356 to 724 kB gzip). Before `@phis/ui` declared which of its
files have side effects, the bundler also had to keep every other export of the door it imported from,
so it carried Table, Tree, Form and the editing Controls along; now it keeps the ones named, and those
still ship everywhere.

What a server half does instead:

- **Render plain HTML, or hand the browser a view model.** A server half that needs a Control draws
  through its own Render Client: it resolves data, translates words and passes a serializable view model
  to `PhiRuntimeModuleRenderClientHost`; the Client file imports the Controls. The Render Client is listed
  in `renderClients` ([section 8](#8-export-the-client-and-authoring-contributions)) and loaded only in
  the Areas the Module serves and only where the Widget is placed. That is how every Core Widget is built.
- **Import from a door only what runs on the server**: types, constants, helpers, `@phis/ui/module/*`,
  `@phis/ui/server-helpers`, `@phis/ui/theme`. A `type` import is always free.
- **Never import a Client value into `plugin.tsx`, `server.tsx`, a loader descriptor, a Card or a Records
  resolver** -- not a Control, not `PhiIcon`, not a hook. The same holds for the package's `.` and
  `./server` doors.
- **Authoring stays authoring.** The editor of a Widget is built from Controls in `@phis/ui/controls`, in
  the `./authoring-client` door, which only the Builder loads.

`phis module check` refuses it (`client_in_server_graph`): it walks the package's `./server` door --
dynamic imports included, because the Widget loaders are -- and names the file that takes a Client
component, whether a name `@phis/ui` states in `package.json#phis.clientExports` or a file of the package's
own that begins with `"use client"`. `PhiRuntimeModuleRenderClientHost` is the one Client component a
server half renders.

Measure it, do not assume it: build the Site in production with and without the package and compare the
JavaScript the Public landing names (`browser-test/scripts/measure-html-payloads.mjs`). A Widget that
nobody has placed must not change it.

### Server Widget loader descriptor

```ts
// widgets.ts
import type { PhiRuntimeModuleWidgetDefinition } from "@phis/ui/cms/plugins";
import { STATUS_CARD_WIDGET_DEFINITION } from "./widgets/card/config";
import { STATUS_MODULE_ID } from "./ids";

export const STATUS_WIDGETS = [{
  definition: STATUS_CARD_WIDGET_DEFINITION,
  ownerModuleId: STATUS_MODULE_ID,
  renderPolicies: { runtime: "custom", preview: "custom", authoring: "custom" },
  loadRuntime: () => import("./widgets/card/plugin")
    .then((module) => module.STATUS_CARD_WIDGET_PLUGIN),
  loadPreview: () => import("./widgets/card/plugin")
    .then((module) => module.STATUS_CARD_WIDGET_PLUGIN),
}] as const satisfies readonly PhiRuntimeModuleWidgetDefinition[];
```

The descriptor must not statically import the plugin implementation.

### Authoring adapter

```tsx
// widgets/card/authoring.tsx
"use client";

import type { PhiCmsBuilderWidgetPlugin } from "@phis/ui/types";
import {
  STATUS_CARD_WIDGET_DEFINITION,
  type StatusCardConfig,
} from "./config";

export const STATUS_CARD_BUILDER_PLUGIN = {
  ...STATUS_CARD_WIDGET_DEFINITION,
  renderEditor: ({ config }) => <section><h2>{config.title}</h2><p>Preview</p></section>,
} satisfies PhiCmsBuilderWidgetPlugin<StatusCardConfig>;
```

`renderEditor` is for a Widget that can show something meaningful on the canvas: its own words, sample
values, the shape of its settings. A Widget that cannot -- its rows are the signed-in viewer's own, say --
leaves `renderEditor` out and declares `preview: "visualPlaceholder"`: the Builder draws the house
placeholder (the Widget's name, type and description) on the canvas and in the Preview. It never draws a
skeleton of its own as a stand-in (`components/widgets/README.md`, "Drawing itself, or the house
placeholder").

Register the adapter only in the owner Module's Authoring Client, which section 8 exports:

```tsx
// authoring-client.ts (excerpt)
"use client";

import {
  createPhiAuthoringWidgetModule,
  createPhiRuntimeModuleAuthoringClient,
  definePhiAuthoringWidgetModuleLoader,
} from "@phis/ui/runtime/authoring-client";
import { STATUS_MODULE_ID } from "./ids";
import { STATUS_CARD_WIDGET_DEFINITION } from "./widgets/card/config";

const StatusAuthoringWidgetModule = createPhiAuthoringWidgetModule([
  definePhiAuthoringWidgetModuleLoader(
    STATUS_CARD_WIDGET_DEFINITION,
    () => import("./widgets/card/authoring").then((module) => module.STATUS_CARD_BUILDER_PLUGIN),
  ),
]);

export const PhiStatusAuthoringClient = createPhiRuntimeModuleAuthoringClient({
  moduleId: STATUS_MODULE_ID,
  WidgetModule: StatusAuthoringWidgetModule,
});
```

The shared Canvas scaffold owns selection, hover chrome, drag/drop, slots, debug outlines, and common
tools. A Widget adds only its body and optional `renderEditorTools()` extension.

### Offering an image picker

A Widget that lets an author choose an image reads the Site's Media library, and it names that library
through a Foundation contract rather than through the Module that serves it:

```ts
import { PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS } from "@phis/ui/constants";

requiredDataProviders: [PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection],
```

Declare it. A Page mounts only the providers its tree asks for, and the tree scan reads a `providerKey`
out of a Widget's config or out of this declaration -- it cannot see a provider the Widget reaches for
from inside its own client code. Without the declaration the picker opens over an empty library,
reporting the provider as unavailable.

The import is the dependency, not the reading. Citing the Asset Module's own ids would bind your package
to that Module at build time, which is the Module-to-Module edge the dependency rule forbids; the
contract above holds no such reference. Whether anything answers the keys is an installation question,
and a Widget whose provider is absent degrades to an empty library instead of failing to build.

A Form that stores a picture does not need any of this: give the field the `media-asset` type
(the Asset Module's field type, `PHI_MEDIA_ASSET_FORM_FIELD_PROVIDER_KEY`, [FORMS.md](./FORMS.md)) and the
Page mounts the library for it. The Asset Module is active in every Area (`activation: "always"`), so the
field is available wherever a Form stands. The field offers the Site Space only, shows the chosen picture, and holds the Asset id as a number (`null`
for none), which is what your handler receives. `config.mediaType` names the kind (`image` by default) and
`config.publicOnly` greys out Assets that are not public and ready. Every Asset of the Site Space is delivered
publicly from the start, so in this field it only catches an upload still under way or failed. Both are the interface; your handler
is what decides which Asset it accepts, so read the Asset there before storing its id. `PhiMediaPickerControl` is public but
controlled only (it takes the Assets, the Folders and the paging as props, `isAssetSelectable` to grey
out Assets, and `uploadPanel` with `uploadNotice` where it is to offer an upload: a render function that
draws the Media library's own upload surface, `PhiAreaUploadBinding` with one file, and is handed the
`choose` that picks what arrived); the binding that feeds it from the library
(`usePhiMediaPickerBinding`) is Foundation-internal, so a Widget that needs a picker where no Form fits
has to ask for that binding rather than rebuild it. A collection of Assets that a picker adds to is a
Collection View drawn by the Media renderer, whose toolbar action `add` is that picker
([COLLECTIONS.md](./COLLECTIONS.md#the-media-renderer)). The field's picker also uploads a file from the
author's machine into the Folder it shows, in the Site Space, through the Media library's upload surface
(the drop area, one file), and chooses what it made; `config.folderPath` (`"Shop Images / Products"`) is the Folder it opens on
-- the deepest part of the path that exists, read without writing -- and an upload from there creates the
missing Folders and goes into the whole path. A name may hold `{key}` placeholders filled from the Form's
values when the picker opens (`"Shop Images / {category} / {product}"`; a name without its value is left
out, a `/` in a value becomes `-`). A `publicOnly` field leaves an uploaded Asset that is not public unchosen, as it
greys out a listed one ([Media](#media-what-the-asset-module-already-does), [FORMS.md](./FORMS.md)).

A Form that stores several pictures of a record, in order, gives the field the `media-assets` type
(`PHI_MEDIA_ASSETS_FORM_FIELD_PROVIDER_KEY`, [FORMS.md](./FORMS.md)): the Media tiles with remove and
drag order, the library's picker and its upload wall, `config.max` for how many; your handler receives the
ids as a list of numbers on save and decides what becomes of an Asset no longer named.

Inside the Builder's own chrome the library is always readable, whatever the edited Area activates. That
availability is declared by the owning Module through `availableToAuthoringChrome` on its provider
descriptor, not listed anywhere in the Builder. A `phis:asset/...` reference is resolved by the core
reference resolver and needs no Module at all.

An image a Widget of yours shows that opens larger over the page when clicked is `PhiLightboxImageControl`,
from `@phis/ui/media`: the overlay, the zoom and the close come with it.

### Offering a media source

A media source is somewhere other than the Site's library that a file can be taken from: a stock archive,
a brand portal, your customer's own DAM. The Media picker shows it beside the library, behind a switch
labelled "Source", whenever the picker stands on the Site Space and at least one source exists. A picker
with none looks and behaves as it always did.

**A source is listed, and what is chosen is imported.** Choosing an item brings its file into the Site's
Media library as an ordinary Asset, and what a field, a Widget or a Theme stores is that Asset's id.
Nothing ever stores a reference into your source, so a Site keeps its pictures when a subscription ends and
variants, focal rectangle, delivery and quota work on Assets and on nothing else. Do not ask the picker for
a way to keep your item's id on a placement; there is none by design.

The Server half declares the source in the Module's definition, keyed like a data provider
(`<owner>/<name>`), owned by the Module that declares it, and owned once:

```ts
// definition.ts
  mediaSources: [
    { key: `${STATUS_MODULE_ID}/stock`, ownerModuleId: STATUS_MODULE_ID, title: "Stock photos" },
  ],
```

The Client half is `mediaSources` beside `calendarAdapters` in `phiModuleClientContributions`
([section 8](#8-export-the-client-and-authoring-contributions)). `load` is a lazy `import()`, so the Client
is fetched only when a picker is open:

```ts
// client.ts
"use client";

import { definePhiModuleClientContributions } from "@phis/ui/module/client";
import type { PhiMediaSourceClientDefinition } from "@phis/ui/types";
import { STATUS_MODULE_ID } from "./ids";

const stock: PhiMediaSourceClientDefinition = {
  key: `${STATUS_MODULE_ID}/stock`,
  ownerModuleId: STATUS_MODULE_ID,
  load: () => import("./media-source/stock").then((module) => module.STOCK_MEDIA_SOURCE),
};

export const phiModuleClientContributions = definePhiModuleClientContributions({
  modules: [/* ... */],
  mediaSources: [stock],
});
```

```ts
// media-source/stock.ts
import type { PhiMediaSourceClient } from "@phis/ui/types";

export const STOCK_MEDIA_SOURCE: PhiMediaSourceClient = {
  async describe({ locale }) {
    return { label: locale.startsWith("de") ? "Bildarchiv" : "Stock photos" };
  },
  async list({ query, kinds, cursor, limit, locale, signal }) {
    const response = await fetch(`${ARCHIVE}/search?${new URLSearchParams({ q: query, cursor: cursor ?? "" })}`, { signal });
    const body = await response.json();
    return { items: body.hits.slice(0, limit).map(toItem), nextCursor: body.next ?? null };
  },
  async take({ itemId, signal }) {
    const response = await fetch(`${ARCHIVE}/photos/${encodeURIComponent(itemId)}/download`, { signal });
    return { file: await response.blob(), fileName: `${itemId}.jpg`, title: "...", altText: null, credit: "Photo: A. Name" };
  },
};
```

What the three must answer (the types are `@phis/contracts/media-source`, the Client's are `@phis/ui`):

- `describe({ locale })` answers `{ label }`, what the switch says, in the reader's language. You translate
  your own words; the Foundation's Label Sets do not reach a Module's text. A source that cannot be
  described is left out of the switch.
- `list(input)` answers `{ items, nextCursor }`. `input.query` is what somebody typed, trimmed and cut to
  `PHIS_MEDIA_SOURCE_QUERY_MAX_LENGTH`; empty means whatever you show unasked. `input.kinds` is what the
  picker can take (`null` is any), and you answer no item of another kind. Paging is by cursor: `cursor` is
  `null` for the first page, and otherwise the `nextCursor` you gave, handed back unread. `limit` is at most
  `PHIS_MEDIA_SOURCE_PAGE_MAX_ITEMS`. Honour `signal`: the picker stops the request when it closes or when
  somebody types on. An item is `{ id, kind, title, thumbnailUrl, width, height, credit }`; `id` is yours and
  opaque to everybody else. A page that does not hold the contract -- too many items, a thumbnail that is
  not an absolute `https:` address -- is "the source did not answer", not a page to show in part.
- `take({ itemId })` answers the file: `{ file, fileName, title, altText?, credit? }`, as a `Blob` in the
  reader's browser. The picker, not your Module, uploads it into the Site Space and the Folder the picker
  shows -- through the same init, bytes and finalize as every upload -- and then writes `title` and
  `altText` onto the new Asset. It records `{ source: "media-source", sourceKey, itemId, credit }` as the
  upload's `meta`: a record of where the file came from, which nothing reads to find the file again. The
  library's own refusals (too large, a type the Site does not take, no room left, a locked Folder) are said
  in the words the uploads already have. Your Module never writes an Asset itself.

**Thumbnails load in the reader's browser, straight from the source.** The picker draws
`<img src={thumbnailUrl} loading="lazy" referrerPolicy="no-referrer">` and nothing else: never through
`next/image` and never through the Site's server, because the Site's server must not fetch a foreign
address. So `thumbnailUrl` is an absolute `https:` address of a small rendition, never the original, and it
loads without your credentials. Nothing of the Site travels with that request but the fact that somebody
looked.

A source whose Module is not active in the Area is not offered, and neither is a descriptor without a Client
or a Client without a descriptor. A Client and a descriptor that name different owners are an error that
names the key, and a key two Clients claim is refused where the Site is composed. No first-party Module
offers a source.

An Add-on offers a source from the server instead, through the service kind
`@phis/server/service/media-source` (`PhisMediaSourceAdapterV1`: `probe`, `list`, `take`), with the same
list contract and no Module involved. Core asks it on the picker's behalf, the Add-on's `take` hands over
bytes (Core fetches nothing from an address), and Core imports what is chosen. The design is
`phis-server/design/MEDIA_SOURCES.md`. The picker reads those sources from
`GET /api/site/media/sources` the first time a picker opens on a page, and shows them in the same switch.

### A popup leaves the block

A Widget that opens a Tooltip, a Dropdown, a Select menu or a Popover lets it render in a portal. That is
Ant Design's default -- pass no `getPopupContainer` and the popup lands on `document.body` -- and where
this Foundation names a container it names `document.body` too, through one helper shared by the Canvas
scaffold. Do not point `getPopupContainer` at a node inside your own block.

The reason is not tidiness. A renderable block's frame writes what the author configured, and several of
those things make the block a stacking context of its own: an `opacity` below 1, and every effect that
animates with a transform. A popup anchored inside such a block cannot paint above a later sibling block
however high its `z-index`, and a transform additionally re-anchors a `position: fixed` descendant to the
block instead of to the window. A popup in a portal has left the subtree and meets none of it.

The rule is wider where a block states a size per profile: the box that offers that block its room
declares `container-type: inline-size` (the `phi-slot` container, [LAYOUTING.md](./LAYOUTING.md#block-geometry-per-profile)),
which brings the same stacking context to every slot holding a responsive block. A Widget written to
this rule needs no change for it.

## 4a. Add a Layout

A Layout is contributed the way a Widget is, with slots instead of content.

**Declare it in the catalog entry.** Each entry in `layouts` is a `PhiRuntimeModuleLayoutDefinition`:
`ownerModuleId`, the serializable `definition`, `renderPolicies`, and `loadRuntime`, which resolves to
the executable `PhiCmsLayoutPlugin`.

**Name it from your own package**, as a Widget does:
- the `pluginKey` is `@acme/status/modules/status/layouts`;
- the namespaced type comes from `buildPhiCmsLayoutNamespacedTypeKey`.

Core's layout register (the list of Core's own Layouts) is not an extension point, and your Layout does
not appear in it.

**Declare the slots.** Each slot has:
- `key`, `label`, and `slotIndex`;
- `sequential: true`, when the children are an ordered run rather than named places.

For a Layout whose slots are all sequential, `slotPositions` says what an emptied position does:
- `"compact"`, the default: the Builder renumbers the rest after a move or a removal, as in a row.
- `"fixed"`: every position keeps its number, because each one means something on its own, as with
  one panel per slot.

**Render it.** `render` and `renderEditor` receive:
- the node and its parsed `config`;
- the runtime and the tree;
- `renderChildren` or `renderSequentialSlotChildren` for the slot contents.

Style your own markup. `data-layout-kind` and its base CSS belong to Core's own Layout families and are
no contract for yours.

**Place it in a preset** with `buildPhiCmsLayoutNode`:
- Pass your `pluginKey` explicitly. Without it the factory resolves the type key against Core's
  Layouts.
- Leave out `creationPreset`: it selects starting values for Core's families. Give `config` instead.

## 4b. Place Core Widgets

Your Pages are built from Widgets, and most of them will be Core's: Markdown, Simple Text, Button, Table,
Form and the rest. You place them by type key, as data. You never import Core for this; the Foundation
publishes what each one reads.

**Use the node factories.** `buildPhiCmsWidgetNode`, or `widget` and `stack` on
`createPhiCmsPresetNodes`, check `config` against the placement type for the type key:

```ts
nodes.widget({
  typeKey: "button",
  id: STATUS_WIDGET_IDS.refresh,
  parentLayoutNodeId: STATUS_LAYOUT_IDS.toolbar,
  slotIndex: 0,
  label: "status refresh",
  config: { label: "Refresh", variant: "primary", size: { width: "auto" } },
});
```

A misspelt key, or a value outside a vocabulary, fails to compile. At runtime the parser would only
drop it without a word.

**The contract lives in `@phis/ui/core-widgets`.**
- `PhiCoreWidgetPlacements` maps each listed type key to its placement type.
- `PhiWidgetPlacementBase` is the envelope every placement shares: the block geometry, `visibleWhen`
  and `signalRoutes`. The slot frame applies the block to every Widget alike.
- A Widget's config text is translated by the renderer, by field name
  ([TRANSLATIONS.md, "Widget config text"](./TRANSLATIONS.md#widget-config-text)). Only content Widgets
  (Markdown, HTML, Simple Text, Description) can be kept untranslated, through the node flag
  `PhiCmsFlags.NoTranslate` (`flags`), not through config; so can a Layout that translates its own text
  (`translatesOwnText`), such as the Collapsible's panel titles.

**What stays untyped** (the [Core Widgets](#core-widgets) table marks each one `unchecked`):
- a Core Widget not in the map yet, such as Card, `gallery`, `breadcrumb`, `page-title` or `markdown-toc`,
  whose config is still changing or has no placement type yet. Untyped is not a
  reason to draw it yourself: place it and give its `config` a type of your own, as below;
- a type key known only at runtime;
- a Widget named with a `pluginKey`, your own included, since its config is yours to define.

Give such a `config` a type of your own with `satisfies`.

`stack` takes no `pluginKey`, so place your own Widgets with `widget`.

`validate-core-widget-placements` checks each placement type against the Widget's Inspector fields in
both directions. The contract cannot drift from what the Inspector writes.

### Dialogs

A dialog is an Overlay with a body and a row of actions, and every dialog looks the same: the body is the
Theme's wash, the base step in from the edge and the small step between what stands in it, with no corner of
its own; the actions are one compact, labelled group. Build one with `dialog` on `createPhiCmsPresetNodes`,
which returns the Overlay, its Layouts and its Command Toolbar for your tree's `overlays`, `layoutNodes` and
`contentWidgets`. Building one node by node, spread `PHI_DIALOG_BODY_CONFIG` into the body Layout and
`PHI_DIALOG_COMMANDS_CONFIG` into the toolbar (`@phis/ui/helpers`); the descriptor compiler refuses a modal
whose body or actions say otherwise. A dialog whose content runs to its edges -- an image to crop, a canvas
-- takes `PHI_DIALOG_BLEED_BODY_CONFIG` instead: the same ground, no inset, and its content draws no corner.

A dialog is as wide as its Form needs: one column takes `PHI_DIALOG_WIDTH_SINGLE_COLUMN`, two columns keep
`PHI_DIALOG_WIDTH`, a table or an editor states a wider width. Hand the Form your dialog holds to `dialog`
as `body.form` -- its definition from your `forms`, or `{ descriptor }` -- and it picks the width itself;
without it, `dialog` takes `PHI_DIALOG_WIDTH`. Where the Form is not yours to hand over (Core's Reply Form,
say), state `width: PHI_DIALOG_WIDTH_SINGLE_COLUMN` in `config`. The descriptor compiler refuses a modal at
`PHI_DIALOG_WIDTH` whose Forms are all one column (OVERLAYS.md, "The imperative exemption, and how narrow
it is"), and on a live Site that refusal is a 500 for the whole Page. Two Forms of one column side by side
on a Split Card are still all one column: state the width the body needs. Run
`checkPhiPresetTreeContract` with your own Forms in your tests
([Checking a Page preset](#checking-a-page-preset)); it refuses the same dialog there.

A dialog that edits a row names the row in its title through its record Form's `titleFromRecord` and one
route from the Form's `recordTitle` to the Overlay's `title` ([FORMS.md](./FORMS.md#form-widget)); it
needs no Controller.

A dialog that shows a row and acts on it -- releases, approves, locks it -- holds a `record` Widget with the
Provider row actions of its source in `actions` and its own `titleFromRecord`; the footer's Command Toolbar
sends the action's key to the Widget's `action/activate:string` input, and the Widget's `actionSuccess`
closes the dialog and reloads the Table. No Controller, no Form, no handler path that has to name the row
([TABLES.md](./TABLES.md#the-record-widget)).

## 4c. Messaging

A conversation is Core's, whichever Module runs it: threads, messages, who may read them and the Add-on
capability `threads:v1` live on the server, and the surfaces for them live in Core. A Module brings a kind
of conversation and places Core's surfaces for it -- it does not grow a conversation Widget or a reply of
its own.

1. **Declare the kind** in your definition (`threadKinds`), and open threads of it through your own
   route or Core's.
2. **List them** with a Table over `PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.table` (`@phis/ui/constants`),
   resource `inbox`, with `fixedFilters: { kind }`. Its summary carries `unread`; `core.totalRows` the
   total.
3. **Read one** with the `thread-conversation` Core Widget (`PhiThreadConversationWidgetPlacement`). It
   listens for `select` and `reload` on the `thread` channel (`signals/thread-selection`), so your
   Controller -- or the Table's selection, where the row is the thread -- tells it which.
4. **Answer it** with `reply: true` on the conversation and Core's Reply Form,
   `PHI_SHARED_FORM_IDS.threadReply` (`@phis/ui/forms`), in a `dialog` with `openActionKey: "reply"`.
   Route the conversation's `reply` emit to the dialog and to the Form; the Form's `source` is the thread
   inbox, so it reads the thread from the row the Reply names. Offer an internal note with
   `formConfig: { initialValues: { internalAllowed: "1" } }` where your readers are Staff; Core writes
   `Internal` for Staff alone whatever arrives.

Everything your Module adds beside a conversation -- a ticket's state, an order it is about -- is a Widget
of its own placed next to it, told by the same Controller. Nothing is put inside Core's Widget.

## 5. Add a Theme preset

A Theme preset is module-owned data, not a global registration and not arbitrary `ConfigProvider`
state. Ant Design seeds/overrides and Phi-only custom colors are the supported preset surface.

```ts
// theme-preset.ts
import type { PhiThemePresetPlugin } from "@phis/ui/theme";

export const STATUS_THEME_PRESET = {
  key: "status-night",
  version: 1,
  title: "Status Night",
  description: "Dark operations palette.",
  palette: {
    seed: {
      colorPrimary: "#4f8cff",
      colorSuccess: "#45a675",
      colorWarning: "#d99a2b",
      colorError: "#d85c4a",
    },
    modes: {
      light: { seed: { colorTextBase: "#14213d", colorBgBase: "#ffffff" } },
      dark: { seed: { colorTextBase: "#e7edf8", colorBgBase: "#07101f" } },
    },
  },
} satisfies PhiThemePresetPlugin;
```

```ts
// themes.ts
import type { PhiCmsThemePresetDescriptor } from "@phis/ui/cms/plugins";
import { STATUS_MODULE_ID } from "./ids";

export const STATUS_THEMES = [{
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: "status-night-theme-preset",
  presetVersion: 1,
  themeKey: "status-night",
  title: "Status Night",
  description: "Dark operations palette.",
  loadPreset: () => import("./theme-preset")
    .then((module) => module.STATUS_THEME_PRESET),
}] as const satisfies readonly PhiCmsThemePresetDescriptor[];
```

`themeKey` and the loaded preset's `key` must match, as must their titles. Increment the descriptor and
preset versions when a release of your package changes the published preset contract, for the same
reason a route preset raises `presetVersion` ([Pages a Module brings](#6a-pages-a-module-brings)). `palette.seed` carries the seeds both modes
share; `modes.light` / `modes.dark` carry the two base seeds, explicit colour tokens under `overrides`
and the ten custom colours under `customColors`. A Site's own `theme.palette` has exactly this shape and
is laid over the preset field by field.

Palettes travel through `themes`. The other parts of a look are Theme blocks announced through
`themeBlocks` on the same catalog entry, with the `PhiCmsThemeBlockDescriptor` shape from `@phis/ui/types`
and the block types from `@phis/ui/theme`: a **style**, a **ground**, a **fonts** block, and a **Set** that
names the parts by key. What each block holds and how a Site follows or adopts it is
[THEME.md](./THEME.md#theme-blocks).

```ts
// themes.ts
export const STATUS_THEME_BLOCKS = [{
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: "status-night-ground",
  presetVersion: 1,
  blockKind: "ground",
  blockKey: "status-night",
  title: "Status Night",
  loadBlock: () => import("./theme-ground").then((module) => module.STATUS_NIGHT_GROUND),
}, {
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: "status-night-set",
  presetVersion: 1,
  blockKind: "set",
  blockKey: "status-night",
  title: "Status Night",
  loadBlock: () => import("./theme-set").then((module) => module.STATUS_NIGHT_SET),
}] as const satisfies readonly PhiCmsThemeBlockDescriptor[];
```

A ground may carry a picture. A photograph ships as a file beside the module that names it, through
`new URL("./ground.jpg", import.meta.url).href`, and the package build copies the file into `dist` next
to the compiled module. The Site build serves it as `/_next/static/media/ground.<hash>.jpg` with an
immutable cache, so a page fetches the picture only where the ground is shown. Not a static image import:
Node cannot load one, and scripts that read the catalogue run on Node, where the expression is a `file:`
URL. A small SVG drawn from the palette's colours may stay an inline `data:image/svg+xml` URL. The block
catalogue itself reaches the browser only in the Builder, which is the one Area that chooses among
blocks; every other page receives the one Theme the root resolved on the server. A Site that only follows
the ground stores its key and nothing else, and the Module delivers the look.
When a Site saves a Theme that follows a Module's block, the Site adopts it: the values and pictures become the Site's own and later Module updates no longer reach it ([THEME.md](./THEME.md#adoption-on-save)).
A Theme is site-wide, so palettes and blocks are read from the
installed union -- what `phis module add` projected -- rather than from the Areas the Module is
enabled in. `@phis/example` in this workspace ships a complete palette, ground and Set.

**Installing your Module does not apply your Theme.** Unlike a Public address, which your Module takes on
activation when nobody else holds it, a Theme is offered: your blocks join the list the Theme workspace
shows, and the Site chooses. Nothing a visitor sees changes until somebody does. Ship the look, say what
it is in the descriptor's title and description -- that is what an author picks from -- and do not build
a side channel that selects it. The reasoning is in [THEME.md](./THEME.md#selection-and-resolution); the
short of it is that a Site can hold only one Theme, several Modules offer one, and the choice is the
Site's to draft and publish like any other.

Client components consume Ant Design semantics through `usePhiConfig().token` and module-specific
custom colors through the approved Phi config contract. Do not create parallel `--phi-*` variables for
Ant Design tokens or install another root Theme provider. A Module using another UI library may expose
one lazy module UI provider scoped to its own subtree.

## 6. Add a Preset Form

The Form contract is [FORMS.md](./FORMS.md); the step-by-step guide is
[components/forms/PRESET_FORMS_HOWTO.md](./components/forms/PRESET_FORMS_HOWTO.md). In summary:

- create the id with `createPhiFormId(STATUS_MODULE_ID, "incident-report")`, which yields
  `@acme/status/modules/status/forms/incident-report`; catalog construction requires the prefix to be
  the owner Module id -- the Module id and not the package name, whatever the parameter is called, and a
  package carrying two Modules gets two namespaces;
- create it in a file the Module definition does **not** import. `@phis/ui/forms` carries
  `gateway/form-submit`, which is `server-only`, so one `createPhiFormId` call in the definition's import
  chain puts `server-only` in the browser graph and the Site answers `500` everywhere. The handler *key*
  is a plain string and may sit anywhere; the id belongs beside the descriptor;
- define the Form with `definePhiRuntimeModuleForm(...)` from `@phis/ui/forms`;
- declare every referenced field, validation, and handler Provider in the Module definition's
  `formProviders`; a handler Provider declares its `credentialPolicy` and an `endpointKey` or
  `upstreamPath` ([FORMS.md](./FORMS.md#handler-providers));
- contribute the Form through `catalogEntry.forms`; catalog construction rejects a missing or
  mismatched phase handler;
- render fields through Phi Controls, not CMS Widgets;
- to **offer a field type other Modules' Forms may use**, declare its descriptor in your own
  `formProviders.fieldTypes` (`ownerModuleId` is yours, the key is a `form-field` key under your Module),
  register the control in your Module's UI provider (`uiProvider: true`; `lazyPhiFormFieldControl` keeps its
  code out of every other Form), and let a Form name the key in `fieldProviderKey`. The Form widget mounts
  your UI provider for any Form that uses the type, where your Module is active in the Area, and shows a
  calm "not available in this area" notice in the fields of an Area where it is not, keeping their value
  ([FORMS.md](./FORMS.md#field-and-validation-providers)). The Form never names your Module and you never
  name the Form. A Form that *uses* another Module's field type adds the key to its fields and nothing
  else;
- place the Form in CMS trees with the generic Form Widget (`@phis/ui/modules/core/widgets/form`) and its
  `formId`; never register a domain Form Widget;
- use the demand-materialized Core Form controller
  (`controller:@phis/ui/modules/core/controller/form:<instanceKey>`) unless the Module has a genuinely
  different lifecycle.

## 6a. Pages a Module brings

A Page a Module brings is a **route preset**: a descriptor that says where the Page answers and a tree
loader that says what it draws. Nothing about it is a Next.js route, nothing is written to the database
when it is installed, and it does not have to be seeded: the tree is built in memory from the descriptor
on each request, until an author changes the Page and the Site saves a Draft of its own
([MODULES.md](./MODULES.md#descriptor-identity-and-instantiation)).

### The route descriptor

`PhiCmsRoutePresetDescriptor` (`types/cms-module-descriptors.ts`, public from `@phis/ui/types`) is one
entry of the catalog entry's `routes` ([section 7](#7-export-the-server-contributions)). The catalog
compiles every active Module's `routes` into the Area's route table; the Module definition itself names
no route.

- `ownerModuleId` and `presetKey` are the Page's identity. The Builder addresses the Page by
  `createPhiPresetCmsPageId({ ownerModuleId, presetKey })`, links reach it by a reference built from the
  same pair, and its node ids are derived from it, so a `presetKey` is as permanent as a Widget type: rename
  it and every saved copy, link and node id belongs to a Page that no longer exists. It is unique among
  all the preset descriptors of the Module, routes, shells, overlays and Themes alike.
- `area` is the one Area the Page answers in; the Module must list it in `eligibleAreas`.
- `path` is the Area-local path. Outside Public it is served under the package path (`/status` in
  `@acme/status` answers at `/app/acme/status/status` in the App Area); in Public it is applied for as
  written, and the Site settles a collision when the Module is enabled ([Addresses are granted, not
  owned](#addresses-are-granted-not-owned)). A path is exact or has one whole-segment parameter
  (`/incidents/:slug`), which reaches `loadTree` as `params`.
- `landingPage: true` on a Public route at `/` offers the Page as the Area's landing; it is an offer and
  not a claim ([MODULES.md](./MODULES.md#who-owns-an-address)).
- `title` is the Page's name in the Builder's Page tree and in link pickers, and its document title
  where the tree's `page.pageMeta` names none; it is translated through the Site-scoped path. A
  description, or a title label of its own, the tree returns through `pageMeta`
  ([NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md#page-metadata-indexing-and-sitemap)).
  `defaultPageFlags` sets the `PhiCmsFlags` a Page of this route starts with -- `NoIndex` keeps it out
  of the sitemap and the index. It is copied onto the Page when the route is instantiated; once the Site
  changes it, the record answers and the descriptor is not consulted again.
- `navigation` optionally places an entry that names this route by `routePresetKey`
  ([section 8a](#8a-what-a-module-package-exports), Navigation). An entry names a preset, never a path.
  An entry with children is a container; `folderTarget` names the child its folder address leads to
  ([Addresses and folders](#addresses-and-folders)).
- `path` lies beneath no other route of the same Area, a list's entries (`/blog/:slug`) excepted.
- `loadTree` returns the Page tree. Import the builder lazily, as below: the descriptors go into every
  request's route table, the tree is needed only for the Page being drawn. The catalog checks what it
  returns -- every id a preset id, every parent and Region root present, no id twice. It receives `media`,
  the resolver of the package's own pictures ([Pictures a Module ships](#pictures-a-module-ships)).
- `presetVersion` is a positive integer. It is recorded on a Page built from the preset as its source
  version, and the Revisions table uses it to tell a saved copy that it was made from an older preset. It
  takes no part in ids, and a Page nobody has saved always draws the installed tree, so a changed tree
  needs no bump to appear. Start at `1`, and raise it when a release of your package changes the
  preset in a way a saved copy should hear about -- a Region, Layout or Widget added, removed or
  re-keyed. That is what lets the Revisions table tell an author their saved Page is behind. (The
  Modules that ship inside `@phis/ui` keep theirs at `1` until phis reaches v1; that rule is for this
  repository, not for your package, whose users already hold saved copies.)

### The tree builder

A Page tree (`PhiResolvedCmsPageTree`) is the Page, its Regions, and the Layouts and Widgets inside them.
It is built along one path ([MODULES.md](./MODULES.md#descriptor-identity-and-instantiation)):

1. State the identity once: `{ domain: "page", ownerModuleId, presetKey }`.
2. Turn the node keys into ids with `createPhiPresetCmsInstanceIdMap(identity, nodeKeys)` from
   `@phis/ui/types`. Each id is a hash of the identity and the key, so it is the same in every release, on
   every Site, and on the server side; a key listed twice throws. Two Pages built by one function differ by
   `presetKey`, and so get different nodes from the same keys.
3. Build the nodes with `createPhiCmsPresetNodes(page)` from `@phis/ui/helpers`. Handed the Page row
   `loadTree` received, it returns `page`, `region`, `layout`, `widget`, `stack`, `overlay` and `dialog`,
   and fills in what every node of a Page repeats -- Site, visibility mask, status, flags, and a
   `sortOrder` that follows `slotIndex` unless given.

What the tree contains:

- **Regions** are the Page-owned zones of the shell: `PhiCmsRegionType.Content`, `SiderRight`, `Hero`,
  `HeaderBottom`, `FooterTop`, `Drawer` ([CMS.md](./CMS.md#the-cms-tree)). A Region carries a synthetic
  **negative** `id` the builder picks, unique among the package's presets, a `regionType`, its
  `rootLayoutNodeId`, a `sortOrder`, and `config`: geometry such as `maxSize` and `margin`, and behaviour as
  `PhiCmsFlags` bits in `config.flags` -- `Sticky` keeps a Sider in view under the Header, with
  `offsetTop` as the air between them ([LAYOUTING.md](./LAYOUTING.md), [SHELL.md](./SHELL.md)). A Region
  never holds a Widget directly.
- **Layouts** by `typeKey`: `content` as a Region's root, `flex-vertical` for a stack, `flex` for a row,
  `grid` and the rest of Core's families. `parentLayoutNodeId: null` marks a Region root; every other
  node names its parent and its `slotIndex`, and a slot holds one child. For Core's families give
  `creationPreset` (`{ layoutKind: "verticalflex", preset: "panel" }`, `{ layoutKind: "flex", preset:
  "panel" }`), which selects their starting values; for your own Layouts leave it out
  ([section 4a](#4a-add-a-layout)).
- **Widgets** by `typeKey`, with `config` checked against Core's placement types
  ([section 4b](#4b-place-core-widgets)). There is no heading Widget: a heading is Markdown (`#`).
- **Copy** the tree writes into a Widget -- a Button's label, a select's options -- is the Module's own
  text. Write it in English and state `textSource: "preset"` in the Widget's config: the renderer then
  translates it from the global store, once for every installation, as it does Core's own Pages. Where
  the tree places what the Site configured -- its contact address, its name -- state `textSource:
  "site"` instead. Every Widget with text states one of the two; `checkPhiPresetTextSources` reports one
  that does not ([Checking a Page preset](#checking-a-page-preset)). A Page title is the route's `title`
  and needs neither.

### Links are references, never paths

A Page is linked by what it is, not where it currently answers. `createPhiPageReference({ kind:
"module", ownerModuleId, presetKey })` from `@phis/ui/references` builds the reference; a Site Page is
`{ kind: "site", pageScopeId }`, and the Public base's own Pages are in `PHI_PUBLIC_BASE_PAGE_REFERENCES`
(`contact`, ...). A Widget link carries it as `linkTarget: { kind: "page", reference }`; Markdown carries
it as a `phis:page/...` URI, which `createPhiPageUri(reference)` writes. Both are resolved on the server
per render, to the address the Site assigned, namespace and locale included
([REFERENCES.md](./REFERENCES.md)). A root-relative link such as `/status/incidents` is not a second
way in: the Markdown Widget drops it and renders the text alone, and a link target refuses it on write.
A link made outside the Site -- a payment return address, a link in a mail -- is the one place an
Add-on writes a path; see [Paths the Add-on writes into links](#paths-the-add-on-writes-into-links).

### Distances, colours and corners come from the Theme

A preset never states a look of its own: every distance, colour role and corner in its configs is a
reference the Theme resolves per Site and per mode. `@phis/ui/theme` exports them by their Phi name:

- `PHI_SPACE` -- the one spacing scale (`xxs`, `xs`, `sm`, `base`, `md`, `lg`, `xl`, `xxl`; 3 to 144 px in
  the default Theme, `THEME.md` "Phi scale") for every `padding`, `paddingLeft` ..., `gap` and `offsetTop`.
  It is what the Inspector offers, so an author opening the page sees `md`, not a number.
- `PHI_COLOR` -- colour roles that follow the Theme and the mode: the primary ladder (`primaryBg` ...
  `primaryTextActive`), the text ladder, grounds, fills and borders, the states, and the palette's ten custom
  colours (`custom1` ... `custom10`) -- for example the stop a card picture fades into, or a band's quiet
  tint.
- `PHI_RADIUS` -- corners, where a Surface states its own.

What they resolve to is the adapter's business. A preset that spells it out -- `"var(--phi-padding-lg)"`,
`"var(--phi-color-bg-container)"` -- hides which step it took and breaks the day the adapter changes; Core
refuses it in its own presets (`scripts/validate-preset-theme-vocabulary.mjs`), and a package keeps to the same rule.
`PHI_PADDING` holds the scale as plain numbers; it is for arithmetic, and a preset that writes
`${PHI_PADDING.md}px` freezes the default Theme's value instead of following the Site's.

The same goes for the rest of a look: a Button takes the Theme's gradient by slot (`variant: "gradient"`,
`gradient: "gradient1"`), a Surface its tone (`tone: "dark"`), its ground per mode
(`background`, `backgroundDark`) and its pane strength (`filter: "clear" | "glass" | "haze"`)
([LAYOUTING.md](./LAYOUTING.md)). Literal colours belong in a Theme block ([section 5](#5-add-a-theme-preset)) or
in a picture's own Overlay, where they describe that picture and not the Site.

```ts
import { PHI_COLOR, PHI_SPACE } from "@phis/ui/theme";

nodes.layout({
  typeKey: "flex-vertical",
  /* ... */
  /* The Page column of section 6b: the section gap, and no padding of its own. */
  config: { gap: PHI_SPACE.md, anchor: { horizontal: "left", vertical: "top" } },
});
const fade = {
  kind: "color",
  opacity: 0.85,
  ink: { kind: "gradient", direction: "180deg", stops: [
    { color: "transparent", percent: 40 },
    { color: PHI_COLOR.bgContainer, percent: 100 },
  ] },
};
```

### Example

Two Public Pages of the Status Module from [section 1](#1-define-stable-ids): an overview with an
introduction, a button to the incident log and a sticky note in the right Sider, and the log itself.

```ts
// presets.ts
import { PhiCmsFlags } from "@phis/ui/constants";
import { createPhiPageReference } from "@phis/ui/references";
import type { PhiCmsRoutePresetDescriptor } from "@phis/ui/types";
import { STATUS_MODULE_ID } from "./ids";

export const STATUS_OVERVIEW_ROUTE_PRESET_KEY = "status-overview";
export const STATUS_INCIDENTS_ROUTE_PRESET_KEY = "status-incidents";

/** The incident log, named by identity: the same value wherever it is linked from. */
export const STATUS_INCIDENTS_PAGE = createPhiPageReference({
  kind: "module",
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: STATUS_INCIDENTS_ROUTE_PRESET_KEY,
});

export const STATUS_ROUTES = [{
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: STATUS_OVERVIEW_ROUTE_PRESET_KEY,
  presetVersion: 1,
  area: "public",
  path: "/status",
  title: "Status",
  loadTree: ({ page }) => import("./pages/overview-page-tree")
    .then((module) => module.buildStatusOverviewPageTree({ page })),
}, {
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: STATUS_INCIDENTS_ROUTE_PRESET_KEY,
  presetVersion: 1,
  area: "public",
  path: "/status/incidents",
  title: "Incidents",
  defaultPageFlags: PhiCmsFlags.NoIndex,
  loadTree: ({ page }) => import("./pages/incidents-page-tree")
    .then((module) => module.buildStatusIncidentsPageTree({ page })),
}] satisfies readonly PhiCmsRoutePresetDescriptor[];
```

```ts
// pages/overview-page-tree.ts
import { PhiCmsFlags, PhiCmsPageType, PhiCmsRegionType } from "@phis/ui/constants";
import { createPhiCmsPresetNodes } from "@phis/ui/helpers";
import { createPhiPageUri } from "@phis/ui/references";
import {
  createPhiPresetCmsInstanceIdMap,
  type PhiCmsPageNode,
  type PhiResolvedCmsPageTree,
} from "@phis/ui/types";
import { STATUS_MODULE_ID } from "../ids";
import { STATUS_INCIDENTS_PAGE, STATUS_OVERVIEW_ROUTE_PRESET_KEY } from "../presets";

/** Synthetic Region ids: negative, and unique among this package's presets. */
const REGION_IDS = { content: -710, siderRight: -711 } as const;

const IDENTITY = {
  domain: "page",
  ownerModuleId: STATUS_MODULE_ID,
  presetKey: STATUS_OVERVIEW_ROUTE_PRESET_KEY,
} as const;

const LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(IDENTITY, ["content", "stack", "actions", "sider"]);
const WIDGET_IDS = createPhiPresetCmsInstanceIdMap(IDENTITY, ["intro", "incidents", "siderNote"]);

export function buildStatusOverviewPageTree({ page }: { page: PhiCmsPageNode }): PhiResolvedCmsPageTree {
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page({ pageType: PhiCmsPageType.Standard }),
    overlays: [],
    regions: [
      nodes.region({
        id: REGION_IDS.content,
        regionType: PhiCmsRegionType.Content,
        rootLayoutNodeId: LAYOUT_IDS.content,
        sortOrder: 30,
        config: { maxSize: { width: 860 }, margin: "0 auto" },
      }),
      // Optional: stays in view under the Header while the content scrolls.
      nodes.region({
        id: REGION_IDS.siderRight,
        regionType: PhiCmsRegionType.SiderRight,
        rootLayoutNodeId: LAYOUT_IDS.sider,
        sortOrder: 40,
        config: { flags: PhiCmsFlags.Sticky, offsetTop: 16 },
      }),
    ],
    layoutNodes: [
      nodes.layout({
        typeKey: "content",
        id: LAYOUT_IDS.content,
        parentLayoutNodeId: null,
        slotIndex: 0,
        label: "status page",
        config: {},
      }),
      nodes.layout({
        typeKey: "flex-vertical",
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        id: LAYOUT_IDS.stack,
        parentLayoutNodeId: LAYOUT_IDS.content,
        slotIndex: 0,
        label: "status sections",
        config: { anchor: { horizontal: "left", vertical: "top" } },
      }),
      nodes.layout({
        typeKey: "flex",
        creationPreset: { layoutKind: "flex", preset: "panel" },
        id: LAYOUT_IDS.actions,
        parentLayoutNodeId: LAYOUT_IDS.stack,
        slotIndex: 1,
        label: "status actions",
        config: { padding: 0 },
      }),
      nodes.layout({
        typeKey: "flex-vertical",
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        id: LAYOUT_IDS.sider,
        parentLayoutNodeId: null,
        slotIndex: 0,
        label: "status sider",
        config: {},
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "markdown",
        id: WIDGET_IDS.intro,
        parentLayoutNodeId: LAYOUT_IDS.stack,
        slotIndex: 0,
        label: "status intro",
        config: { sourceMode: "inline", markdown: "# Service status\n\nAll systems are operational." },
      }),
      nodes.widget({
        typeKey: "button",
        id: WIDGET_IDS.incidents,
        parentLayoutNodeId: LAYOUT_IDS.actions,
        slotIndex: 0,
        label: "status incidents button",
        config: {
          key: "incidents",
          label: "Past incidents",
          variant: "primary",
          linkTarget: { kind: "page", reference: STATUS_INCIDENTS_PAGE },
        },
      }),
      nodes.widget({
        typeKey: "markdown",
        id: WIDGET_IDS.siderNote,
        parentLayoutNodeId: LAYOUT_IDS.sider,
        slotIndex: 0,
        label: "status sider note",
        config: {
          sourceMode: "inline",
          markdown: `Something wrong? See the [incident log](${createPhiPageUri(STATUS_INCIDENTS_PAGE)}).`,
        },
      }),
    ],
  };
}
```

`pages/incidents-page-tree.ts` is built the same way under its own identity. The labels are the nodes'
names in the Builder's structure tree, not visible copy. `@phis/example` shows the smallest form of the
same thing: one landing offered for the Public root, one Content Region with one Markdown Widget, built
node by node with `buildPhiCmsLayoutNode` and `buildPhiCmsWidgetNode`.

### From package to answering route

1. **Contribute** the descriptors as `routes` on the catalog entry ([section 7](#7-export-the-server-contributions)).
2. **Build** the package (`tsc` to `dist`, [section 8b](#8b-how-the-package-is-built)). A Site reads the
   package's `exports`, which point into `dist`: a source change it has not been rebuilt for does not reach
   the Site.
3. **Install** it into the Site: `phis module add --site <site key> --package <@scope/name> [--spec
   <version or workspace:*>] [--path <site root>]`, then rebuild the Site ([section 9](#9-install-without-patching-the-skeleton)).
4. **Activate** the Module for the Area in the Builder and publish that module change. Installing enables
   nothing, and a third-party Module is in no Area's default selection
   ([MODULES.md](./MODULES.md#when-a-modules-page-actually-appears)). In Public, enabling checks the
   declared paths and asks for another address where one is taken.
5. **Request** the path. The route and its navigation entry are computed per request from the active
   catalog, so they need no publish of their own, and the Page renders straight from the preset. A Draft
   exists only once an author edits and saves the Page, and its published copy answers once it is
   published; neither follows later changes to the preset, while an untouched Page always draws the
   installed one.

## 6b. Laying out a Page

A Page is assembled from the Layouts and Widgets phis-ui already has, set through their config. A preset
never draws its own structure: no Layout of its own for arranging, no wrapper, no CSS, no literal size. If
the existing Layouts cannot express a Page, that is a gap to raise ([AGENTS.md](./AGENTS.md), "A missing
piece is asked for"), not something to build beside them. This section is what every Page preset follows,
whoever writes it -- a person or an agent -- so that the Pages of a Site, and the Sites of an installation,
are built alike.

### The skeleton

Every Page has the same three levels in its `content` Region:

1. **Region** `content`: the Page's edge. It carries the only outer inset and the reading width
   (`maxSize`, centred with `margin: "0 auto"`). Nothing inside it adds a second edge. A Page that brings its
   own `content` Region replaces the Area's, padding included, so it states the Theme's Page inset itself, on
   all four sides: `paddingTop` to `paddingLeft` from `PHI_PAGE.padding` in Public, from
   `PHI_PAGE.signedInPadding` in App and the staff Areas ([THEME.md](./THEME.md#page-padding)).
2. **Page column**: one `flex-vertical` under the Region's `content` Layout, `padding` none, `gap` the
   section role. Its slots are the sections, top to bottom.
3. **Sections**: each slot of the column holds one Widget or one Layout. A section that needs columns uses
   `grid`, two cards side by side use `split-card`, a row of buttons uses `flex`, a section of its own
   rows a `flex-vertical` again. The Page column itself stays one vertical stack.

What the column hangs under is the Module's choice: the Region's root may be the `content` Layout with
the column in it, or the `flex-vertical` column may be the root itself, as in phis-ui's own Pages. Where
a Page stacks several sections, the `flex-vertical` root is usually the simpler choice: the sections are
its slots, with the section gap between them, and no second level is needed. What
makes the Pages of a Site agree is the column's spacing roles and the Region's edge, not which Layout the
column hangs under.

### Spacing roles

Every distance on a Page is one of four roles, and every role is one step of `PHI_SPACE`
([section 6a](#distances-colours-and-corners-come-from-the-theme)). A preset names the step, never a number,
never a CSS string, never `clamp()`:

| Role | Where | Step |
| --- | --- | --- |
| Page edge | `paddingTop` … `paddingLeft` of the Region `content` | the Theme's (`PHI_PAGE.padding`, `PHI_PAGE.signedInPadding`) |
| Between sections | `gap` of the Page column | `md` |
| Inside a surface | `padding` of a Layout that carries a Surface -- a band, a card, a Split Card | `md` |
| Inside a section | `gap` of a section's own Layout: heading to content, card to card, button to button | `sm`, the Layout default: leave it unset |

A Layout without a Surface has no padding: it only arranges. Padding belongs to a thing whose edge one
can see.

- **No nesting of insets.** A surface inside a surface does not add its padding to its parent's. A Split
  Card's slot holds its Widget directly; a code block is a Markdown fence and brings its own ground, so it
  needs no Layout with a dark Surface around it.
- **Emphasis is the author's.** A preset or an agent stays at `md` and below. A larger step -- `lg` and up --
  is a deliberate emphasis, and choosing it is the author's decision in the Builder's Paddings panel, on
  that Page. A section that should stand out in a preset takes another Surface (a tone, a wash, a
  gradient), not a larger distance.
- The one fixed exception is a Hero that content reaches into, below.

### The Page's Regions

`content` is one of the Regions a Page owns. The others are the Page's too, and follow the same roles:

| Region | What goes there | Spacing |
| --- | --- | --- |
| `hero` | The Page's opening: its title, one or two sentences, its ways on, a picture or a ground. Only where the Page opens with a statement, and one per Page. | Its root Layout carries the Surface and `padding` `md`. The Shell adds the Header bands' height above it ([SHELL.md](./SHELL.md), "Hero at the top"); never pad for them yourself. |
| `header_bottom` | A band under the Header that belongs to this Page: a breadcrumb, a sub-navigation, a notice. Not a second title. | `paddingLeft`/`paddingRight` `sm`, nothing above or below. |
| `sider_right` | What accompanies the text: a table of contents, related links. | `padding` none; the Region's `offsetTop` keeps it below the Header. |
| `footer_top` | The Page's closing, when it is not a section of the content: a call to action, a newsletter. | Like a section with a Surface: `padding` `md`. |

`header_top`, `header_main`, `footer_main` and `footer_bottom` are the Area's, shared by every Page of it.
A Page preset never places anything in them.

### Content reaching into the Hero

To let the first boxes of the content -- cards, a form -- stand on the lower part of the Hero, set
`heroOverlap` on the `content` Region to a step of `PHI_SPACE`, usually `lg` ([SHELL.md](./SHELL.md),
"Content reaching into the Hero"). The Hero does not make room for it on its own: its root Layout takes a
`paddingBottom` one step above the overlap, so its words end above the boxes. This is the one place a
preset uses a step above `md`, and only together with `heroOverlap`.

### Pictures a Module ships

A package has no static files, but it may declare pictures and folders in the `phis` block of its
`package.json`; the Site imports them into its Media library as ordinary Assets, and a preset names them by
the id the Site holds:

```json
"phis": {
  "media": {
    "folders": [{ "key": "phi-dossier-screenshots", "name": "Screenshots" }],
    "files": [{ "key": "phi-dossier-icon", "file": "dist/media/phi-dossier-icon.png",
                "folder": "phi-dossier-screenshots", "alt": "PhiDossier app icon" }]
  }
}
```

`phis module media sync` writes what is missing into the Site's library, and `phis update` runs it for every
installed package (phis-server `docs/CLI.md`, "module media"). A `key` is the package's own name for the
thing and never changes once published; an operator may bind a name to another Asset by hand, and the
Module follows.

`loadTree` of a route, Area shell or Area Overlay preset receives `media`, bound to the package of the
preset's owner: a Module cannot ask for another package's names. Both calls are asynchronous and return the
id or `null`; the Site reads the mapping on the first call only, so a preset that never asks costs no
request.

```ts
loadTree: async ({ page, media }) => {
  const icon = await media.asset("phi-dossier-icon");
  const shots = await media.folder("phi-dossier-screenshots");
  return buildOverviewPageTree({
    page,
    card: {
      /* ... */
      ...(icon !== null ? { sourceKind: "asset", assetId: icon } : {}),
    },
    gallery: { /* ... */ ...(shots !== null ? { folderId: shots } : {}) },
  });
},
```

`null` means the Site has none: the name is not imported yet, or its Asset or folder was deleted. The preset
leaves the picture out, as above; a page must not fail for a missing picture. When Core cannot be reached,
or is older than the route, every name answers `null` and the Site logs it once. A Page saved in the
Builder keeps the id of that moment; a later rebind reaches the Pages that still come from the preset.
A Theme preset's `loadPreset` and a block's `loadBlock` have no context and get no resolver.

An `asset:` icon in a preset may be built from `media.asset(...)`; a literal id or path stays refused
([MODULES.md](./MODULES.md), "An icon a preset names is already resolved when it names it").

### Checking a Page preset

`checkPhiPagePresetLayout(tree)` (`@phis/ui/module/page-check`, a door of its own: it is verify-time tooling and carries the Layout config parsers, so it is not in `@phis/ui/helpers`) reads a tree a route preset builds and returns what
breaks this section: a distance that is not a `PHI_SPACE` step, a step above `md` outside a Hero's bottom
beside `heroOverlap`, padding on a Layout without a Surface (and a Grid that keeps its default inset), a
content Region whose four paddings are not the Theme's Page inset for its Area, and a Page column that is not one `flex-vertical`. It also refuses a Layout config its own parser does not
take, for example a Grid of five columns (the Grid takes 1, 2, 3, 4 or 6: each divides its 24 tracks); on a
live page such a Layout is left out without a message, which is why a package runs the check over every
preset tree before it ships. A package runs it over every route preset in its own verify step and fails on
a finding.

It is for presets only. A Page an author edits in the Builder is never checked against it: the Inspector
offers the scale, and a value off it is the author's choice and is saved as it is.

`createPhiDeclaredMediaResolver({ assets, folders })`, from the same door, is the `media` a package passes to
its own `loadTree` in its verify step, where there is no Core. `assets` and `folders` are the keys the
package declares in `phis.media`. A declared key answers a stable placeholder id (distinct positive
integers); an undeclared key answers `null` and is recorded. It returns `{ media, findings() }`, and a
finding -- "asset `<key>` is not declared in the package's `phis.media`" -- fails the check.

`checkPhiPresetTextSources(tree)`, from the same door, reports every Widget that writes text into its
config without saying whose words they are (`textSource: "preset"` or `"site"`,
[TRANSLATIONS.md, "Widget config text"](./TRANSLATIONS.md#widget-config-text)). A Module runs it over
every tree its presets build, beside the Page rule. A Site's own package does not: every word in its Pages
is the Site's, which is what no marker means.

`checkPhiPresetTreeContract(tree, { page, forms })`, from the same door, holds a tree to every rule the
descriptor compiler holds it to while a Site serves the Page -- the same code, so a tree it reports is one
the compiler refuses, and the Page answers 500. The rules: every node carries a preset instance id
(`createPhiPresetCmsInstanceIdMap`), none twice; every parent, Region root, Overlay root and Page root is
in the tree; the base page layout node is the canonical one; an Overlay's actions Footer is the canonical
Flex preset; a modal's body and actions are the dialog's (`PHI_DIALOG_BODY_CONFIG`,
`PHI_DIALOG_COMMANDS_CONFIG`); and a modal at `PHI_DIALOG_WIDTH` holds not only Forms of one column
([Dialogs](#dialogs)); a Form's or a record Widget's `titleFromRecord` has a `source`, is routed to an
Overlay that hears it on `title`, and on a Form names one of the Form's fields. `page` is the Page row the test handed `loadTree`: a tree whose Page or Regions
belong to another is reported. `forms` are your Module's Form definitions (`definePhiRuntimeModuleForm`),
or a `Map` of `{ descriptor }` by Form id; the dialog width is judged only for the Forms you hand over, as
the compiler judges only the Forms of the Modules it has, so hand over every Form your package ships.
Each finding names the `node` (its id, or `"page"`) and the compiler's own `message`. Run it over every
tree your presets build, as a viewer who sees the most -- a manager's tree holds the dialogs a visitor's
leaves out:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { checkPhiPresetTreeContract } from "@phis/ui/module/page-check";

import { ACME_STATUS_FORMS } from "../forms";
import { ACME_STATUS_ROUTES } from "../presets";

// `page`, a manager's `runtime` and `media` (createPhiDeclaredMediaResolver) as the other checks build them.
describe("every preset tree keeps the tree contract", () => {
  for (const route of ACME_STATUS_ROUTES) {
    it(`${route.area} ${route.path}`, async () => {
      const tree = await route.loadTree({ page, runtime, params: {}, media } as never);
      const findings = checkPhiPresetTreeContract(tree, { page, forms: ACME_STATUS_FORMS });
      expect(findings.map((finding) => `${finding.node}: ${finding.message}`)).toEqual([]);
    });
  }
});
```

### Checklist for a Page preset

- One `flex-vertical` Page column under `content`, `padding` none, `gap` `PHI_SPACE.md`.
- Every `padding` and `gap` is a `PHI_SPACE` step; none is a string, a number or a `clamp()`.
- Every Layout config is one its parser takes (a Grid has 1, 2, 3, 4 or 6 columns, never 5);
  `checkPhiPagePresetLayout` reports it.
- Every Widget with text states `textSource` (`"preset"` or `"site"`); `checkPhiPresetTextSources`
  reports it. A Site's own package leaves it out.
- Every tree passes `checkPhiPresetTreeContract` with every Form the package ships, run as the viewer who
  sees the most: ids, parents and roots resolve, dialogs keep the dialog's body, actions and width. On a
  live Site a finding is a 500.
- No route beneath another of the same Area, except a list's entries (`/blog/:slug`) directly beneath
  the list; an overview stands beside its Pages and the container names it with `folderTarget`
  ([Addresses and folders](#addresses-and-folders)). `checkPhiRouteAddresses` reports it.
- Padding only on a Layout with a Surface, at `md`; the Region's edge is not repeated inside it.
- No Layout whose only job is to give one Widget a background.
- The reading width comes from the Region's `maxSize`, never from padding.
- A Hero only with a ground of its own; `heroOverlap` always with the Hero's larger `paddingBottom`.
- Nothing in the Area's Regions.
- On every page: nothing a Core Widget draws is drawn by a Widget of the Module's own, and a gap in a Core
  Widget is a proposal to the operator, not a workaround
  ([Before you start](#before-you-start-the-foundations-widgets-and-controls-come-first)).
- On a staff page: every list is a `table` Widget on a provider with its actions, every form a Form
  Widget in a dialog, no `page-title` Widget, and no Widget of the Module's own that draws tables, button
  rows or dialogs ([Before you start](#before-you-start-a-staff-page-is-composed-not-drawn)).
- Every `collection-view` is drawn by a shipped renderer where one draws its items -- the Media renderer
  for Assets of the Media library, the card View for records as cards -- and its Provider declares the
  actions that renderer offers (for the Media renderer `add`, `delete`, `reorder`, `upload`). No Render
  Client of the Module's own draws Media tiles, and no Form beside the Collection adds to it: adding is
  the Collection's `add` ([COLLECTIONS.md](./COLLECTIONS.md#one-collection-view-for-every-source-shipped-renderers-first)).

## 6c. A Public or App shell a Site package brings

A Site package may bring the frame its Pages stand in: the Header, Siders and Footer of Public or App,
with their Regions, Layouts and Widgets ([MODULES.md](./MODULES.md#a-modules-own-area-shell)).

- Declare one `areaShells` descriptor per Area on the catalog entry, beside `routes`: a
  `PhiCmsAreaShellPresetDescriptor` with the Module's own `ownerModuleId`, a `presetKey` of its own (for
  example `"public-shell"`), `shellPresetVersion: 1`, the `area`, and `loadTree`. `loadTree` returns the
  whole tree the way a Builder save writes it -- Regions (`header_top`, `header_main`, `sider_left`,
  `footer_main`, `footer_bottom`), Layouts, Widgets, Overlays, controller settings -- built with
  `createPhiCmsPresetNodes` as a Page tree is, ids minted like the package's other preset ids. To keep part
  of phis-ui's shell, name it in `composition` and omit what the package replaces (`omitRegionTypes`,
  `omitNodeKeys` within the base's `exportedNodeKeys`).
- Only Public and App take a Module's shell. A descriptor for `admin`, `editor`, `accounting` or
  `builder` is refused when the catalog is compiled.
- It applies when the Module is switched on in that Area, never by being installed: the delivered Site
  keeps phis-ui's shell, activating the package lays its shell over it, switching it off gives phis-ui's
  back. `areaOverlays` of active Modules are laid over it as over the base shell.
- One provider per Area. The Builder refuses to switch on a second package that brings the same Area's
  shell, naming the one that holds it.
- A Site may still edit the shell in the Builder; that stores a structure for the package's shell. A
  structure the Site stored for phis-ui's shell before is kept and comes back when the package is off;
  the Builder asks to clear it before a structure for the package's shell can be saved.
- A new `shellPresetVersion` reaches every Site that stores no structure for the package's shell at once;
  one that does sees "Preset update available" in Revisions.
- The descriptor may also propose the Area's settings in `settings`: `meta` (`index`, `sitemap`,
  `defaultTitle`, `titleTemplate` with `%s`) and `rootRoute`. They replace phis-ui's defaults until the Site
  saves in the Builder, whose first save keeps what was proposed. A key the package leaves out keeps
  phis-ui's default; an unknown key or a value of the wrong type is refused when the catalog is compiled.

## 7. Export the Server contributions

A package hands its Modules over under fixed names, one per boundary. The root entrypoint exports the
definitions; `./server` exports the catalog contributions. Both helpers come from `@phis/ui/module`:

```ts
// index.ts
import { definePhiModuleDefinitions } from "@phis/ui/module";
import { STATUS_MODULE_DEFINITION } from "./definition";

export const phiModuleDefinitions = definePhiModuleDefinitions([STATUS_MODULE_DEFINITION]);
```

```ts
// server.ts
import "server-only";

import { definePhiModuleServerContributions } from "@phis/ui/module";
import { STATUS_MODULE_DEFINITION } from "./definition";
import { STATUS_ROUTES } from "./presets";
import { STATUS_THEMES } from "./themes";
import { STATUS_WIDGETS } from "./widgets";

export const phiModuleServerContributions = definePhiModuleServerContributions([{
  moduleId: STATUS_MODULE_DEFINITION.moduleId,
  catalogEntry: {
    definition: STATUS_MODULE_DEFINITION,
    widgets: STATUS_WIDGETS,
    layouts: [],
    routes: STATUS_ROUTES,
    themes: STATUS_THEMES,
    load: () => import("./module").then((module) => module.STATUS_RUNTIME_MODULE),
  },
}]);
```

- `definePhiModuleDefinitions` rejects a duplicate Module id. A definition names no Area
  (`PhiModuleDefinition`); `package.json#phis` does.
- `definePhiModuleServerContributions` checks where the package is built that each `moduleId` matches
  its definition. Whether every Area-addressed descriptor (route, shell, overlay, navigation injection)
  addresses an Area the Module serves is checked where the Areas are known: when the generated projection
  completes the definition, at the Site's build.
- A contribution never names an Area. `phis module` reads the package's `phis` block and generates a
  projection that hands each Module's Areas to `collectPhiSiteModuleServerAreaContributions`
  (`@phis/ui/module/projection`), which completes the definition and places the Module into them; each
  Area catalog keeps the descriptors addressed to it. A package installed but not declared is refused
  there by name.
- `createPhiNextCmsSiteBridge` validates the combined catalog with `assertPhiRuntimeModuleCatalog`, so
  invalid ownership, missing loaders, unsupported render policies, or malformed signal metadata fail at
  Site assembly.

Routes, Area shells, overlays, navigation injections, and Themes are descriptors on the same catalog
entry ([MODULES.md](./MODULES.md#descriptor-identity-and-instantiation)); a route and the tree it draws
are [section 6a](#6a-pages-a-module-brings). Modules never create physical
Next.js routes. Outside Public, a route answers under its package: `/orders` in `@acme/shop` is served
at `/acme/shop/orders` -- the scope loses its `@`, and the module key is not part of it. Public carries no
namespace, and `/` is an application for the Area root slot. A Settings page is placed by its navigation
entry's `anchor: "settings"` (section 8a, Navigation); there is no route mount. A Module references its own Pages
through `(ownerModuleId, presetKey)`, never through a literal path.

### Cards on a Dashboard

A Module puts cards on an Area's Dashboard with `dashboardCards` on the same catalog entry
([DASHBOARD.md](./DASHBOARD.md)):

```ts
dashboardCards: {
  areas: ["app"],
  load: () => import("./cards").then((module) => module.STATUS_DASHBOARD_CARDS),
},
```

- `areas` is the Dashboards the cards belong on, a non-empty subset of the Module's `eligibleAreas`; the
  catalog refuses anything else, and an Area not named never loads the provider. Do not answer the same
  question again in `listCards` with `context.area`.
- The provider and everything it needs come from `@phis/ui/module/dashboard-cards`, a Server-only door:
  the card types, `createPhiDashboardCardId` (`<moduleId>/cards/<leaf>`; a card outside the Module's own
  namespace is refused) and `fetchPhiSiteApi` for the question to Core. A card about the viewer asks with
  `context.cookieHeader`.
- `target` names the Module's own route preset, and `accessPolicy` keeps the card from a viewer who may
  not see it.
- Cards that draw on the same answer share one read: wrap the fetch in
  `definePhiDashboardCardRead(load)` from the same door and call the result from each card. The list
  resolves its cards in a Route Handler, outside a render, so `React.cache` does not reach them; what they
  share is the card context, which the list resolves once and hands to every card, and the read is keyed
  by that object. The cards of one Dashboard make one call; a card refreshed through its endpoint gets a
  fresh context and so a fresh read ([DASHBOARD.md](./DASHBOARD.md)). Four cards each fetching the same
  figures is per-request fan-out.

### Records a Page is about

A Page about one thing of the Module's -- a product, an event -- reads it through a `record` Provider
([MODULES.md](./MODULES.md#record-providers)), so the record is in the HTML and the Page can answer 404:

```ts
// definition.ts: the descriptor, with the parameters a binding carries
dataProviders: [{
  key: SHOP_PRODUCT_RECORD_KEY, ownerModuleId: SHOP_MODULE_ID, kind: "record",
  executionMode: "live", authoringMode: "none", title: "Product",
  settingsFields: [{ key: "slug", type: "string", label: "Address" }],
}],

// server.ts: the server half, on the same catalog entry as dashboardCards
recordProviders: [{
  key: SHOP_PRODUCT_RECORD_KEY,
  load: () => import("./product-record").then((module) => module.resolveProduct),
}],
```

- A Widget of the Module reads a field of the page record with `resolvePhiPageRecordFields` and
  `result.fields.get(key)`; which helpers and types the door exports and which it does not is in
  [MODULES.md](./MODULES.md#the-fields-of-a-record-and-the-record-a-page-is-about), "Reading a field".
- Everything comes from `@phis/ui/module/records`, a Server-only door: the resolver types,
  `fetchPhiSiteApi` for the question to Core, `resolvePhiRecordSource` for the Module's Server Widgets, and
  `PhiWidgetFailureServer` for the Widget whose read comes back `unavailable`
  ([Reading a config](#reading-a-config)).
- The Widget's parser reads the binding with `readPhiRuntimeDataProviderBinding` from `@phis/ui/types` and
  insists it names the Module's own record Provider.
- The resolver answers the record or `null` for "no such record", and throws where it cannot ask.
- A Widget's config carries the binding, `{ providerKey, params: { slug } }`; the route's tree writes the
  route's parameter into it. The Widget reads it with `resolvePhiRecordSource({ registry, runtime, binding })`
  -- `registry` is in its render arguments -- and every Widget bound to the same record shares one read.

To make the Page a template an author can rebuild in the Builder
([MODULES.md](./MODULES.md#the-fields-of-a-record-and-the-record-a-page-is-about)):

- Declare the record's fields on the descriptor, `record: { audience, fields: [{ key, label, kind }] }`,
  and answer their values from `loadFields` on the server half. A price or a date the domain formats is a
  `text` field the Module hands over finished.
- Name `pageRecord: { providerKey, params, titleField?, descriptionField? }` on the route; `params` maps
  each Provider parameter to the route parameter that fills it.
- Build the starting tree from Core Widgets bound with `recordField` (and `linkRecordField`,
  `valueRecordField`), not from Widgets of the Module that carry the slug.
- A Widget of yours whose own content is bound (`contentBinding`) and that can show a record field in its
  place names that config field in `contentBinding.recordField`, as Markdown, Image and Simple Text do.
  Without it, on a Page about a record the Widget is judged by its own content and left out as unpublished
  where it has none ([components/widgets/README.md](./components/widgets/README.md)).
- Do not read the record or call `notFound()` in `loadTree`: Core reads the record once per request and
  answers the 404, for the Module's tree and a stored override alike. The Builder opens `loadTree` with
  `params: {}`. `loadTree` runs before the record is read and gets no Registry, and `runtime.page.record` is
  not set there, so the tree decides nothing about the record while it is built; a section a record
  without the content should lack is made of Widgets bound to fields that exist only with content
  ([When the tree is built](./MODULES.md#descriptor-identity-and-instantiation)), and a node that is to go
  with it states `visibleWhen: { source: "record", valuePath: "<field>", operator: "truthy" }`, which
  the renderer answers once Core has read the record.
- Mind what an empty section leaves behind: a bound Widget with no field draws nothing, but its frame, and a
  Layout around Widgets that all draw nothing, stay in the slot and the parent Flex Layout's `gap` is still
  applied around them ([LAYOUTING.md](./LAYOUTING.md#slots)). State `visibleWhen` on `record` on the node
  -- the Widget, or the Layout around the section -- and it is left out with its frame where the record
  lacks the field; on the Builder's canvas it is always drawn.
- `runtime.page.path` is the path of the request (`/shop/p/chair`), not the route's pattern
  (`/shop/p/:slug`).
- A `picture`/`pictures` field carries `src` as an `http(s)` URL or a Site-relative path; a `data:` URI makes
  the picture no picture. A Module ships no static files: a picture is a Media asset (one the package
  declares reaches the Site as one, [Pictures a Module ships](#pictures-a-module-ships)) or an address the
  provider answers ([MODULES.md](./MODULES.md#the-fields-of-a-record-and-the-record-a-page-is-about)).
- Optionally offer `loadSamples` on the server half, a few `{ label, params }` with the Provider's own
  parameters; the Builder's Preview takes the first. Without one a template previews with its Widgets' own
  content.

## 8. Export the Client and Authoring contributions

`./client` exports the live Client contributions, one entry per Module:

```tsx
// client.ts
"use client";

import dynamic from "next/dynamic";
import { definePhiModuleClientContributions } from "@phis/ui/module/client";
import { STATUS_MODULE_ID } from "./ids";

export const phiModuleClientContributions = definePhiModuleClientContributions({
  modules: [{
    moduleId: STATUS_MODULE_ID,
    // A literal next/dynamic call, so the server render preloads the Controller's chunks.
    Controller: dynamic(() =>
      import("./controller/client").then((module) => module.PhiStatusControllerClient)),
    renderClients: [],
    dataProviders: [],
  }],
});
```

- `Controller` is present exactly when the Module owns a Controller. A controllerless Module omits it.
- `renderClients` pairs a namespaced Widget type with a Client made by
  `definePhiRuntimeModuleRenderClient(dynamic(() => import(...)))` from `@phis/ui/runtime/render-client`,
  for Widgets whose Server renderer uses `PhiRuntimeModuleRenderClientHost`. Pure Server-rendered Widgets
  need no entry. The `dynamic` call must be literal and come from `next/dynamic`.
- `dataProviders` lists `{ key, ownerModuleId, loadLive, loadAuthoring? }` for the Provider descriptors in
  the definition. `loadAuthoring` exists only for providers whose `authoringMode` is `read` or `edit`.
- `calendarAdapters` (beside `modules`) lists Calendar adapter Clients. Their Server descriptors are
  `calendarAdapters` in the definition, keyed `<owner>/calendars/<key>`. An Area holds the adapters of
  the packages its generated Client file imports, which are the packages with a Module for that Area.
- `mediaSources` (beside `modules`) lists media source Clients, `{ key, ownerModuleId, load }`
  ([Offering a media source](#offering-a-media-source)). Their Server descriptors are `mediaSources` in the
  definition, keyed `<owner>/<name>`. Like the adapters they are held flat, not per Area: the picker offers
  the ones whose Module is active in the Area it is open in.
- The door is imported only into the generated Client files of the Areas the package's Modules serve.
  Keep it a list of `next/dynamic` loaders and small constants: whatever it reaches statically is paid
  on every page of those Areas.
- `definePhiModuleClientContributions` rejects a duplicate Module id.

`./authoring-client` exports the Authoring contributions. Every Module brings one, including a Module
with nothing to author: the Builder wraps each active Module's Authoring Client around the Canvas, and
a missing loader is a hard failure.

```tsx
// authoring-client.ts
"use client";

import { definePhiModuleAuthoringContributions } from "@phis/ui/module/authoring-client";
import { STATUS_MODULE_ID } from "./ids";

export const phiModuleAuthoringContributions = definePhiModuleAuthoringContributions([{
  moduleId: STATUS_MODULE_ID,
  loadAuthoring: () => Promise.resolve(PhiStatusAuthoringClient),
}]);
```

`PhiStatusAuthoringClient` is the Client built in [section 4](#authoring-adapter); a Module without
Widgets passes `createPhiAuthoringWidgetModule([])`. `collectPhiSiteModuleAuthoringContributions` refuses a
declared Module without an Authoring contribution, so the mistake surfaces where the Site is composed.

Public calendar values are serializable adapter-neutral records from `@phis/ui/types`. Do not persist or
signal `Date`, Dayjs, Luxon, Temporal, or adapter-private objects. Scalar `date` and `time` signals carry
`YYYY-MM-DD` and `HH:mm[:ss[.fraction]]` strings; calendar-aware selections, ranges, and events use
`json` with a package-namespaced value schema. Core owns the Gregorian adapter and the Date Input
Widget; `@phis/calendar` is an optional Module package with event calendars and further calendar systems.

## 8a. What a Module package exports

```text
.                   phiModuleDefinitions             definePhiModuleDefinitions            @phis/ui/module
./server            phiModuleServerContributions     definePhiModuleServerContributions    @phis/ui/module
./client            phiModuleClientContributions     definePhiModuleClientContributions    @phis/ui/module/client
./authoring-client  phiModuleAuthoringContributions  definePhiModuleAuthoringContributions @phis/ui/module/authoring-client
./fonts             phiModuleFontContributions       definePhiModuleFontContributions      @phis/ui/module   (optional)
```

`phiModuleClientContributions` carries `calendarAdapters` and `mediaSources` beside `modules`; the types a
package names them with (`PhiMediaSourceDescriptor`, `PhiMediaSourceClient`, `PhiMediaSourceClientDefinition`,
`PhiMediaSourceTakenFile`, `PhiMediaSourceKey`) come from `@phis/ui/types`, and the manifest a Site composes from
`@phis/ui/runtime/media-source-client`.

A generator cannot guess an export it was never told about, so these names are fixed (`module.ts`). Each
is keyed by Module id, because one package may carry several Modules. No generated file imports the
root: the projections read the Areas from `package.json#phis` and everything else from the other doors.
`phiModuleDefinitions` stays the package's own list of its Modules, for its tools and tests.

**`./fonts` exists only for a package that declares typefaces, and nothing else in the package imports
it.** A declaration is a `next/font/local` call at module scope: the Site's build evaluates it, hosts the
files from the Site's origin, and computes fallback metrics; outside a Next build the call throws. The
boundary exports catalogue entries, not loader results: the family name a fonts block may write in a
slot, the CSS variable in the Module's own namespace (`var(--phi-font-<module>-<family>)`), and the class
that puts the variable in scope. `definePhiModuleFontContributions` rejects an unnamed or duplicate
family, a family `@phis/ui` already declares, and a variable outside that namespace. Declarations say
`preload: false`, because the Theme decides per request which family a page uses. The files travel in
`dist` under a licence that permits redistribution and subsetting. The boundary does not begin with
`"use client"`. Font delivery is described in [NEXT_INTEGRATION.md](./NEXT_INTEGRATION.md#fonts).

**A Widget names itself from its own package.** `resolvePhiCmsWidgetPluginKey` maps a bare type key to a
first-party Module and refuses an unknown one. A Module package composes its own plugin key
(`@acme/status/modules/status/widgets`) and builds the namespaced type with
`buildPhiCmsWidgetNamespacedTypeKey`; the namespaced type is what the Server manifest and the Render
Client manifest carry. The authoring editor is built from Controls in `@phis/ui/controls`.

**Navigation.** Place a sidebar entry by role, not by somebody's item key: `anchor: "start"` (top of the
sidebar), `"main"` (the body, ahead of Settings), `"settings"` (inside the Area's Settings container), or
`"end"` (the very bottom). Each Area decides
where its anchors are, and one it does not declare -- `settings` in an Area without a Settings container
-- is refused. The entry is `{ navKey: "<area>:sidebar", anchor, item }`, with no `parentItemKey`.
Entries sharing an anchor, and an injection that names neither an anchor nor an item, are ordered by
`ownerModuleId`, `presetKey`, and `itemKey`; the Site reorders from there.
The older keyed form still compiles: `before`, `after`, and `parentItemKey` must point at an item the
surface exports through `exportedItemKeys` or at one the Module injects itself, and are the only way
into a surface without anchors, such as `<area>:account`.

A surface without anchors -- the Public header and footer, App's header, footer and quick links, every
`<area>:account` -- takes the keyed form. The Public footer's Quick Links read `public:footer`, so an
entry there is one more item in the route's `navigation`:

```ts
navigation: [
  { navKey: "public:header", parentItemKey: null, item: { itemKey: "@acme/site/nav/public/about",
    label: { defaultMessage: "About us" }, routePresetKey: "acme-about-page" } },
  { navKey: "public:footer", parentItemKey: null, after: "@phis/ui/modules/public/nav/terms",
    item: { itemKey: "@acme/site/nav/public/footer/about", label: { defaultMessage: "About us" },
      routePresetKey: "acme-about-page" } },
  { navKey: "public:footer", parentItemKey: null, after: "@acme/site/nav/public/footer/about",
    item: { itemKey: "@acme/site/nav/public/footer/github", label: { defaultMessage: "GitHub" },
      icon: "antd:github", target: { kind: "external", href: "https://github.com/acme", newTab: true } } },
],
```

The Public footer exports two base entries to stand beside, `@phis/ui/modules/public/nav/privacy` and
`@phis/ui/modules/public/nav/terms`, in the order Privacy, Terms (the contact entry follows them). The header exports the
terms only. A Module that covers `/privacy` brings no entry of its own: the base entry leads to its Page through the
path.

An entry that leads out of the Site names `target: { kind: "external", href, newTab? }` instead of a
`routePresetKey` or an Overlay, never beside one. Only `https:` is accepted; the catalog refuses anything
else when it is compiled. It rides on any of the Module's routes -- the one it belongs beside -- renders
like a link the Site added in the Builder (`newTab` opens it with `rel="noreferrer noopener"`), and is
shown there as external and from your Module, so the Site can hide it.

Which surfaces each Area declares, and which Widget draws each, is the table in
[MODULES.md](./MODULES.md#navigation-surfaces). An entry is computed per request; it never needs a
database row, and a navigation the Site has saved in the Builder does not hide it.

## 8b. How the package is built

A Module package ships compiled. `dist` holds transpiled ESM with `"use client"` intact, `.d.ts` beside
each file, and copied assets (CSS, fonts, pictures). Use `tsc`, not a bundler: `tsc` emits one file per
source file and leaves the directive and the bare imports of `react` and `@phis/ui` alone, while bundlers
tend to drop the directive and inline peer dependencies. `@phis/example`'s `build` script is
`tsc -p tsconfig.build.json` plus copying its font and picture files.

**Node types are the package's own, and only for server code.** `@phis/ui` points its doors at sources,
so a package compiles what a door reaches. The data doors -- `types`, `constants`, `helpers`, `theme`,
`controls`, `forms`, `layouts`, `navigation`, `module`, `cms/plugins` and the like -- reach no Node API and
no stylesheet, and `validate-module-dependency-direction` keeps it so; a package that only uses them needs
neither Node types nor CSS declarations. The server doors -- `module/labels`, `server-helpers`, `net` --
are server code and reach Node: the credentials reader takes `node:fs`. A package that imports one of them
runs on Node and says so: `@types/node` in its `devDependencies` and `"types": ["node"]` in its
`tsconfig.json`. `@phis/ui` does not hand Node's globals to a package whose
client code has no use for them.

`phis module check` inspects the installed package without loading it
(`phis-server/src/cli/module-package.mts`):

- `.`, `./server`, `./client`, and `./authoring-client` are exported and point at existing files;
- `./client` and `./authoring-client` begin with `"use client"`; `.` and `./server` do not;
- `react` and `@phis/ui` are not ordinary dependencies, and the package carries no copy of its own;
- a package that ships CSS states CSS side effects;
- the `./server` graph takes no Client component
  ([What a Server half may import](#what-a-server-half-may-import));
- the `phis` block declares the package's Modules, each id belongs to the package, and each category is
  known.

`.d.ts` files are not checked there, but the generated projection imports the package by name and the
Site's build typechecks it. A package with Widgets still needs a Site build after installation, because
its Client code enters the bundle graph. Compiled, only the declared `.d.ts` surface is typechecked
against the installed `@phis/ui`; the peer range states compatibility.

## 8c. Gating a surface on a Server Add-on's role

A Module may hide a page or a navigation entry from somebody who does not hold a role its Add-on half
declared:

```ts
accessPolicy: {
  access: "addon-roles",
  providerId: "@acme/market",
  allowedRoles: ["vendor"],
}
```

Names, not flags. An Add-on's roles are frozen from the first assignment and declared in its own
manifest; a bit position would have to be handed out and kept forever, reordering the manifest would
silently change what a policy means, and thirty-two would be the ceiling.

The names reach the client with the rest of the viewer, as `addonRoleClaims`, filtered to what the
Add-on's **current** manifest declares and to Add-ons enabled for this Site. A viewer that never carried
them denies the policy rather than assuming: absent is not the same as empty-and-known.

**This is presentation, not protection.** Leaving a link out spares somebody a refusal they could not
have acted on; it does not make the page safe. What the link leads to is decided again on the server, by
the handler, against `roles:v1`. A Module that gates only in the client has hidden a door, not locked it.

Like the other provider-scoped policies, this one is owner-checked: a Module may name its own Add-on and
Core, and not somebody else's. The policy is part of [ACCESS.md](./ACCESS.md); Add-on roles are declared
as described in [phis-server AUTHORIZATION.md, "Add-on roles"](https://github.com/phis-dev/phis-server/blob/main/AUTHORIZATION.md#5-add-on-roles).

## 8d. Icons a Module brings

A preset or a Widget config names an icon for `PhiIcon`. The bundled `antd:` set covers what the house
uses; a mark it lacks is the Module's to bring, not the core registry's to grow. A Module registers its
icons on its **definition**, as plain data it bundles itself -- not on the Client door:

```ts
// icons.ts
import { definePhiModuleIcons } from "@phis/ui/module";
import ProductOutlined from "@ant-design/icons-svg/es/asn/ProductOutlined"; // needs the dependency

export const STATUS_MODULE_ICONS = definePhiModuleIcons([
  { name: "product", label: "Product", drawing: ProductOutlined },
  {
    name: "beacon",
    label: "Beacon",
    drawing: { viewBox: "0 0 24 24", paths: ["M12 2a10 10 0 100 20 10 10 0 000-20z"] },
  },
]);

// definition.ts:  icons: STATUS_MODULE_ICONS,
// ids.ts:         export const STATUS_PRODUCT_ICON = createPhiModuleIconName(STATUS_MODULE_ID, "product");
```

- A drawing is a `viewBox`, one or more path strings and an optional `fillRule`, filled with
  `currentColor` so it follows the Theme and the colour a Widget gives its icon. An
  `@ant-design/icons-svg` outline or filled definition is read into one by `definePhiModuleIcons`, so an
  Ant Design icon the core lacks is one import -- if the package depends on `@ant-design/icons-svg`;
  copying the path data in as the Module's own drawing is equally fine. A two-tone definition, or one
  holding anything but `<path>`s, is refused. Nothing is fetched: an `iconify:` icon stays a Builder
  choice and is refused in presets.
- A name is one lower-case kebab segment, unique within the Module; `definePhiModuleIcons` refuses a
  duplicate or a malformed name where the package is written, and the catalog refuses the same again.
  The `label` is what the Builder's icon picker shows.
- The icon is named `module:<moduleId>/<name>` -- `module:@phis/dev/modules/site/product`. `PhiIcon`
  cuts the namespace at the first `:` and the icon name after the last `/`, so a scoped module id reads
  unambiguously. Write it with `createPhiModuleIconName` from `@phis/ui/constants`, which throws on a
  part the grammar refuses, and use the constant in presets, Widget configs and Client code alike.
- **It resolves where the Module is active.** The definition reaches the browser the way `videoProviders`
  do: the Area's root Layout hands the active Modules' icons to the Area as props, and the Builder hands
  the target Area's to its canvas and Inspector. On a live page a name whose Module is not active there
  draws nothing; in the Builder it draws a warning mark with the name as its title. So a preset names its
  own Module's icons, never another package's, and the Module's own `icon` -- the mark the Modules list
  shows for Modules that are not active -- stays an `antd:` name.
- The Builder's icon picker lists the active Modules' icons below the bundled set, one group per Module
  under its title.
- Every page of an Area carries its active Modules' icons in its payload. Register the marks the Module
  uses, not a library.

## 9. Install without patching the Skeleton

Installing a Module never adds or rewrites Skeleton source. `phis module` records the installation and
generates a projection, which the Skeleton hands to the generic hosts from the files under
`src/runtime-modules/` -- each Area host, each Area's Client boundary, and the root. Those files do not
change when a Module is installed or removed; placement by the declared `eligibleAreas`, collision
checks, and the Builder's union across Areas stay in `@phis/ui`.

```text
phis module list  [--site <site key>]
phis module add   --site <site key> --package <@scope/name> [--spec <version or workspace:*>] [--path <site root>]
phis module del   --site <site key> --package <@scope/name> [--force] [--path <site root>]
phis module sync  --site <site key> [--path <site root>]
phis module check --site <site key> [--package <@scope/name>] [--path <site root>]
```

(`phis-server/src/cli/phis.mts`)

- `--path` names the Site root when it is not the Site's configured source path.
- `add` records the package in `config/phis-modules.json`, rewrites the projection, and runs the package
  check. With `--spec` it writes the package into the Site's dependencies; without one the package must
  already resolve. Nothing is fetched.
- `del` refuses while the package still draws blocks on published pages of the Site and lists them;
  `--force` removes it anyway. The blocks stay in their pages and stop being drawn. It also removes the
  dependency and rewrites the projection.
- `sync` regenerates the projection from the recorded state.
- `check` runs the package check from [section 8b](#8b-how-the-package-is-built).

A recorded entry is exactly `{ packageName, origin, spec? }` (`phis-server/src/cli/modules.mts`).
`origin` is `resolved` when `add` was given a `--spec` and `local` otherwise; the type also admits
`source`.

The projection is generated files, written together: `src/generated/site-modules.ts` (Server), one
`site-modules-client-<area>.ts` per Area, `site-modules-authoring-client.ts`, and
`site-modules-fonts.ts`. All of them are read from each package's manifest in the Site's `node_modules`,
because nothing may run the package to ask: the Areas from its `phis` block decide which Area files
import its Client door and are handed to the projection as placements, and its `exports` decide whether
the fonts file imports `./fonts` -- that boundary calls `next/font/local` and throws outside a Next build.
A package the install has not brought in yet has neither answer: it stays in the Server file, the Site's
build refuses it by name, and `add` says to run `phis module sync` after installing what `--spec`
recorded. All files are preserved when the Skeleton is reconciled, so regenerating a Site does not
uninstall its Modules.

After installation, rebuild the Site. Installing never enables a Module: the Site selects it per Area
in the Builder, and only ids present in the build can be selected. If the package also carries an
Add-on half, install and enable the Add-on through `phis addon` ([phis-server
SERVER_ADDONS.md](https://github.com/phis-dev/phis-server/blob/main/SERVER_ADDONS.md)); Module activation never installs or enables it.

## 10. Access, server capabilities, and errors

- Apply `PhiViewerAccessPolicy` to Module, route, navigation, Widget, or Layout descriptors when needed.
- Third-party contributions may use Core roles or roles from their one bound Add-on provider.
- Site Admin retains the documented Core override; other Core and provider roles remain explicit.
- Unavailable server capabilities deactivate only the dependent Module and produce a scoped diagnostic.
- Missing Widget/Layout renderers remain localized to the affected CMS node.
- Do not catch contract failures and substitute a global registry or first-party implementation.

## 11. Remember what somebody decided

A dismissed card, how far a feed was read, where somebody got to in a guided sequence: your Module can
keep these per Site, against the account of the person looking. Declare what you keep on the Module:

```ts
// definition.ts
  userState: [
    { key: `${STATUS_MODULE_ID}/dismissed-banner`, shape: "flag" },
    { key: `${STATUS_MODULE_ID}/read-until`, shape: "marker" },
  ],
```

A key is `<module id>/<key>`, and **the prefix is the whole authorization**: Core admits a write when
an active Module of that Site owns the prefix and the session belongs to the person being written about.
Keys of a Module that is switched off are refused, and the state it already holds is kept and hidden
until it is switched on again.

The declaration itself travels nowhere -- unlike a route or a Widget type, Core never sees it. It is your
own account of what you store: it lets the browser refuse a malformed write before spending a round trip,
and it puts what your Module keeps where the next person reading your code will find it. An undeclared
key still works. Declare anyway.

Four shapes, and the choice is not cosmetic:

| Shape | Value | Use it for |
| --- | --- | --- |
| `flag` | one boolean | a dismissed card, a hint switched off |
| `marker` | one number that only moves forward | "read up to here" |
| `value` | one JSON object under a declared schema | a position in a sequence |
| `set` | a bounded list, oldest evicted, `limit` required | independent entries a marker cannot express |

**Reach for `marker` before `set`.** A reader who has seen everything up to Tuesday has read everything
before it, so one number answers what a growing list of ids answers only by growing -- and that list
travels with the row on every request that resolves a session. A marker also settles the case a set
cannot: it never moves backwards, so a second tab answering late cannot unread what somebody read.

Write from the browser:

```ts
import { writePhiUserState, clearPhiUserState } from "@phis/ui/runtime/user-state-client";

await writePhiUserState({ descriptor: DISMISSED_BANNER, value: true });
await clearPhiUserState(DISMISSED_BANNER.key);   // absent again, which is not the same as `false`
```

Read it while rendering, in an authenticated Area, with `getPhiUserState` from `@phis/ui/server-helpers` --
guarded by `runtime.viewer.access === "authenticated"`, and never on a Public page: those are rendered
once for every anonymous visitor, `cookies()` is empty there without saying so, and "nothing stored"
would be the answer for everybody. A Public surface that wants an account-bound fact loads it in the
browser after the page arrives ([STATIC_RENDERING.md](./STATIC_RENDERING.md)).

Two limits worth knowing before you design around them: your namespace is capped at 4096 serialized
bytes across all of your keys together, and a `set` at 256 entries. Both answer with a refusal rather
than by dropping something quietly.

**What does not belong here.** Anything your Module needs in order to work -- an order, a booking, a
submitted form -- belongs in your own storage with its own lifecycle. The test: if losing it would be a
support case rather than a small annoyance, it is not user state. And it is never a permission: a
signed-in person can write whatever they like into their own namespace, so nothing you read from here
may decide what somebody is allowed to do.

## 12. Add a place a video may come from

The Video Module ships YouTube and Vimeo. If your customer's videos live somewhere else, contribute a
provider instead of a second video Widget:

```ts
// definition.ts
  videoProviders: [
    {
      key: `${STATUS_MODULE_ID}/video-providers/wistia`,
      ownerModuleId: STATUS_MODULE_ID,
      title: "Wistia",
      recipient: "Wistia, Inc.",
      privacyUrl: "https://wistia.com/privacy",
      embedHostname: "fast.wistia.net",
      embedUrlTemplate: "https://fast.wistia.net/embed/iframe/{id}",
      embedParams: { autoPlay: "1", doNotTrack: "true" },
      idPattern: "^[A-Za-z0-9]{10}$",
      idExample: "26sk4fhlnn",
      addressPatterns: ["^https?://[a-z0-9-]+\\.wistia\\.com/medias/([A-Za-z0-9]{10})(?![A-Za-z0-9])"],
      aspectRatio: 16 / 9,
    },
  ],
```

A provider is data and nothing else: no Client loader, no component, no manifest entry. The descriptors
reach the browser as props, and the Video Widget offers yours beside the first-party ones -- a Site picks
Wistia from the provider field and enters an id.

Six rules the catalog enforces when it is built, so a wrong provider stops a build rather than misleading
a visitor:

- `recipient` names a **company**, not a domain, and `privacyUrl` is where that company explains itself.
  The placeholder shows both, and it is what the visitor decides on.
- `embedUrlTemplate` is `https`, carries `{id}` exactly once, and its host must **be** `embedHostname`.
  You cannot name one recipient and load from another.
- The template has no query of its own. What you always send goes in `embedParams`, as a list somebody can
  read -- and those keys become reserved: a Site's own playback parameters are refused where they collide,
  so `doNotTrack` cannot be switched off from an inspector field.
- `idPattern` is anchored at both ends and `idExample` is an id it accepts. The Widget stores a bare id, so
  something has to be able to say that a half-pasted share link is not one; the example is what the Builder
  shows the person who has to type one.
- Every address pattern starts with `^` and has exactly one capture group, which is the video. Addresses
  are not stored -- they are how a pasted link becomes an id -- but without the anchor a pattern reads an id
  out of the middle of somebody else's address.
- There is no "any address" provider, and there will not be one. A frame whose recipient cannot be named
  is a frame whose placeholder cannot tell the truth ([design/CONSENT.md](./design/CONSENT.md)).

Use the provider's privacy-friendlier host and parameters where it has them, the way the first-party
providers use `youtube-nocookie.com` and Vimeo's `dnt=1`. Read what they actually promise before you rely
on the name: `youtube-nocookie.com` is not cookie-free, it only keeps a view out of personalisation. Either
way it is data minimisation after the decision, never a reason to skip asking -- the request still leaves
for the provider and still discloses the page it comes from.

## Boundary checklist

- Server catalog files contain metadata and lazy imports, not Client components.
- Definition/config files are safe for both Server and Client imports. Transitively: a definition is
  reachable from Client code -- Label Sets bind to it, and the package's root door exports it -- so
  nothing its imports reach may be `server-only` or touch `next/headers`. Prefer the narrow
  `@phis/ui/module/*` entries over the `server-helpers` and `forms` barrels, which carry both.
- A Server file imports Form helpers from `@phis/ui/forms` and nothing Client from it; the Form Control,
  the provider registry and the Form Controller client are in `@phis/ui/forms/client`. A Module's Server
  door is reached by every route of the Site, so a Client value it reaches ships everywhere
  (`scripts/validate-server-contract-doors.mjs` keeps the doors a Server half reads free of them).
- A Widget's server half renders no Control, `PhiIcon` or other Client component itself; it draws plain
  HTML or hands a view model to its Render Client ([What a Server half may import](#what-a-server-half-may-import)).
- A live Widget client takes only types from its `config.ts`. The config module is the parser, with the
  block defaults merge behind it; a helper the client needs at runtime lives in a file of its own beside
  it (`scripts/validate-render-client-boundaries.mjs` checks first-party Widgets).
- `"use client"` appears only at executable Client, Controller, provider, and Authoring boundaries.
- Live Area manifests do not import Authoring modules.
- Public manifests cannot reach Builder/Admin/Editor implementations.
- The Builder Authoring manifest contains only the installed target-Area union.
- Module UI providers wrap only module-owned output and scope CSS and portals locally.
- No registry is populated by import side effects or mutable module globals.
- No database value is passed to an unrestricted dynamic import.
- Every persisted identity and provider key is package-namespaced and stable.
- A preset names bundled `antd:` icons or its own Module's `module:` icons, registered with
  `definePhiModuleIcons` and named with `createPhiModuleIconName`; never `iconify:`, `asset:` or another
  package's Module icon ([8d](#8d-icons-a-module-brings)).
- A preset names distances, colour roles and corners through `PHI_SPACE`, `PHI_COLOR` and `PHI_RADIUS`
  from `@phis/ui/theme`; it never spells out an adapter property such as `var(--phi-padding-lg)`.
- Controller fields and the `Controller` Client are either complete as one group or absent as one group.
- Every controllerless Module contributes at least one meaningful owned artifact and no no-op Controller.
- Widgets use Phi Controls, providers, signaling, and the shared Canvas scaffold contracts.
- A collection item renderer of the Module's own (`collectionItemRenderers`, a Render Client named as a
  resource's `itemRendererKey`) draws items no shipped renderer draws. A collection of Media library
  Assets names `PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY` and answers `PhiMediaCollectionItem`s
  ([COLLECTIONS.md](./COLLECTIONS.md#the-media-renderer)).
- Every field a Widget offers in `fields` and reads in its parser is used by its render or its Client. A
  field that is parsed and then read by nothing tells the author something happens that does not.
- A capability reported as missing names the owning Module and what of it was checked -- Widgets,
  Controller, field Providers, data Providers, Core routes ([AGENTS.md](./AGENTS.md#before-you-call-something-missing)).
- A Widget draws itself in the Builder only with meaningful content (sample values, the shape of its
  settings); otherwise it leaves `renderEditor` out and declares `preview: "visualPlaceholder"`, and draws
  no skeleton of its own.
- A Widget's popups render in a portal; `getPopupContainer` never names a node inside the block.
- Server handlers revalidate Form input and enforce authorization independently of Client validation.
- No Public Widget's server half reads cookies, headers or the viewer, or renders a per-visitor value
  (token, nonce, timestamp, random value); those are loaded in the browser (STATIC_RENDERING.md).
- Module data a Public page must show without delay is loaded in the browser, not rendered on the server.
- User state is declared on the Module, keyed under its own id, read on the server only in an
  authenticated Area, and never read as a permission.
- Every handler-mode Form has an owned phase-matching handler Provider, and the owner Module is selected in
  every intended effective Area preset.

## Verification

Run the package's own checks:

```bash
pnpm typecheck
pnpm build
```

A package may add its own script; `@phis/example` has `pnpm verify`, which checks that its catalog
contributions resolve. Then, against a Site:

```bash
phis module add --site <site key> --package @acme/status --spec workspace:* --path <site root>
phis module check --site <site key> --package @acme/status --path <site root>
```

Rebuild the Site and test at least:

- one Area with the Module inactive and the same Area with it active;
- the code-owned Area baseline on a Site with no persisted Area revision;
- for a package that brings a Public or App shell: the Area with the Module on (its shell, and its
  `settings` where it proposes any) and off again (phis-ui's shell back), and a Builder save on its shell;
- Runtime and Preview rendering of every contributed Widget;
- Builder Picker, Inspector, Canvas, and Authoring output;
- Controller mounting and the declared signal routes;
- the diagnostics for a missing or incompatible server capability;
- that Public does not download Builder or unrelated optional-Module code;
- every Widget on a Public page in a production build, signed out and without a query
  ([STATIC_RENDERING.md](./STATIC_RENDERING.md#checking-a-page)).

Measure payload from the production browser resource list; development Turbopack chunks are not a
production bundle.
