# Gateway

This directory contains the internal `phi-server` adapter layer for `@phis/ui`.

## Scope

- `gateway/*` is internal-only.
- It is allowed to talk to `phi-server`.
- It is not public package surface for consuming sites.

## Responsibilities

- load shared site/runtime data from `phi-server`
- load shared navigation data
- provide generic label-set translation/caching infrastructure
- load form guards and translation payloads
- own the shared data-source contract for API-backed reads, cache tags, and shared fetch normalization
- own the shared mutation contract for API-backed writes without GET cache semantics
- resolve shared CMS runtime payloads needed by shared shells, regions, layouts, and widgets

## Rules

- Keep backend request/response adaptation here.
- Do not expose raw gateway functions as the recommended public integration API.
- Shared gateway helpers may own upstream proxy target selection for thin site bridge routes.
- Consuming site repos should only provide transport wrappers, not proxy target logic.
- `gateway/*` is a `read` and transport layer, not the place for form submit orchestration or label translation orchestration.
- Public runtime constants belong in `constants/*`.
- Public runtime helpers belong in `helpers/*`.
- Public server-only helpers belong in `server-helpers/*`.

## CMS contract

- `phi-server` returns numeric widget and layout contracts plus config and placement data.
- `gateway/*` may normalize those payloads for shared rendering.
- Backend payloads must stay renderer-agnostic: no React component names, import paths, or site-specific code references.
- Site-custom widget/layout types must pass through the shared site bridge instead of being resolved inside backend contracts.
- Concrete widget/layout label definitions do not belong in `gateway/*`; only generic label-set helpers belong here.
- Data-source descriptors, cache modes, cache tags, and query/body shapes belong here when the same fetch stack should be reused across widgets, forms, and future table/list views.
- Mutation descriptors belong here when the same write stack should be reused across widgets, forms, and future table/list actions.
- Translation payloads stay on the dedicated translation helpers and label-set contract, not inside the data-source contract.
- Mutations are a separate write contract; do not model them as cacheable data-source reads.

## Logging contract

- Runtime proxy logs must use the shared JSON log contract from `net/log.ts`.
- Emit one log line per event to stdout/stderr so `systemd` and `journalctl` can filter them.
- Fixed service names are `phi-server`, `phi-shared`, `phi-site`, and `phi-cli`.
- Proxy and plugin-facing code should log through a `PhiLogger` instance with `child(...)`, `debug(...)`, `info(...)`, `warn(...)`, and `error(...)`.
- The common fields are:
  - `ts`
  - `level`
  - `service`
  - `event`
  - `message`
  - `siteKey`
  - `area`
  - `requestId`
  - `userId`
  - `actorRole`
  - `pluginKey`
  - `method`
  - `path`
  - `status`
  - `durationMs`
  - `targetType`
  - `targetId`
  - `error`
  - `meta`
- `debug`, `info`, `warn`, and `error` are the supported levels.
- Keep payloads site-scoped whenever a request has site context.
- Do not log sensitive secrets or full request payloads.
