# Translation Contract

This document owns the `@phis/ui` side of translation: the server-only helpers, Label Sets, source
locales, structured documents, and what the package does with the resolved request locale.
Persistence, canonical storage envelopes, provider requests, and change markers are owned by
`@phis/server` ([TRANSLATIONS.md](https://github.com/phis-dev/phis-server/blob/main/TRANSLATIONS.md)). The locale capability superset, each
Site's validated subset, and `GET /api/v1/site/locale` are owned by `@phis/server`
([phis-server TRANSLATIONS.md, "Locale capability"](https://github.com/phis-dev/phis-server/blob/main/TRANSLATIONS.md#locale-capability)). How translations are
cached in a Site process is described in [gateway/CACHES.md](./gateway/CACHES.md#translation-caching).

## Helpers

The translation helpers are server-only and exported from `@phis/ui/server-helpers`
(`server-helpers/translate.ts`):

- `tr(msg, params?, ctx?, format?)` and `trForLocale(locale, msg, params?, ctx?, format?, sourceLocale?, runtime?)` translate
  one Site-scoped message.
- `trBulk(msgs, ctx?, format?, sourceLocale?)` and `trBulkForLocale(locale, msgs, ctx?, format?, sourceLocale?, runtime?)`
  translate several Site-scoped messages in one request and keep their order: one answer per message,
  at its position. An empty message is answered with an empty text and not sent, so a caller may match
  answers by index (`gateway/tr.ts`). Dropping it, as the batch once did, moved every later answer onto
  the wrong message.
- The Site-scoped `...ForLocale` translators name the Site's store from the request's runtime unless the
  caller passes its `runtime` (any value with `site`). Code that runs outside a request -- a Widget's
  `searchText`, read by the search index -- must pass it; the request's scope is not there to be read.
- `trGlobal(msg, params?, ctx?, format?)`, `trGlobalForLocale(...)`, `trGlobalBulk(msgs, ctx?, format?)`,
  and `trGlobalBulkForLocale(...)` translate global Phi copy, whose source locale is always `en`
  (`PHI_CANONICAL_SOURCE_LOCALE`). A request for `en` returns the source text without a request.

Rules:

- The helpers without a locale read the request locale through `resolvePhiRequestLocale()`, and the
  Site from the request-scoped runtime set by the CMS root rendering.
- `ctx` is empty by default. Set it only when the same visible text must translate differently in
  another semantic context. Shared UI copy uses the fixed registers `PHI_TR_CTX_WEB_UI_LABEL`
  (captions on controls) and `PHI_TR_CTX_WEB_UI_MESSAGE` (sentences the UI says: empty states,
  failures); Module descriptions use `PHI_TR_CTX_MODULE_DESCRIPTION`. Do not invent Site-specific
  contexts for shared UI copy.
- `format` defaults to `text`. Use `html` only for intentional translatable HTML markup.
- A failed request returns the source text; the helpers never throw for a translation failure.
- Dynamic values are never part of a translated string: no names, usernames, email addresses, company
  names, customer numbers, Site names, URLs, or similar data. Source text uses the positional
  placeholders `%1`, `%2`, ... (for example `Login history for %1`), and values are applied after
  translation. The single-message helpers take them as `params`; bulk results and Label Sets are
  formatted by the caller, and Client Components format already-translated templates locally instead of
  concatenating labels with values.
- Free-text page and Site copy prefers one `trBulk(...)` over many `tr(...)` calls.
- Translation is separate from the data-source contract and from Form submit dispatch.
- `phiRuntime()` (`@phis/ui/server-helpers`) is for runtime metadata itself -- `apiBaseUrl`,
  `internalToken`, `siteKey`, `locale`, and `fetchSiteLocaleConfig()` -- not for translating.

## Widget config text

The words written into a Widget's config are translated by the renderer, not by the Widget. One pass per
rendered tree (`server-helpers/cms-widget-texts.ts`) runs beside the feature and link passes, collects the
text of every Widget, translates it with one bulk request per store and register, and hands each Widget
its config with the words already in the reader's language. A Widget's render reads `config` as it
arrives and does not call a translation helper for its own fields.

Which fields hold text is answered by the field's name (`helpers/config-text-fields.ts`):

- `label`, `title`, `subtitle`, `placeholder`, `tooltip`, `eyebrow`, `footer` and `alt`, and every key
  ending in `Label`, `Title` or `Placeholder`, are labels and translate under `PHI_TR_CTX_WEB_UI_LABEL`.
- `description` and every key ending in `Description` are sentences and translate under
  `PHI_TR_CTX_WEB_UI_MESSAGE`.
- Every other key -- `key`, `value`, `format`, `timeZone`, `separator`, ... -- is what the Widget works
  with and is never translated.
- Only `string` fields count, and the rule reaches into a `collection`'s entries, so a select's
  `options[].label` and `options[].description` are translated with the Widget.
- A field the name gets wrong states `text` on its definition: `text: false` for a field called like a
  text that is not one, `text: "label"` or `text: "message"` for one that is not called like a text (a
  Timeline entry's `content`, a Slider's `tooltipSuffix`, a Table action's disabled `reason`).

So a new Widget whose caption is called `label` is translated without anybody remembering to say so, and
the same word shares one translation with the Label Sets that use the same register.

A text no Inspector field edits -- the Card's title, badge and plan lines are written on the canvas -- is
declared by the Widget in `configTexts`: a key with its register, or with `item` each list entry's text,
whose `values` stand in the sentence as `%1` onwards. Every text is masked before it is sent and filled
after ([Site copy placeholders](#site-copy-placeholders)): `{site.name}` and `{year}` never reach a
translator, a list entry's values are never sent along, and the names are filled in every Widget's
words, not only a Card's. The search index reads a Page's words through the same pass.

**Whose words they are** decides the store (`helpers/text-source.ts`). `textSource: "preset"` sends a
Widget's words to the global store: the Module's own text, written in English and translated once for
every installation. `textSource: "site"` -- or no marker -- sends them to the Site's store. A Module's
Preset states one of the two on every Widget it fills with text; `"site"` is for what the Site configured
and the Preset only places, such as the Site's contact address. The Builder drops `"preset"` the moment an
author edits one of the Widget's texts. `checkPhiPresetTextSources(tree)` (`@phis/ui/module/page-check`)
reports a Widget in a Module's Preset that writes text and states neither; a Site's own package does not
run it, since every word in its Pages is the Site's.

**The switch.** Only content Widgets keep the node flag `PhiCmsFlags.NoTranslate` and the Inspector's
switch for it: Markdown, HTML, Simple Text and Description, which declare `translatesOwnText` and
translate their own text (a Markdown body is parsed into units first). The renderer leaves them out of
the pass. A Control or a Card has no switch: its words are always translated. A Preset that places words it read
from a Label Set in the reader's language sets `NoTranslate` on the node, and the pass sends none of its
words, though it still fills their placeholders; no author can set it on a Control.

## Label Sets

Phi-owned UI copy is loaded through Label Sets (`gateway/label-set.ts`). Where the helpers come from
depends on who imports them:

- A Module package outside `@phis/ui` takes them from `@phis/ui/module/labels`, never from
  `@phis/ui/server-helpers`. The server barrel carries the same names, but with them `server-helpers/cms-root`
  and `next/headers`; a Module definition is reachable from the browser graph too, because Client Widgets
  render the Label Sets bound to it, so taking them from the barrel compiles and then answers `500` on
  every page of the Site (see [THIRD_PARTY_MODULES.md](./THIRD_PARTY_MODULES.md)).
- A Site's own server code may take them from `@phis/ui/server-helpers`.
- First-party Modules inside this package import `gateway/label-set` directly, which is as narrow as
  `@phis/ui/module/labels` is.

The helpers:

- `definePhiLabelSet({ key, ctx, sourceLocale?, labels })` declares a set. `labels` maps semantic keys to
  default text. An entry may name its own register as `{ text, ctx }`; `definePhiMessageLabel(text)` marks
  a sentence inside a set of captions. `definePhiCountLabel({ one, other }, ctx?)` declares a label that
  says a count ([Count labels](#count-labels)).
- `definePhiRuntimeModuleLabelSet(moduleDefinition, { key, ctx, labels })` declares a Module-owned set.
  Its key becomes `module:<moduleId>:<key>` and its source locale is the Module's `sourceLocale`.
- `getPhiLabelSet(options, definition)` returns the texts under the same semantic keys. It sends one
  bulk request per register; the positional batch is an internal transport detail. Sets are not cached
  as sets; each message goes through the translation cache.
- Widget code reads labels through semantic keys, never through free-text lookups or positions.
- Label Sets are static UI copy. They may contain placeholder templates such as `Edit user %1`, but are
  never built from resolved user, profile, company, or email data.
- The database never stores Label Set keys, loader paths, or translation bundle identifiers.
- First-party Widget loaders live in `components/widgets/label-sets/*` and are named semantically
  (`account.ts`, `inspector.ts`), not by numeric ids. Their label types and default texts live in
  `components/widgets/label-types/*`; a loader imports them rather than repeating them. A Widget's server
  half imports its own loader; the CMS renderer and the gateway own no concrete Widget labels.
- A block's `labels` prop carries Phi-owned UI and control copy; `defaultLabels` carries localized
  default content shown only when CMS or config text is absent. Explicit config text such as
  `config.label`, `config.title`, or `config.tooltip` wins over both. A block without copy uses the
  `PhiNoLabels` type (`types/widget-runtime.ts`) instead of passing an empty `labels` object.
- Semantic commands such as save, publish, review, restore, reset, reload, and upload are Phi copy from
  the common-controls Label Set (`components/widgets/label-sets/common-controls.ts`).

## Count labels

A text that says how many -- "%1 pages", "%1 configured" -- is one count label with a template per plural
category, and the category is chosen by one formatter, never by a Widget's own `count === 1` branch.
Providers keep answering a scalar count; which words it takes is decided where it is shown.

- **Shape.** `PhiCountLabel` (`helpers/translation-format.ts`) maps CLDR plural categories (`zero`,
  `one`, `two`, `few`, `many`, `other`) to templates; `other` is required, the rest optional. A Label Set
  declares one with `definePhiCountLabel({ one: "%1 page", other: "%1 pages" }, ctx?)`, in the set's
  register unless `ctx` names another, and reads it back as a `PhiCountLabel` under the same key.
- **The count is `%1` in every template, `one` included.** `one` is not the number 1 everywhere: French
  reads 0 as `one`, Russian 21. A literal "1 page" would be wrong in exactly the locales the category is
  there for.
- **Formatting.** `formatPhiCountLabel(label, count, locale)` (`@phis/ui/helpers`, Client-safe) selects the
  category with `Intl.PluralRules(locale)`, falls back to `other` for a category the label does not state,
  and puts the count in as `%1`, written with `Intl.NumberFormat(locale)`. `locale` is the reader's: the
  page's Intl locale (`usePhiIntlLocale()` in a Client, the request locale on the server), never the
  browser's, so the server render and the hydrated page say the same words.
- **Source categories.** The source language is English, which states `one` and `other`. A locale with
  more categories -- Polish and Russian `few` and `many`, Arabic `zero` and `two` -- reads `other` for
  them; a label states them only where its source language has them. A category the reader's locale does
  not have (`one` in Japanese) is never selected.
- **Translation.** Each stated category is one message, translated under the label's register followed
  by `, plural category <category>` (`Web UI label, plural category one`). The category is part of the
  translation's identity because English often writes two forms alike -- "%1 configured" is `one` and
  `other` both -- where the reader's language does not, and under the bare register they would be one
  message with one answer. It also tells the translator which form it is writing. Each register,
  category registers included, is one bulk request of the set ([Label Sets](#label-sets)).

## Site copy placeholders

Copy written into a Widget's config -- by a Preset, or by whoever is authoring -- may name a few facts
about the Site instead of spelling them out (`helpers/text-placeholders.ts`):

- The names are `{site.name}`, `{site.wordmark}`, `{year}` and `{site.host}`. That list is the whole
  language; a placeholder is not a path into the runtime, and a name nothing answers is left standing so
  that `{jahr}` renders as `{jahr}` and reads as the typo it is.
- `{site.wordmark}` is what the Site calls itself in writing and `{site.name}` is what it is filed
  under. Where no wordmark is set the wordmark resolves to the name, so it is never the emptier ask.
- The order is mask, translate, fill, and never translate then fill. `{year}` is a word and a machine
  translator translates words: it comes back as `{Jahr}`, which nothing answers. `maskPhiTextPlaceholders`
  turns every name into a `%n` token first -- the same token this contract already uses for values -- and
  `resolvePhiTextPlaceholders` fills them in afterwards, where the translator left them.
- A text may carry values of its own beside it -- a list entry `{ text: "Site key: %1", values: [key] }`.
  They take `%1` to `%k`, and the masked names count on from `%k+1` (`maskPhiTextPlaceholders(text, k)`),
  so one fill puts both back. A value is never translated, and a sentence with a value in it is one
  catalogue row instead of one per Site.
- Filling afterwards is also what makes a translation reusable. The stored translation is keyed on the
  source text, so `© %1 %2. All rights reserved.` is one row per locale for every Site that adopts the
  Preset, and the same row after New Year.
- A Preset never resolves a placeholder while building its tree. That writes one Site's name and the
  year of the adoption into everybody's copy, where they stay.
- Widgets that carry short config copy resolve them; long-form Markdown and HTML bodies deliberately do
  not, because a brace there is more likely to be a code sample than a placeholder.

## Ant Design and date formatting

Ant Design's own copy (pagination, empty states, picker text, validation templates, modal buttons) and
date/time formatting come from the Ant Design locale and the shared Day.js locale bridge
(`components/root/phi-dayjs-locale.tsx`), never from Label Sets. The Ant Design locale is applied once
in the root `ConfigProvider` (`components/root/phi-root-layout.tsx`). `helpers/antd-locale.ts` maps the
resolved Site locale to an Ant Design locale key and loads it through an explicit whitelist of
`import("antd/locale/<key>")` loaders, never through a computed import path.

## Request locale

- The resolved request locale comes from `@phis/server` (`GET /api/v1/site/locale`) and carries
  `locale`, `language`, optional `script` and `region`, `direction`, `intlLocale`, optional
  `deeplTargetLang`, `labelFallbacks`, and `source` (`helpers/site-locale-config.ts`). Shared UI does not
  validate platform locale support and does not reimplement DeepL targets, text direction, or fallback
  chains.
- Root, CMS, metadata, translation, and redirect code all use the same request-scoped result
  (`server-helpers/request-locale.ts`); none applies its own locale priority. That request is
  `no-store`, because the answer depends on session, cookies, the explicit locale, and
  `Accept-Language`. The Site locale configuration (`fetchSiteLocaleConfig`) may be cached per Site.
- `x-locale` carries only the explicit locale of a locale-prefixed Public route. The Site proxy
  (`next/site-proxy.ts`) removes any incoming `x-locale` and sets it only from the path prefix; a cookie,
  browser preference, profile value, or already-resolved locale is never promoted into it.
- Site-scoped translation calls carry no Site source locale: `@phis/server` derives it from the Site.
  The Site `defaultLocale` is the last request-locale fallback and is never substituted for the `en`
  source of global copy.

## Source locale transport

- Ordinary Site translation calls omit `sourceLocale`; `@phis/server` resolves the immutable Site source
  locale.
- Module text that reaches a Site translation call carries its Module's `sourceLocale`: a Navigation
  label a Module ships (`PhiCmsNavigationLabel.sourceLocale`, set where the entry is resolved) and the
  title of a Module route. Without it a Site whose source locale is not the Module's reads the Module's
  English as its own and never translates it. A label the operator renames or adds loses or never has
  the field and is read in the Site's source locale.
- Standalone global labels may declare `sourceLocale`; omission means English. Module-owned third-party
  presets inherit their owning Module locale instead of declaring another source language.
- Every Runtime Module declares one canonical `sourceLocale`; omission means English. All package-authored
  component copy inherits it through the Module Label-Set helper. Component-local source-language
  overrides and mixed-language Module metadata are invalid.
- Phi-owned Modules author canonical copy in English. Third-party Module metadata and component labels
  may use another declared Module source locale.
- External Markdown and HTML Widgets persist one plain `sourceLocale` in Widget config. It may differ
  from the Site's available target locales.
- `sourceLocale` is forwarded as its own request field. It must never be encoded into `ctx`.
- If the active provider cannot translate the configured external source, the Widget renders the original
  document and does not redetect on every render.

## A picture's description

A picture's alt text and title are words on the page like any other and are translated in the render's
locale. What a Widget's config states for an address arrives translated with the rest of its config
([Widget config text](#widget-config-text)). The Image and Card Widgets translate the Media library's
description of an Asset in the Site's store; a Content record's text arrives translated and is taken as
it is. The Gallery translates each picture's description in one bulk call. The Brand Widget translates
the Theme's `logoAlt` in the Site's store, and the default "Brand logo" in the global one.

## Context and format

Callers provide only optional natural-language provider context. They do not create internal context
flags. The gateway forwards `format: "html"` and explicit external source metadata; `@phis/server` owns the
canonical `[html]`, `[extern]`, and `[html:extern]` storage envelope.

## Structured documents

- Markdown and HTML are parsed into semantic translation units before the gateway is called.
- One heading, paragraph, list-item paragraph, block-quote paragraph, or table cell is one unit.
- Code, inline code, and link destinations are never translated. Image alt text and titles are.
- All units from one document use the bulk gateway. The server resolves cache hits and provider request
  chunking while preserving unit order.

### The Markdown unit format

A Markdown unit is sent with `format: "html"` and is plain, standard HTML that any provider's HTML mode
handles -- DeepL with `tag_handling=html`, Google with `text/html`, Azure with `textType=html`, a language
model told to keep the tags. It is provider-neutral on purpose: a translation provider is an Add-on
(`PhisTranslationProvider` in `@phis/contracts/translation`), and nothing in the unit may depend on one
provider's options. What must not be translated leaves the text as a numbered `%n`, the same token Label
Sets and Site copy placeholders already use (`helpers/text-placeholders.ts`), which a provider returns
unchanged. The format is `components/widgets/shared/markdown-translation-unit.ts`, and this table is the
contract:

| Markdown | Unit |
| --- | --- |
| text | the text, with `&`, `<`, `>` and `"` escaped as HTML entities |
| inline code | `%n`; the code leaves the text and is put back by number |
| strong | `<b>…</b>` |
| emphasis | `<i>…</i>` |
| delete (strikethrough) | `<s>…</s>` |
| link `[text](url)` | `<a href="%n">text</a>`; the address is masked and put back by number |
| image `![alt](src "title")` | `%n` in the sentence; its alt text and its title are units of their own (`format: "text"`) |
| hard break | `<br>` |
| `%` followed by digits, written in the prose | `%n`, put back exactly as written |
| a reference link or image, a footnote reference | its text content, as before |
| inline raw HTML | nothing, as the rendered page shows nothing for it |

Before and after:

| Before | After |
| --- | --- |
| `<x-strong>Storage and services.</x-strong> Media on disk …` | `<b>Storage and services.</b> Media on disk …` |
| `` `GET /api/v1/site/page` reads a Page `` sent as `<x-code data-index="0" translate="no">GET /api/v1/site/page</x-code> reads a Page` | `%1 reads a Page` |

The catalogue key covers the first 50 characters of a message. The invented `<x-*>` markup this format
replaced spent those characters on itself, so every list item that opened with inline code was one
message to the store, and only the first of them was ever translated.

- **Numbering.** One sequence per unit, in the order the source shows its tokens: a link's address is
  numbered where the link opens, before the text it carries. A producer that also masks Site copy
  placeholders (`{site.name}` and the others) numbers them in the same sequence, as it numbers tokens
  the text already carries; the Markdown body masks none ("Site copy placeholders").
- **Restore by number, never by order.** A provider moves a link or a code span to wherever the sentence
  needs it in its own language.
- **Escape.** `%` followed by digits in the prose would read as a token, so it leaves the text as a
  `%n` of its own and is put back verbatim. Digits that follow a token directly would read as part of
  its number (`%1` and `2 times` are `%12`), so they are masked the same way: `%1%2 times`.
- **A unit with nothing left to translate is not sent.** A paragraph that is one code span or one picture
  is drawn from its source; a picture's alt text and title are still translated.
- **Validation.** An answer is used only if it reads back: every `%n` of the source exactly once and
  none other, a link's `%n` only as `<a href="%n">` and the others only in the text, `<b>`, `<i>`, `<s>`
  and `<a>` opened and closed in turn, no tag or attribute outside the table (`<br/>` and quoting of the
  `href` may vary). An answer that does not read back is shown as its source. Core checks every `html`
  answer before it stores it -- the same `%n` tokens as often as in the source, `<b>`, `<i>`, `<s>` and
  `<a>` balanced, every `href="%n"` of the source intact -- and treats one that fails like a provider
  failure for that unit: a stand-in, shown in the source and never stored ([phis-server TRANSLATIONS.md, "Markdown and HTML"](https://github.com/phis-dev/phis-server/blob/main/TRANSLATIONS.md#markdown-and-html)).

The HTML Widget sends its own sanitized markup as units (`components/widgets/helpers/semantic-html-translation.ts`),
with `code` and `pre` marked `translate="no"`; it does not use this table.

HTML sanitization follows trust boundaries rather than render frequency. Canonical inline HTML is
sanitized by `@phis/server` before persistence. External documents and provider-produced HTML are
sanitized in the server render path because they are not trusted persisted Widget markup. Public and
App HTML Widget clients receive safe serialized markup and must not import the HTML sanitizer.

Typed Page and Asset destinations embedded in internally persisted Markdown/HTML, and the mandatory
rejection of those destinations in external documents, follow [REFERENCES.md](./REFERENCES.md). Reference
identities and destinations are structural metadata and never translation units.

For external sources, the Builder detects the source language once when a new attachment is configured
and persists it through the normal generic Widget config update. Subsequent renders use that value.
Builder may replace it explicitly or request a new detection after changing the attachment.

Removing a Widget or clearing its URL detaches the source only. It must not issue translation-unit purge
requests implicitly because units may be shared and Builder operations must remain undoable.

## Runtime Module metadata

Runtime Module title, description, and other package-authored labels use global translations, never Site
translation units. Server-owned Authoring catalogs group metadata by Module source locale, translate it
in bulk, and serialize localized copies to Client providers. The immutable Runtime Module definition
retains its canonical source strings and locale; localization must not rewrite the active Module catalog.

A Module whose source locale is not the canonical one is translated by every installation that runs it,
on that installation's own provider, and never from the CDN. The canonical English its unit is keyed by
is generated rather than declared, so two installations key the same string under two different hashes
and no mirror can answer either of them. What would make those strings shareable is a package that
declares its canonical text beside its own language; a local pre-translation is not the same thing, and
looks like it is
([phis-server TRANSLATIONS.md, "Translation modes"](https://github.com/phis-dev/phis-server/blob/main/TRANSLATIONS.md#translation-modes)).

Module category, id, Provider keys, capabilities, and other machine identities remain stable keys. A
separate global category Label Set may present a category key to users. Optional Site-owned presentation
overrides are Site content and do not replace the global package translation.
