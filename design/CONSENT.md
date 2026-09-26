# Consent design

This is a design, not a contract. One part of it is built: the Video Module's placeholder, which asks at
the embed for one provider and stores nothing ("The placeholder is where the consent is asked", and
[MODULES.md](../MODULES.md) for the Module). Everything else is still design -- there is no consent state,
no visit-long unlock, no Site declaration of categories, and no banner Widget.

A Widget that loads a third party and decides for itself whether it may, a cookie invented in a Module for
the purpose, a feature-local "cookiesAccepted" flag, or a bought Consent Management Platform dropped into
the Root Layout is not an allowed substitute for this design.

It also records why the first version of this feature is mostly *not* a banner. On a Site that asks for
nothing, a consent banner is not a precaution -- it is a defect, and the supervisory authorities say so in
those words. The quotation is in "No banner without something to ask".

## The two laws, and why they are not one

| Layer | Norm | Subject | Applies without personal data? |
| --- | --- | --- | --- |
| Access to the device | § 25 TDDDG, Art. 5(3) ePrivacy | storing or reading information in the terminal -- every cookie, every `localStorage` key, fingerprinting | **yes** |
| Processing | GDPR Art. 6, 7, 21 | what happens to the data so obtained | no, only for personal data |

§ 25(1) requires consent for *any* access. § 25(2) exempts two cases: pure transmission, and access that is
"strictly necessary" to provide a service the user **explicitly requested**. Commercially sensible is not
necessary. The authorities' list of exempt purposes includes, verbatim:

> "Notwendige Sitzungsverwaltung (z.B. Login oder Warenkorb-Cookies, **sobald** ein_e Nutzer_in sich
> anmeldet) [...] Nutzer_inneneingaben, die sich bei Onlineformularen über mehrere Seiten erstrecken [...]
> Ausgewählte Sprache, **sofern die Standardeinstellung verändert wird** [...] **Vermerken des
> Einwilligungsstatus, aber nur mittels Angabe des Status (ja/nein), nicht einer eindeutigen ID**"

Two details in that list decide this design. The **timing**: a cookie is exempt only from the moment it
becomes necessary, and the same FAQ says that setting a session-id cookie on a bare page view is
"grundsätzlich nicht notwendig". And the **shape** of the consent record: it is exempt as a *status*, never
as a unique id. Everything under "Proof" follows from that second sentence.

## What phis stores today

| Cookie | Lifetime | Purpose | § 25(2)? |
| --- | --- | --- | --- |
| `phis_session` | 14 days, `httpOnly` | Site session, row in `phis.user_sessions` | yes, from sign-in |
| `phis_csrf` | session | double-submit protection | yes, security, the narrow case |
| `phis_area` | tied to the session | which Area was signed in to | yes |
| `phis_auth_link` | short, `httpOnly` | confirming a provider link | yes, user-initiated |
| `phis_operator_session` | 30 min, HMAC, not in the database | operator bootstrap | yes |
| `phis_theme_mode` | 1 year | the mode this viewer chose | yes, a changed default |
| `phis_color_scheme` | the visit, and only when the browser says `dark` | what the browser reported, where nothing was chosen | yes, see below |
| `phis_locale` | 1 year | the language this viewer chose | yes, named explicitly |

No analytics, no tag manager, no error reporter. Google Fonts are loaded through `next/font/google`, which
fetches them at build time and serves them from this origin -- there is no runtime request to Google.
`localStorage` is unused; `sessionStorage` holds an unsent Form draft and a Brand-editor preference, which
[USER_STATE.md](./USER_STATE.md) already classes as per-device conveniences that may be lost.

**`phis_color_scheme` was the one entry worth an argument, and it has been narrowed.**
`buildPhiThemeModeBootstrapScript` ([theme/phi-theme-mode.ts](../theme/phi-theme-mode.ts)) used to write it
for a year, on a first visit, for every viewer including the ones whose browser agreed with the server's
default. Under the FAQ's timing rule -- exempt only *from* the moment it is necessary -- that was the
weakest cookie in the inventory.

Removing it outright was the obvious answer and the wrong one. The mode is not carried by a CSS attribute
but by the Ant Design tokens the server computed, and the pre-paint script can only mark the root, so a
page fetched in the wrong projection corrects itself on screen. Without the hint, every navigation of a
dark-mode viewer would swing once. The change made instead keeps the quality property and drops what could
not be justified:

- written only for `dark`, because `resolvePhiThemeMode` already falls back to light -- so the viewer whose
  browser agrees with the default is asked for no storage at all;
- without an expiry, so it lasts the visit it helps and leaves nothing in the device afterwards, the same
  lifetime `phis_csrf` has;
- deleted when the browser reports light, which also sweeps the year-long cookie earlier versions left in
  a returning browser.

What remains is a status, for one visit, only where it changes an answer, and only for the projection of
the page that was asked for. The cost is one swing at the start of a session instead of one per session
*and* one per first visit -- stated in [gateway/CACHES.md](../gateway/CACHES.md) beside the static key.

**A further caution about reading, as against storing.** The FAQ treats information that a browser sends by
itself -- address, user agent -- as no "access" at all, but says that values *fetched* by JavaScript, naming
screen resolution and the installed font list, are access and do fall under § 25. `matchMedia` on
`prefers-color-scheme` is on that side of the line. It is defensible as necessary, because it is the
presentation of the requested page and nothing else, and it is also the one piece of device information
this system asks for. It is worth knowing that it is not free, and worth not adding a second one casually.

### Sign-in with Google is already correct, and must stay that way

Site auth uses `openid-client` server-side with PKCE and a stored auth transaction
(`phis-server/src/lib/site-auth/provider-flow.ts`). The browser is redirected to the provider; no Google
script, SDK, One Tap, or `gsi/client` is ever loaded into a phis page. That is what makes the provider
legally uninteresting: nothing reaches Google until a person clicks "Sign in with Google", and that click
is the explicit request § 25(2) speaks of. The provider's own cookies are set on the provider's domain, in
a flow the person started.

**The rule this design fixes:** an identity provider is a redirect, never an embedded script. A
one-tap prompt, a rendered Google button, or any provider JS on a phis page turns a consent-free login into
a third-party load before consent, and moves it into the gate below. If that feature is ever wanted, it is
a consent case and not an auth case.

## No banner without something to ask

> "**Nein!** Unbedingt erforderliche Cookies benötigen keine Einwilligung nach TTDSG und eine Einwilligung
> nach DS-GVO wäre die falsche Rechtsgrundlage. Denn diese eingeholte Einwilligung suggeriert, dass die
> Verarbeitung freiwillig ist und Nutzende diese jederzeit mit Wirkung für die Zukunft widerrufen könnten,
> obwohl das rechtlich nicht möglich ist. **Ein Banner schadet in einem solchen Fall also.**"

Asking for consent one does not need is a transparency and fairness breach, because it claims a freedom
that does not exist: nobody can withdraw the session cookie that carries their login. So a Site declares
what it has, and the banner follows from that declaration rather than from a switch somebody forgot:

1. **Nothing** -- the default, and the state of every phis Site today. No banner, no bar, no dialog.
2. **A notice** -- no consent, no buttons that accept or reject, dismissible, and it never blocks. This is
   the honest "this site needs a few cookies to work and uses none for marketing", and it is information.
3. **A consent banner** -- only once the Site has declared at least one consent-bearing category.

Strictly necessary cookies never appear as a choice, not even as a disabled switch labelled "always
active". A switch that cannot move still says "this was your decision", which is the misrepresentation the
quotation above is about. They appear in the information, where they can be read and not agreed to.

## Where the information belongs, and where it does not

The duty to inform is Art. 13 GDPR, and it is discharged in a privacy notice that is reachable **without
deciding anything**. Putting it there is not a formality: "Die Website speichert Einwilligungen [...] die
Inhalte der Erklärungen sind jedoch durch das erneut angezeigte Banner verdeckt -- es muss mithin eine
Entscheidung getroffen werden, bevor man sich informieren kann" is itself a listed breach.

Terms and conditions are a contract. They may carry a sentence that says which cookies the Site needs and
that it runs none for marketing, and link to the privacy notice -- that is fair and it is the sentence
worth writing. What they must not do is turn any of it into something accepted: consent bundled into
accepting terms is neither freely given nor granular nor separately withdrawable, and for strictly
necessary cookies there is nothing to accept in the first place. A clause that reads "by using this site
you agree to our cookies" states a wrong legal basis for cookies that need none.

The registration Form's existing `auth-terms-consent` field
([components/forms/form-provider-contract.ts](../components/forms/form-provider-contract.ts)) is the
contract case and stays untouched by this design. It is a checkbox about terms, submitted with a Form by a
person who is creating an account; it is not a device-access consent and must never be made to carry one.

## The cases that are coming

Today the gate would have no consumers. That is the reason to build it now, while it can be tested against
nothing, rather than under the pressure of the first embed.

| Case | Status | Treatment |
| --- | --- | --- |
| Sign-in with Google, Microsoft, GitHub | in use, server-side redirect | consent-free; keep it a redirect, never a script |
| A YouTube video in a page | expected | the central consent case: a placeholder that loads nothing, and fetches the player only after a click or a granted category. `youtube-nocookie` reduces cookies but still discloses the IP to Google on load, so it does not remove the question |
| Google Fonts at runtime | not used, and must stay so | `next/font` self-hosting is what keeps this out of the gate; a runtime request to Google would be a new consent case |
| Maps, reCAPTCHA, Tag Manager, an analytics product | not used | all the same class as the video: nothing loads before the category is granted |
| First-party reach measurement | not used | consent-bearing today; the Digital Omnibus draft would exempt self-hosted aggregate analysis, which is a reason not to hard-code the category list |

## What is stored, and for how long

**The decision, including the refusal.** Storing consent but not refusal, and therefore asking again on
every visit, is a listed breach:

> "Die Website speichert Einwilligungen (z.B. mittels Cookies), aber **nicht die Verweigerung** der
> Einwilligung oder die beschränkte Auswahl, und fragt deshalb permanent bei jedem Besuch erneut die
> Einwilligung ab."

So does an X that only clears the banner for the current visit. A refusal is a decision and is kept like
one.

**For how long.** No statute names a figure today. Practice runs from six months to two years; twelve
months is the common rule of thumb; the CNIL names thirteen months as the ceiling. The first binding number
is in the Digital Omnibus draft, Art. 88a(4) GDPR-E: refusable in a single click (a), no fresh request for
the same purpose for some period after consent (b), and **no fresh request for at least six months after a
refusal** (c). The draft is not law -- adoption is expected around the end of 2026 and application in 2027
at the earliest -- but it sets the floor worth designing to now.

**The value this design picks:** twelve months, for consent and refusal alike. It clears the proposed
six-month floor, matches the twelve-month rule of thumb, stays under the CNIL ceiling, and needs no second
rule for the refusal case.

**Withdrawal** is "as easy as giving", and the banner is not the only entry point to it: the same Widget in
a second placement, reachable from the footer of every page, reopens the decision. A withdrawal that has to
be requested by mail, or performed at the third party, is a listed breach.

## Proof, and why there is no row per visitor

Art. 7(1) GDPR requires being able to demonstrate consent, and the accountability documentation is expected
to show who was involved, what was consented to, when, and how. A supervisory authority has accepted three
years for such records, by analogy to the limitation period.

None of that adds up to a row per visitor, and here it cannot be one:

- A row needs a key, and the key would have to travel in the cookie. That is precisely what the § 25(2)
  exemption excludes -- "nicht einer eindeutigen ID" -- so the consent cookie would itself become
  consent-bearing. We would need consent to store the consent.
- It would manufacture personal data (an id, a timestamp, possibly an address) about a visitor who had
  none, in order to prove that we asked before manufacturing personal data.
- It has nowhere to live. Every existing table hangs off a membership or a domain object;
  [USER_STATE.md](./USER_STATE.md) says of anonymous visitors that there is "nowhere to put it", and says
  it as a decision rather than a gap. `isPhiStaticRenderRequest`
  ([next/site-proxy.ts](../next/site-proxy.ts)) serves every anonymous visit from one shared render, which
  is the same decision expressed in the proxy.

**A rotation log answers neither half of the question.** The only retention precedent in the system is
`phis.addon_hook_deliveries` -- thirty days, swept by `settledHookDeliveries` in
`phis-server/src/cli/maintain.mts`. Thirty days is far too short to prove anything and far too long to be
a cookie's replacement; the two durations this feature needs are twelve months in a browser and years in a
record, and neither of them is a rotation.

What is stored instead, in three parts:

1. **The status, in the cookie.** The version of the text that was shown, one yes/no per category, and a
   timestamp. No identifier. Readable by a script, because the pre-paint script below needs it.
2. **The question, on the server.** One versioned revision per Site: which categories were offered, in
   which wording and order, valid from when. One row per revision of the banner, not per visitor; it is
   history, so it does not rotate. Together with the status in the browser this is what discharges
   accountability -- we can show what was asked, and the visitor's device holds what they answered.
3. **The person, when there is one.** For a signed-in account the record belongs where account-bound
   decisions already live: a bit in `user_site_flags`. The precedent is literally the same kind of fact --
   `USER_SITE_FLAG_NEWSLETTER_OPT_IN` in `phis-server/src/lib/user-site-flags.ts`, with `DB.md` describing
   the path from `registration_intents.flags` into the membership.

If counts are ever wanted ("how many refused"), they are aggregates per Site and banner revision. No row
per visit, therefore no personal data and no retention question.

## Where it renders

In the static render `cookies()` and `headers()` return empty values without error and the viewer is always
anonymous ([STATIC_RENDERING.md](../STATIC_RENDERING.md)). Visibility therefore cannot be decided on the
server: the banner ships inside the one shared HTML of every public page and decides on the client.

The consent status **must not enter the static render key**. That key is `marker/<mode>/<path>` today, so
two renders per page; every further dimension multiplies the cache for a decision that changes nothing
about what the server would draw.

The precedent for deciding it without a flash already exists: `buildPhiThemeModeBootstrapScript` marks
`<html>` from a cookie before first paint. The same shape applies -- the script reads the status, marks the
root, and CSS keeps the banner out of the layout when a decision is on record. One cache entry, no
round-trip, nothing visible on a second visit.

**Placement** is the Footer region of the Public Area shell preset
([components/regions/presets/phi-default-site-area-preset-tree.ts](../components/regions/presets/phi-default-site-area-preset-tree.ts)),
which `mergePhiCmsShellTrees` joins to every page tree in that Area -- the existing way to be on every
page. Two consequences: it is Area-scoped, so covering App as well means an entry in that shell too, and
there is no banner Overlay type. `PHI_CMS_OVERLAY_TYPES` is `modal` and `drawer`, both with a backdrop and
a focus trap, and a modal cookie banner is the listed breach of having to decide before one can read the
privacy notice. A banner is a region-placed Widget that positions itself, not an Overlay.

## Signed-in Areas

No Area shows a banner, and the reason is never that signing in settled the question. An account is a
contract; § 25 is about the device and applies to a signed-in person exactly as it does to a visitor.
Nobody consents to a video provider's cookie by creating an account, and the terms checkbox at
registration is about terms.

What the staff Areas *store* is the session, the CSRF token, the Area, the locale and the mode, every one
of them on the exempt list -- so there was never anything to ask about the Site's own cookies. A banner
there would be the harmful kind from "No banner without something to ask", shown to somebody trying to
work.

Embedding is a different matter, and App does embed: the Video Module is eligible in `public` and `app`,
because a video in a help page behind a login is as ordinary as one on a landing page. That needs no
banner either, and the reason is the shape rather than the Area -- the placeholder asks where the video
is, for that one provider, and keeps nothing. The gate lives in the Widget, so it is Area-independent by
construction; only a banner would ever have to be placed per Area, which is one more argument for not
having one.

The Area only starts to matter if a Site wants the answer remembered. For a visitor that is a cookie and
everything under "What is stored"; for a signed-in person it is a bit in `user_site_flags`, the same shape
as newsletter consent, and the surface is Settings rather than a bar on every page.

## How the decision travels

`theme-mode-switch` is the model: the Widget holds no state, dispatches a signal to the Core Runtime
Controller, and the Controller writes the cookie server-side -- "the request that follows brings the new
cookie with it". A banner does the same with a decision instead of a mode.

Not the Form path. Opening a Form relay over `/api/site/forms` for two buttons would drag a handler,
a guard token and an Area resolution into a decision that carries no fields. And not a Server Action:
there are none in this project, and the `serverAction` variants in `gateway/mutation.ts` and
`gateway/form-submit.ts` are declared but unreachable.

The cookie is not `httpOnly`, because the pre-paint script reads it -- the same trade `phis_theme_mode`
already makes, and acceptable for the same reason: it carries a status that the person themselves chose
and nothing that would harm them if a script on their own page read it.

## Not a flow

A banner is not a flow and must not become the second consumer of the state-machine grammar.
[STATE_MACHINES.md](./STATE_MACHINES.md) has exactly one consumer -- the Auth machine, which is a
projection of server state rather than an automaton -- and says itself that most of what it describes is
unbuilt. A consent decision is two or three terminal answers with no course of events; a second, detailed
level is composition, which [FORMS.md](../FORMS.md) already states as the rule: "A flow is composed, not
branched." Modelling three buttons as a machine would produce a definition that explains nothing, which is
the failure [USER_STATE.md](./USER_STATE.md) names for dismissed cards.

There is no "Flow Button" in this repository -- no code, no document, no TODO. The Button Widget is a
command or a way somewhere: `href` renders a real anchor, and a wired capability emits a signal whose
receiver is decided in the placement's `signalRoutes`. A banner's buttons are that, and nothing new.

## The gate is the feature

A banner without a gate is theatre, and legally worse than no banner: it claims a choice the page does not
honour. So the order of work is the reverse of the visible one.

1. **The consent state as a contract** -- readable while rendering on the client, with a signal when it
   changes. No surface yet.
2. **The gate** -- one condition a Widget passes before it loads anything third-party. Without the
   category it renders a placeholder that explains what is missing and offers the decision. This is the
   step that makes the law enforceable in code, and it can be tested today against a Site with nothing to
   gate. **Built for video**, in the shape below: the Widget asks per press and keeps no state, which is
   the version that needs no contract above it. A second kind of embed reuses the placeholder; a Site that
   wants to be asked once per visit is what step 1 is for.
3. **The Site's declaration** -- which categories this Site has. Empty means no banner, which is state 1
   above. Categories are authorable with the existing `collection` field type (`itemFields` is recursive),
   so no new Inspector field type is needed.
4. **Then the banner Widget**, plus its second placement for withdrawal -- if a Site still needs one.

### The placeholder is where the consent is asked

The thing a gated Widget draws instead of the embed is not a fallback for something blocked. It is the
request itself, and it is a better one than a banner can be: it names one recipient and one purpose, it
appears where somebody has just shown they want that video or that map, and the page around it works
without it. Informed, specific and voluntary are hard to claim for a dialog at the door that asks for
everything before anybody has wanted anything; they are almost self-evident for a still image of a video
with "load from YouTube" under it.

What it has to say is therefore not "we use cookies": who receives the request (for a video, Google), what
for, that it leaves for the United States under the adequacy decision, and that the decision can be taken
back. That is a label on a placeholder, not a privacy notice, and it links to the notice for the rest.

Nothing here is a banner that reappears, so the rule about storing a refusal does not bite. That rule is
about being asked again and again -- a banner that "permanent bei jedem Besuch erneut die Einwilligung
abfragt" -- and a placeholder asks nothing. It offers. Its resting state *is* the refusal, which is why
there is nothing to remember in order not to nag.

**The decision this raises is how long an answer lasts, and only the last step brings the apparatus of this
document with it.**

- **The click.** It loads this embed for this view, and phis stores nothing. § 25 then asks nothing of *us*
  at all: no record, no duration, no withdrawal surface, no banner anywhere on the Site. Whatever the third
  party stores afterwards, it stores on the basis of a click that is unmistakably the person's own. The cost
  is a click per embed per visit.
- **The visit.** "Load videos for this visit", offered beside "Load this video". The status belongs in
  `sessionStorage`, **not in a cookie**: the lifetime is the same, but a cookie would travel on every
  request to a server that cannot act on it -- the static render reads no cookies, and letting consent into
  the static key would multiply the cache for a decision the client has to apply anyway. So a cookie would
  cost a header on every request and buy nothing. It is per tab rather than per browser, which is the
  honest reading of "this visit". Storing a yes/no status is the exempt case from § 25(2), and the Form
  runtime already keeps an unsent draft the same way. What this step does owe is an off switch during the
  visit, because withdrawal has to be possible at any time -- reachable where the consent was given, and
  ending the unlock for the tab.
- **Across visits.** The cookie under "What is stored", the twelve months, a withdrawal entry point on every
  page, and the versioned record. A convenience, and the step that brings a banner back into view.

The first two together are where this should start; the third is something a Site opts into once somebody
complains about clicking, and then it pays for it with the rest of this document.

**On granularity:** consent is per purpose, not per embed. Every YouTube frame on a Site has the same
recipient and the same purpose, so one answer may cover all of them -- what must not be bundled is
*different* purposes, a video with a map with an analytics product. So unlocking every video for a visit is
lawful, and it is not a shortcut around granularity.

What it does require is that the control says what it does. A button reading "Load video" that quietly
unlocks every video on the Site misstates the extent of the processing, which is its own listed breach. Two
controls, labelled apart, and never one that does more than it says.

Either way the placeholder is content and never a barrier: no page is withheld until it is answered.

## Machine-readable signals

The Einwilligungsverwaltungsverordnung has been in force since 1 April 2025; the BfDI recognised the first
service under § 13 EinwV at the end of 2025, and "Consenter" has been available as a browser plug-in since
early 2026. Sites are **not** obliged to honour it. The draft Art. 88b(1) GDPR-E would oblige them:
interfaces designed so that a person's decisions can be transmitted automatically.

Nothing here is required today, and no part of this design should wait for it. What it changes is one
thing: if the consent state is a contract with a single writer, an external signal is later a second source
for the same state rather than a rebuild. That is the only reason the first step above is a contract and not
a component.

## Banner requirements, when there is one to build

From the authority's own list of breaches, each of these is a defect and not a preference:

- Reject on the first layer, in one action, no scrolling and no second dialog.
- Reject as prominent as accept -- same layer, same weight; nudging through colour, size or position is
  named.
- Nothing pre-selected; "data protection by default" means the boxes start empty.
- The privacy notice and the imprint readable **without** deciding, and not covered by the banner when
  opened from it.
- Granular per purpose, with the purposes described rather than the cookies listed.
- Withdrawal described in the banner's own text, and as easy as consent was.
- No claim that the choice is a condition of using the site.

## Non-goals

- No IAB TCF. It is an ad-industry framework with audited-CMP obligations and a vendor list, and a Site
  that embeds a video does not need any of it. Own categories, with a documented mapping to the seven
  Consent Mode v2 keys if a Site ever adds a Google product.
- No third-party Consent Management Platform. It would be the one script on the page that loads before
  consent.
- No visitor identifier, no device id, no row per visit, no address stored for a decision.
- No consent asked for strictly necessary access, and no disabled switch pretending otherwise.
- No cookie wall: access is not conditioned on the answer.
- No consent carried by accepting terms.

## Open questions

- **Proof.** Is the versioned question per Site enough, or is a record per decision wanted -- accepting
  that it puts an id in the cookie and makes the cookie itself consent-bearing?
- **Controller per Site.** Each Site is its own controller under the GDPR, and the categories, the wording
  and the privacy notice belong to it. Whether the operator may set a default set for new Sites, and
  whether a Site may be prevented from adding a category it has no notice for, is a Settings question this
  design does not answer.
- **Where the notice text lives.** Site content, a global label set, or the Widget's configuration. The
  answer decides whether a Site translator sees it.

## Sources

The legal reasoning above is this design's own, not advice. Its citations:

- LfDI Baden-Württemberg, *FAQ zu Cookies und Tracking* -- the quoted exempt purposes, the "Nein!" on
  unnecessary banners, and the numbered breaches (B 1.6, B 2.2.1, B 2.2.3, B 2.2.4).
- DSK, *Orientierungshilfe Telemedien 2021*, referenced by that FAQ for the exemptions.
- DFN-Infobrief Recht 6/2026, *Cookie-Einwilligungsbanner, quo vadis?* -- EinwV, Consenter, and Art. 88a /
  88b GDPR-E.
- GDPR Art. 7(1) and Art. 5(2) for accountability; a supervisory authority's three-year figure for
  retaining the records.
- CNIL's thirteen-month ceiling for the lifetime of a consent record.
