# Translation Client Contract

This document defines the `@phis/ui` side of the normative v1 translation contract. Persistence,
canonicalization, and provider behavior are owned by `phi-server`.

## Source locale transport

- Ordinary Site translation calls omit `sourceLocale`; `phi-server` resolves the immutable Site source
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
flags. The gateway forwards `format: "html"` and explicit external source metadata; `phi-server` owns the
canonical `[html]`, `[extern]`, and `[html:extern]` storage envelope.

## Structured documents

- Markdown and HTML are parsed into semantic translation units before the gateway is called.
- One heading, paragraph, list-item paragraph, block-quote paragraph, or table cell is one unit.
- Inline formatting and visible link text are preserved through translation-safe HTML markup.
- Code, inline code, and link destinations are never translated. Image alt text is translatable.
- All units from one document use the bulk gateway. The server resolves cache hits and provider request
  chunking while preserving unit order.

HTML sanitization follows trust boundaries rather than render frequency. Canonical inline HTML is
sanitized by `phi-server` before persistence. External documents and provider-produced HTML are
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

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility
contract. If it cannot express a requirement, implementation stops and asks the operator first.
