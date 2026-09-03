# Phi Shared Authentication Module Contract

This document is the normative target v1 frontend/runtime-module projection of the Site authentication
contract. Global users, credentials, provider validation, account linking, Site policy, sessions, and CLI
recovery are owned by `@phis/server` and defined in the sibling `phis-server/AUTHENTICATION.md`. This package
must not create a second identity, policy, or session model.

The migration is an ABI break. Legacy area-agnostic Auth presentation, globally unioned provider
capabilities, direct Account Widget login-form ownership, and unversioned endpoint assumptions are not
compatibility paths to retain.

## 1. One optional multi-Area Module

The first-party authentication feature is one logical optional Runtime Module:

```text
@phis/ui/auth
```

It is eligible in exactly `public`, `admin`, and `app`:

- Public owns login, registration, confirmation, password recovery, logout-transition, challenge, and
  mandatory pre-session enrollment presentation.
- Admin owns the current Site's authentication-method, provider-installation, linking, factor, recovery,
  and session settings surface.
- App owns the authenticated user's security-management surface for credentials, linked identities,
  passkeys, TOTP factors, recovery codes, and sessions. Its first-party projection also supports in-place
  reauthentication after a session expires while an App document is already mounted.
- App and every other authenticated Area consume the Core-resolved session and do not need Auth merely to
  remain authenticated or log out. Without an active compatible Auth presentation, an expired session
  falls back to the canonical Public `/login?next=...` route. The App contribution is required only when
  the Site wants the first-party self-service security surface or first-party in-place reauthentication.

The default Phi Site preset activates the same module id in Public, Admin, and App. Login, settings, and
account security are not separate Modules, so replacing the first-party feature does not require
discovering and removing several unrelated module identities.

The first-party Module binds to Core. A third-party Module that uses only the standard Auth API also binds
to Core; a Module requiring a new server authentication capability binds to its one audited Add-on.

Auth is not an Area base and is never implicitly required. Disabling it is valid, produces no hidden
fallback, and does not weaken protected Area/API access checks.

## 2. Contributions

The first-party Auth Module contributes:

- Public route presets for `/login`, `/logout`, `/register`, `/confirm`, and `/reset-password`;
- `PhiLoginWidget` and the Auth-owned challenge/enrollment/recovery presentation artifacts;
- one Auth UI provider descriptor plus separate lazy Client implementation;
- one meaningful Auth Controller type mounted once in each active eligible Area;
- Auth-owned Form field/handler providers required by its flows;
- one Admin Site Auth settings route and navigation contribution;
- one App `/security` route, its composed security-management widget, and an Account Widget menu
  contribution targeting the effective `/app/security` surface;
- an App-area in-place reauthentication presentation for a document that was rendered under a complete
  session and subsequently receives Core's expired/invalid-session result.

The App security surface is post-login self-service. Mandatory factor enrollment that blocks session
completion remains part of the Public Auth workflow and may reuse the same Auth-owned enrollment
components in a restricted mode; it must not grant access to App merely to render enrollment.

The Admin route opts into the Area-owned `settings` route mount. The normal module-segment builder maps
`@phis/ui/auth` to `phis+ui+auth`, so its immutable effective path is:

```text
/settings/phis+ui+auth
```

Navigation overlays may reorder, reparent, or tombstone the presentation item without changing this
effective route. If the Area-owned Settings container is tombstoned, its remaining subtree is hidden at
runtime and retained disabled in Builder navigation authoring under the existing navigation contract.

## 3. Auth UI provider

Auth presentation is resolved through an immutable owner-scoped provider contract, using the same split as
other Runtime Module providers:

- a serializable descriptor is owned by one installed Module;
- executable presentation is reachable only through explicit Area-local Client loader manifests;
- only providers owned by active Modules participate;
- global mutable registries, import-side-effect registration, request-derived imports, and Core imports of
  the first-party provider are forbidden.

For one resolved Area module set:

- zero Auth UI providers is valid and means no Auth presentation is available in that Area;
- exactly one provider is active;
- more than one provider is a hard descriptor error, never a first-match or priority decision.

The provider renders server-requested workflow state. It may start a method, render a closed challenge
kind, and submit a response, but it never decides that a provider token is valid, an email is linkable, a
factor may be skipped, or a session exists.

A third party replaces the UI by activating its Auth Module and deactivating
`@phis/ui/auth`. Tooling should offer an atomic Public, Admin, and App replacement. Area activation
nevertheless remains independent, so a Site may replace Public presentation and retain the first-party
Admin configuration or App security surface when all active providers target the compatible Core/Auth
Add-on contract.

Every resolved Area projection of an Auth UI provider declares which closed Core workflow kinds it can
render, including the applicable primary-login, factor-challenge, factor-enrollment, recovery,
account-security, and site-settings capabilities. Capabilities are resolved per Area and must never be
copied as one global union onto every eligible Area. Area eligibility does not imply a capability. A Site
policy may become effective only when the active providers expose every presentation capability needed
to complete that policy. A provider may submit a response to Core, but it cannot mark a workflow, factor,
assurance level, or session complete.

The first-party projections are intentionally different: Public exposes the login and pre-session
workflow capabilities, Admin exposes Site settings, and App exposes account security plus primary-login
for in-place session recovery. Admin or another authenticated Area may expose the same reauthentication
presentation only when its active Area projection explicitly declares `primary-login`.

## 4. Login Widget and Auth Controller

`PhiLoginWidget` is the single reusable login presentation primitive. The real `/login` Page and modal
login host render the same widget/provider flow; modal mode is a container choice, not a second login
implementation. The localized `/<locale>/login` endpoint is always a real Public Page backed by the
active Public Auth Module's canonical `/login` route preset. It is never merely a URL that opens a modal.

The Auth Module owns one Area-mounted Auth Controller type. It is not a no-op controller:

- in Public it coordinates modal visibility, provider redirect/return presentation, opaque challenge
  state, mandatory enrollment, and safe success navigation;
- in Admin it coordinates provider configuration status, setup/test results, and settings feedback;
- in App it coordinates the user's linked identities, factor enrollment/removal, recovery-code renewal,
  session-management presentation, and in-place reauthentication after expiry of the session that
  rendered the current App document.

Controller state is presentation state only. It does not hold provider secrets, credentials, tokens,
TOTP seeds, or independent session truth. Server-returned workflow/challenge state remains opaque except
for closed render kinds and allowed display metadata.

In-place reauthentication applies only after a protected Area document was rendered under a complete
session and a later same-origin request receives Core's canonical expired/invalid-session result. The
Area Auth Controller may open the active provider's login presentation only when that Area projection
declares `primary-login`. While open, the protected surface is masked and inert; Core continues to reject
every protected request. Successful completion closes the modal and revalidates or reloads the preserved
current path. A state-changing request is never replayed implicitly. Closing or escaping the workflow
navigates to the canonical Public `/login` Page with the current relative path as validated `next`.

A direct navigation, reload, or server render without a complete session never renders the protected
Area merely to show this modal. The server access gate redirects to the same canonical Public
`/login?next=...` Page. If the current Area has no active provider with `primary-login`, client-observed
session expiry uses that Public redirect immediately.

## 5. Core Account Widget boundary

`PhiAccountWidget` remains Core/shared rather than Auth-owned. Guest/account state, profile links,
commerce links, and logout are useful in several Areas regardless of which Auth UI Module is active.

The Account Widget:

- consumes the generic viewer/session snapshot;
- delegates guest login presentation to the single resolved Auth UI provider;
- does not directly import the first-party Login Widget, Form, Controller, or Auth Client;
- exposes no guest login fallback when no provider is active;
- invokes the Core CSRF-protected logout action for an authenticated viewer;
- accepts owner-scoped account-menu contributions such as profile, orders, billing, security, and logout;
- may link to the active Auth Module's App security surface, but does not implement that surface itself.

Profile/user administration does not become Auth ownership merely because it appears in this menu.
Credential, passkey, TOTP, linked-identity, recovery-code, and session management remain authentication
security surfaces.

## 6. Browser/server boundary

Widgets and Controllers consume only the Site runtime's same-origin `/api/auth/*` facade. The Site bridge
maps that facade to canonical `@phis/server` `/api/v1/auth/*`, injects trusted Site/server context, and keeps
server tokens and provider secrets outside the browser.

Successful login navigation resolves an explicit `next` path inside the server-selected user Area. The
Site must expose `/api/site/navigation-target` with `buildPhiNavigationTargetRouteHandler` and the Site's
Area bridges. The handler checks the active, access-filtered Phi route/page catalog; a missing target falls
back to that Area's root instead of relying on the status of Next's catch-all route.

The canonical Public login path is `/login` and is localized by the normal Public Area route host. A
third-party Auth Module replaces the first-party route by deactivating the first-party Public Auth Module
and contributing its own `/login` route preset and provider flow. Session guards target this canonical
route rather than importing or naming the first-party Login Widget. If no active Public Auth Module owns
the route, protected access fails closed; Core or the Site shell must not resurrect a hidden login UI.

The UI reads a public Auth manifest containing only enabled method/stage presentation metadata and start
actions. It does not infer enabled methods from bundled adapters, installed Modules, existing identities,
or buttons present in a preset.

Provider redirects use opaque server-created transaction state. `next` destinations are server-validated
relative Site paths. The UI must not select Site, provider installation, callback origin, account link,
assurance level, or required next factor.

When Core returns `link_required`, the Login Widget renders a closed existing-account confirmation state.
The validated provider identity remains only in Core's encrypted, expiring, one-use transaction; a
host-bound HttpOnly cookie carries its opaque confirmation token. The UI submits only the proof requested
by Core to `POST /api/auth/providers/link/confirm` and never receives the provider claims, matching email,
or candidate user id. A failed or expired confirmation requires a fresh provider transaction before
another link attempt. The initial v1 presentation returns to the normal Login Widget with a
non-enumerating error after consuming a failed proof, preserves the validated `next` destination, and
never leaves an unusable confirmation form visible. It proves the existing password; passkey and other
linked-method proofs may extend the same closed workflow later.

The generic Form relay strips Browser cookies by default. For this closed workflow the server-resolved
Core handler Provider uses the `auth-link` credential policy and forwards only the `phis_auth_link`
HttpOnly credential. Client-provided descriptors cannot opt another Form, Provider, target, or credential
into forwarding.

Logout is a Core operation and remains available to authenticated shared surfaces when Auth is disabled.
A contributed `GET /logout` route may render a transition or confirmation, but session revocation requires
the Core CSRF-protected `POST` action.

## 7. Core-owned assurance gate and mandatory enrollment

Core, not the Auth UI provider or Area navigation, owns the authentication workflow state and assurance
gate. The semantic progression is:

```text
anonymous
  -> primary-verified
  -> factor-enrollment-required or factor-challenge-required
  -> complete
```

`primary-verified` is not a complete Site session. Core may represent the following steps through a
short-lived Auth transaction or a restricted pre-session, but that state permits only the current Auth
workflow, recovery/support escape paths, and Core logout. It must not authorize App, Admin, Builder,
Editor, Accounting, their data APIs, or any other protected Site resource.

When current Site policy requires TOTP and the user has no acceptable active factor, Core returns the
mandatory TOTP-enrollment workflow. Its Public presentation shows the server-created QR/manual setup
material, verifies the first six-digit response through Core, and activates the factor only after that
verification. A user who already owns an acceptable factor receives the required challenge instead.
After Core reaches `complete`, it issues or upgrades the Site session and resolves the preserved,
server-validated `next` destination; an unavailable destination falls back to the resolved Area root.

Area route guards and protected API handlers must enforce the same Core result. A Client redirect or
hidden navigation item is never the security boundary. A Site-policy revision may require reevaluation of
an existing session. The policy defines whether a new requirement applies immediately, at the next login,
or after an explicit grace deadline and may scope it to all memberships or selected roles. A stale or
insufficient session is restricted to the required Auth workflow until it satisfies the current policy.

The normal App `/security` surface is not this gate. It lets a fully authenticated user add or remove
allowed factors, manage linked identities, regenerate recovery codes, and revoke sessions. Core rejects a
change that would leave the user below current Site policy.

External IdP assurance may satisfy a Site policy only when Core validates an explicit provider assurance
claim under a configured trust mapping. A policy requiring a local Site TOTP enrollment is not satisfied
merely because an external provider reports generic MFA.

## 8. Admin settings

The Auth Admin contribution is restricted by the Core Site-Admin access policy and configures only the
current Site:

- primary, second-factor, step-up, and recovery method enablement/order;
- Google, Apple, GitHub, Microsoft identity platform, and other provider installation status and
  non-secret identifiers;
- registration and existing-account linking modes;
- password, passkey, TOTP/MFA, recovery, and session policy;
- callback origins and provider restrictions such as hosted domains or organizations.

The settings surface separates a configured provider installation from an enabled login method. Its
provider catalog may create more than one stable installation and renders provider-owned configuration
metadata such as client id, write-only secret, tenant/organization restrictions, enabled state, login
presentation state/order, exact callback URI, and validation/test status. Microsoft is presented as
Microsoft rather than Windows and includes an explicit tenant mode or tenant id. Built-in provider issuer
and discovery rules are server-derived and are not arbitrary browser input.

Site policy separately controls whether a factor is allowed, required, or accepted for step-up/recovery;
when enforcement begins; and which membership/role scope it covers. A requirement cannot be published
unless the active Auth presentation can enroll and challenge it and at least one compliant recovery or
operator-recovery path remains available.

Secrets are write-only. Reads expose only configured/missing/invalid/rotation-needed status. Secrets do
not enter Theme state, generic Module Storage, CMS trees, Controller config, signals, Flight payloads, or
browser logs.

### Provider installation catalog ABI

The installation catalog is served by flat, Site-Admin-session plus CSRF guarded endpoints under
`/api/v1/auth/admin/installations`. Like the flat policy section endpoints, they accept exactly the
Settings Form values of one installation; issuer and discovery derivation stays server-side.

- `GET /installations` lists the Site's installations (non-secret identifiers, secret status, derived
  callback URI, validation status) together with the server-owned provider catalog (provider key,
  label, tenant mode, and per-provider test capability).
- `POST /installations` creates an installation from `{installationKey, providerKey, clientId,
  clientSecret?, tenant?, callbackOrigin?, enabled}`. The installation key is a Site-chosen stable
  slug, unique per Site; more than one installation per provider is a first-class state.
- `PATCH /installations/<installationKey>` updates the same flat fields plus the coupled login
  presentation (`loginEnabled`, `sortOrder`). The primary login method row for an installation is
  owned and coupled server-side; it is never a separate client concern.
- `POST /installations/<installationKey>/test` validates the installation according to the provider's
  declared test capability and persists the validation status and timestamp. The capability is
  per-provider server metadata: a provider that supports a real credential round trip is tested with
  one; otherwise the test is a discovery/issuer/configuration check; a provider without a usable
  probe reports not-testable rather than a fake pass.
- Disable is the primary removal action and fully reversible. `DELETE /installations/<installationKey>`
  exists as a deliberate secondary action: it removes the installation, its coupled method, and its
  stored secret. The server refuses a delete or disable that would leave the Site without any enabled
  primary login method, and a delete response is preceded by a confirmation that reports the number of
  user identities linked through this installation.
- An internal-token read (`/api/v1/site/auth/installations`) serves server-side composition without
  secrets.

Callback URIs are per Site and per provider: the effective redirect URI is
`<callback origin>/api/auth/providers/<providerKey>/callback`, where the callback origin defaults to
the Site's public base URL and may be overridden per installation with an origin from the Site's
`allowedCallbackOrigins` policy — several domains serving the same CMS may deliberately share one
registered callback. The active installation travels inside the encrypted Auth transaction (it already
carries the installation key), so the callback route resolves the installation from the transaction and
installations of the same provider share the provider's callback URI.

The catalog ABI replaced the monolithic `/api/v1/auth/admin` route entirely; the Settings surface
presents the catalog through the generic Table and Form contracts on the Settings page shell (the
auth-installations data provider with inline enablement edits plus test and guarded delete row
actions, and descriptor create/edit Forms).

The Site Auth settings route may disappear when the Module is disabled in Admin. That is intentional;
out-of-band CLI recovery remains available.

## 9. Disablement and preset recovery

Disabling `@phis/ui/auth` removes only its active Area contributions. Existing Site sessions,
Core access evaluation, the generic viewer snapshot, and Core logout remain operational. Builder may warn
that an Area has no Auth UI provider but must not silently reactivate one.

The semantic recovery operation is:

```text
phis-cli auth restore-preset --site <site-key>
```

It restores the first-party Auth Module activation and code-owned route/navigation presets in Public,
Admin, and App. As an explicit operator recovery action, it deactivates conflicting Auth UI provider
Modules in those three Areas and reports each change, but does not uninstall or delete them. Auth-owned
Page snapshots fall back to their installed code presets and Auth-owned navigation overrides/tombstones
are removed; unrelated navigation customization and historical Page revisions remain intact. An already
identical effective preset is idempotent. The command does not enable methods, overwrite Site policy or
provider secrets, create users, relink identities, or mutate sessions.

## Contract governance

Changing, extending, replacing, reinterpreting, or widening this contract requires explicit prior
operator approval after the exact gap and affected ABI have been presented. This contract must not be
bypassed through a parallel, shadow, local, Module-specific, Provider-specific, fallback, or compatibility
contract. If it cannot express a requirement, implementation stops and asks the operator first.
