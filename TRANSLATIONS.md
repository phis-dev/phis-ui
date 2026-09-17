# Translation Contract

This document owns the `@phis/ui` side of translation: the server-only helpers, Label Sets, source
locales, structured documents, and what the package does with the resolved request locale.
Persistence, canonical storage envelopes, provider requests, and change markers are owned by
`@phis/server` ([TRANSLATIONS.md](../phis-server/TRANSLATIONS.md)). The locale capability superset, each
Site's validated subset, and `GET /api/v1/site/locale` are owned by `@phis/server`
([phis-server TRANSLATIONS.md, "Locale capability"](../phis-server/TRANSLATIONS.md#locale-capability)). How translations are
cached in a Site process is described in [gateway/CACHES.md](./gateway/CACHES.md#translation-caching).

## Helpers

The translation helpers are server-only and exported from `@phis/ui/server-helpers`
(`server-helpers/translate.ts`):

- `tr(msg, params?, ctx?, format?)` and `trForLocale(locale, msg, params?, ctx?, format?)` translate one
  Site-scoped message.
- `trBulk(msgs, ctx?, format?, sourceLocale?)` and `trBulkForLocale(locale, msgs, ctx?, format?, sourceLocale?)`
  translate several Site-scoped messages in one request and keep their order.
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

## Label Sets

Phi-owned UI copy is loaded through Label Sets (`gateway/label-set.ts`, exported from
`@phis/ui/server-helpers`):

- `definePhiLabelSet({ key, ctx, sourceLocale?, labels })` declares a set. `labels` maps semantic keys to
  default text. An entry may name its own register as `{ text, ctx }`; `definePhiMessageLabel(text)` marks
  a sentence inside a set of captions.
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

## Context and format

Callers provide only optional natural-language provider context. They do not create internal context
flags. The gateway forwards `format: "html"` and explicit external source metadata; `@phis/server` owns the
canonical `[html]`, `[extern]`, and `[html:extern]` storage envelope.

## Structured documents

- Markdown and HTML are parsed into semantic translation units before the gateway is called.
- One heading, paragraph, list-item paragraph, block-quote paragraph, or table cell is one unit.
- Inline formatting and visible link text are preserved through translation-safe HTML markup.
- Code, inline code, and link destinations are never translated. Image alt text is translatable.
- All units from one document use the bulk gateway. The server resolves cache hits and provider request
  chunking while preserving unit order.

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

Module category, id, Provider keys, capabilities, and other machine identities remain stable keys. A
separate global category Label Set may present a category key to users. Optional Site-owned presentation
overrides are Site content and do not replace the global package translation.
