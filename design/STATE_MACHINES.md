# State machine design

This is a design, not a contract, and no flow uses it yet: nothing hosts a machine, no Module declares
one, and there is no condition source to read one with. A flow written today still uses the mechanisms in
[What exists today](#what-exists-today).

What is built is everything below the host. The account-bound store behind the `profile` persistence
target ([USER_STATE.md](./USER_STATE.md)); the definition grammar and its validator, in
[types/state-machine.ts](../types/state-machine.ts); and the binding, split across
[helpers/state-machine-binding.ts](../helpers/state-machine-binding.ts) (what is decided),
[helpers/state-machine-diagnostics.ts](../helpers/state-machine-diagnostics.ts) (what is said out loud)
and [components/runtime/phi-state-machine-binding.ts](../components/runtime/phi-state-machine-binding.ts)
(where the machine currently is). None of it settles a question in this document; it removes
dependencies. [Build order](#build-order) says what is left.

A feature-local step counter, phase string, workflow reducer, or progress store is not an allowed
substitute for this design. Where a flow exists today it uses the mechanisms in [What exists
today](#what-exists-today), and it keeps using them until this design is approved and built.

## What exists today

Three unrelated mechanisms carry multi-step work, chosen per flow rather than by rule:

- **Handler phases.** `execution: { mode, phase }` on the Form Widget selects `submit` or `confirm`, and
  `gateway/form-handler-resolution.ts` resolves that phase to `submitHandlerKey`, `confirmHandlerKey`, or
  `previewHandlerKey` against the table in `components/forms/form-provider-contract.ts`. This is the only
  declarative transition table in the package, it works, and it is the miniature of what this design
  proposes: two named states, one table, resolved on the server, no branching in the browser.
- **Composition with `visibleWhen`.** [FORMS.md](../FORMS.md) states it directly: "A flow is composed, not
  branched: a stage that asks different questions is another Form." The stages stand side by side in the
  page tree and a `PhiRuntimeConditionExpression` decides which one is shown, reading `page` (the query
  string), `controller`, `widget`, `form`, `row`, or `feature`. There is no named current state; it is
  implied by a set of independent visibility rules.
- **Local component state.** Anything not carried by the first two lives in `useState` inside one Client
  Widget, with its transitions spread across callbacks.

The cost of having no shared answer is measurable in the Auth Module, which is the only place where all
three meet:

- `gateway/auth-public-manifest.ts` contains `fetchPhiAuthWorkflow()`, the reader for Core's
  `GET /api/v1/auth/workflow`. **It is never called.** The second-factor state instead arrives as a field
  on the login response and lives in a Widget's `useState`, so a reload between primary authentication and
  the second factor loses a state the server would still answer for.
- `plugins/runtime-modules/auth/widgets/security/client.tsx` constructs a `PhiAuthWorkflow` value in the
  browser to start enrollment from the App settings surface. `phis-server` AUTHENTICATION.md §9 forbids
  exactly that ("it must not reconstruct the authentication state machine"). It happens because there is
  nothing a server-owned state could be attached to.
- `stage` (`primary | second-factor | step-up | recovery`, `types/auth-manifest.ts`) and
  `capabilitiesByArea` (`primary-login | factor-challenge | factor-enrollment | recovery`,
  `plugins/runtime-modules/auth/definition.ts`) are declared, typed, script-validated and documented.
  Only `primary` and `primary-login` are ever read. Six of eight values are vocabulary waiting for a
  mechanism that does not exist.
- `getCsrfToken` is written six times across Auth and Core clients, and logout is implemented three times
  -- Widget, sidebar menu, Core Runtime adapter -- with three different endings and three different error
  postures, two of which discard the failure silently.

## Core model

A state machine is a named, versioned description of the states one piece of work can be in and the
transitions between them. It is not CMS content, not a Runtime Module, not a Form, and not a second router.

The structure follows `PhiTableBinding` ([TABLES.md](../TABLES.md)) rather than the Controller pattern,
because the same split already carries tables: a serializable description owned by a Module, a headless
Core binding that runs it, and a host that places it.

```text
versioned state machine definition        (serializable, owned by one Module)
        |
        v
PhiStateMachineBinding                    (headless Core, no ownerModuleId, no activation, no preset)
  - current state and its data
  - transition evaluation
  - effect requests to its host
        |
        v
owning runtime Controller                 (the host: sends signals, performs navigation, reads results)
        |
        v
Widgets, Forms, Overlays                  (present the state; never hold it)
```

- `PhiStateMachineBinding` is a TypeScript/Core component, not an installable Runtime Module. It has no
  `ownerModuleId`, Area activation, preset, route, or independently selectable lifecycle, exactly as
  `PhiTableBinding` has none.
- A Controller hosts it. The Controller remains the only party that dispatches signals, asks the Core
  Runtime Controller to navigate, and calls a gateway. The binding decides *what* should happen; the host
  is what does it.
- A Widget never hosts a machine and never holds its state. It presents a state it was given and reports
  what the visitor did.

## Where the grammar lives

`@phis/ui`, in `types/state-machine.ts`, beside `types/runtime-condition.ts`.

An earlier version of this section said `@phis/contracts`, on the grounds that phi-server validates stored
wiring against the same lists. The grounds do not hold, and the test is the admission rule that package
states for itself: *name the two parties and the sentence they promise each other*. phi-server validates
signal wiring stored on CMS nodes (`src/lib/cms/signal-validation.ts`, called from write and publish
validation) and it stores a Site's active Module ids. It holds nothing else of this: no condition
expression, no controller setting, no Module descriptor. A machine definition belongs to a Module the way
a Controller descriptor does, and phi-server never sees one.

**The rule, sharper than the README has it: what phi-server reads goes in `@phis/contracts`, and nothing
else does.** Not "what two parties share" -- `@phis/ui` and a third-party Module are two parties, and
everything they agree on already lives in `@phis/ui` (`types/cms-plugins.ts` is exactly that agreement).
The precedent is `PhiRuntimeConditionExpression`: stored on CMS nodes, read by nobody on the server side,
and it lives in `@phis/ui`. A machine's guards are those same expressions, so putting the grammar in
`@phis/contracts` would drag the whole condition vocabulary across with it, to a party that has no use
for it.

What does cross the wire is already covered: a transition's effects are ordinary signals, and
`@phis/contracts/signals` holds that vocabulary. `PHI_SIGNAL_ACTION`s are not widened for this.

A Module author linking against both is not a cost worth optimising -- linking against
`@phis/contracts` is required of them regardless. Whether `@phis/ui` should re-export the contract halves
so a Module has one import surface is a separate question, still open; the re-export pattern exists
already (`types/user-state.ts`, `constants/user-state.ts`) but has never been applied as a rule.

If phi-server ever does store or validate a definition, the grammar moves. Pre-v1 that is an ABI break
and an ABI break is allowed ([AGENTS.md](../AGENTS.md)).

## Authority

`authority` is the first field of a definition, not an implementation detail.

- `authority: "server"` -- the machine is a **projection**. The current state is whatever the server last
  said it is. A transition is a request; its outcome is the server's next answer, and a failed request
  leaves the state where it was. The binding never computes a next state from a local rule, never
  synthesizes a state value, and must be able to re-read the authoritative state at any time through a
  declared reader. A projection without a reader is a definition error.
- `authority: "client"` -- the machine owns its state. Transitions are evaluated locally against the
  definition's table.

A machine never mixes the two. Work that is partly server-owned -- a checkout whose payment step is
settled elsewhere -- composes two machines rather than widening one.

This field is what keeps a third party from rebuilding a security state machine in the browser. Under
`server` authority the binding structurally cannot: there is no local transition function to write.

## Definition identity and content

- Every machine is named `(ownerModuleId, machineKey)` and carries a positive integer definition version.
  The pair rather than an id of its own, for the reason a Page route is named the same way: an id built
  from a package name cannot separate two Modules shipped in one package, and a Site may run one of them.
  It is also what makes a `profile` checkpoint's key derivable instead of declared.
- States and transitions are keyed objects, not arrays of records. The key is the identity, so an object
  makes uniqueness structural where an array leaves it to a validator, lookup is direct, and a diff
  between two versions stays readable -- which is what a versioned identity is for.
  `PHI_SIGNAL_VALUE_SCHEMAS` is already written this way. The descriptor lists that *are* arrays, such as
  the form handler providers, are arrays because they are concatenated across Modules; a machine belongs
  to exactly one Module and is never assembled. Where several owners contribute, an array; where one
  owns, an object.
- Position carries no meaning. A state has no order, and a transition's place in the object is not a
  priority.
- The version has exactly one job: it is the identity of persisted state. Changing it deliberately makes a
  different machine, and state recorded under an older version is discarded rather than migrated. A
  machine that must keep history across versions records it as domain data, not as machine state.
- It is not a compatibility promise, and nothing here is. While the package is pre-v1 an ABI break is
  allowed, including one a third-party package reads -- that package is rebuilt
  ([AGENTS.md](../AGENTS.md): no shims, no parallel shapes, no compatibility readers). So there is no
  version tolerance to negotiate between Modules and a reader declares no version it was written against.
- Titles, descriptions, and any text a state contributes use the normal Label Set and translation paths
  ([TRANSLATIONS.md](../TRANSLATIONS.md)). A state key is not a user-visible string, and a definition
  carries no literal English copy -- the current second-factor body does, and that is one of the symptoms.
- A definition contains no callbacks, element references, selectors, secrets, credentials, tokens, route
  targets, or arbitrary executable code. It is serializable and server-readable on the same terms as a
  Form descriptor.

## States, events, and transitions

- The state set is closed per definition. `PhiStateMachineBinding` rejects an unknown state key rather
  than falling through to a default.
- A transition is `(from state, event key) -> to state`, optionally guarded. Guards reuse
  `PhiRuntimeConditionExpression` ([types/runtime-condition.ts](../types/runtime-condition.ts)) so that a
  guard and a `visibleWhen` are the same language, evaluated the same way, against the same sources.
- Determinism is a validation rule rather than a shape. Transitions are keyed flat by transition key and
  not nested under `from` and `event`, because nesting forbids the guarded alternative -- one event, two
  targets, decided by a condition -- which Auth does not need and the first non-trivial client machine
  probably will. What the nesting would have made impossible is checked instead: at most one unguarded
  transition per `(from, event)`, and a guarded set with no unguarded fallback is a definition error
  rather than a silent dead end.
- **Waiting and failing are states, not flags beside them.** Today every Controller carries its own
  `submitting` and `error` next to whatever it considers the real state; that is where the divergence in
  loading and error presentation comes from. A definition that needs "submitted and waiting" names it.
- A transition may declare effects. An effect is a request to the host: dispatch this declared signal, ask
  the Core Runtime Controller for this forward, call this declared reader. The binding performs none of
  them itself and never touches `window`, the router, or a gateway.
- Guards, effects, and the state table are the whole of a machine's behaviour. A definition with branching
  that cannot be expressed in them is a sign that it is two machines.

## Reading the current state

A machine's state must be readable on demand, not only observable as an event. This is the gap the signal
bus leaves: it holds an addressed signal for a receiver that has not mounted (`pending`), but nothing
teaches a late receiver a value it already missed, which is why a mode delivered as an event has to be
repeated on every registration.

- The binding exposes a snapshot: the current state key, the definition id and version, and the state's
  declared data.
- The snapshot travels under a declared `valueSchema`, not as `Record<string, unknown>`. Its shape is
  owned by the defining Module, named with the ordinary
  `<package>/signals/<key>` grammar ([SIGNALS.md](../SIGNALS.md)), and therefore checkable by a third
  party and by phi-server. It is also the schema a `profile` checkpoint is stored under, so a machine
  names the shape of its position once and both the snapshot and the store are held to it.
- The host answers `condition/reload` with the snapshot through the existing
  `usePhiRuntimeConditionStateResponder`, so a node's `visibleWhen` can read `controller` state as it does
  today. This is the compatibility requirement that makes the design adoptable at all: existing presets
  keep composing stages by condition, and gain a named state to condition on instead of an inferred one.
- Signal readiness and state readiness stay distinct facts, as they do for Tour anchors
  ([TOURS.md](./TOURS.md)).

## Reading another Module's machine

One Module asking what another Module's machine is doing is an ordinary case -- a shop offering checkout
only to a completed session, a Module holding its own Overlay back while a Tour runs -- and the channel
for it already exists: a `controller` condition reads any address, and [SIGNALS.md](../SIGNALS.md) permits
listening in on an address another listener owns. Nobody does it yet. Every `source: "controller"`
condition in the package today reads a Controller of its own Module, which makes this the moment to say
what such a reading is, instead of reconstructing it later from whatever the first caller wrote.

- **A machine publishes named statements, not raw state keys.** Today a condition reads a path such as
  `permissions.readOnly` out of a `Record<string, unknown>` -- an outside reader guessing at somebody
  else's field names. A definition instead publishes a small set of named facts about itself and keeps
  its state keys internal. The distinction already exists among the condition sources: `feature` is what
  a Module publishes deliberately under a name it keeps, `controller` is whatever somebody happened to
  report. A published surface is a machine's `feature`.
- **The reason is correctness, not compatibility.** A reader that asks "while no step is running" --
  which `noStepRunning()` in the login preset does today -- is right until the machine gains a state and
  then silently wrong: it shows the login form during a recovery nobody told it about. Rebuilding that
  package does not fix it, because it still compiles. A positive reading survives a new state, a negation
  over an open set of states does not, and the owner is the only party who can keep a named statement
  true across the states it adds.
- **A reader names a reference, never an address.** [THIRD_PARTY_MODULES.md](../THIRD_PARTY_MODULES.md)
  forbids the exact analogue for routes -- "Your own path must not appear anywhere in your Module. No
  link, no forward, no condition on `/login`" -- and answers it with `(ownerModuleId, presetKey)` resolved
  through the current route table. A machine condition names `(ownerModuleId, machineId)` and resolves the
  same way. A hard-coded `controller:` address breaks quietly as soon as the instance is named differently
  or the owning Module is not active in that Area.
- **Absence is an answer.** The owning Module may not be active, so the machine may not exist.
  `whenUnavailable` already carries this, and the cautious reading is the default: for a machine over a
  security decision, "no state" must never pass as `complete`.
- **Events from outside are declared, and there are none by default.** Reading is one thing; raising an
  event in somebody else's machine is another. A machine states which events it accepts from outside its
  owning Module, and states none unless it says so. Server authority softens that only halfway -- Core
  still decides the outcome, but a foreign `enroll` is still an interference.

Expressing the reference cleanly means a condition source of its own beside `controller`, which widens
`PHI_RUNTIME_CONDITION_SOURCES` (today `row`, `form`, `controller`, `page`, `widget`, `feature`) and needs
approval like any other closed enum. The alternative -- letting a third party write the address -- is what
this section exists to prevent.

**It is part of the first build rather than a later addition, and the reason is a reader that already
exists.** The obvious objection is that Auth reads nobody else's machine, so a seventh value would have
no caller -- which is what [What exists today](#what-exists-today) holds against `stage` and
`capabilitiesByArea`, six of eight values declared and never read. The objection does not survive looking
at the login preset:

```ts
function noStepRunning(stepAddress: PhiSignalAddress) {
  return { source: "widget", widgetAddress: stepAddress,
           valuePath: "active", operator: "falsy", whenUnavailable: "matched" } as const;
}
```

`components/regions/presets/phi-login-form-nodes.ts`, used twice. Three things are wrong with it the day
Auth becomes a projection, and all three are silent. It reads `widget`, the most transient source there
is -- a Widget "reports only what it found out for itself"
([types/runtime-condition.ts](../types/runtime-condition.ts)) -- while the state will be coming from the
server. `whenUnavailable: "matched"` then means the Widget's silence reads as "no step is running", so
the sign-in form appears *during* a recovery. And `stepAddress` is a written-out address, the exact thing
[THIRD_PARTY_MODULES.md](../THIRD_PARTY_MODULES.md) forbids for routes.

So the first build does not add a source for a hypothetical caller; it repairs two conditions that are
about to become wrong. What that forces is worth more than the value itself: every definition has to
separate the facts it publishes from the state keys it keeps from the very first one, and that separation
is not something a later version can retrofit onto machines written without it.

## Signaling

A machine uses the existing signal bus, scopes, addresses, actions, value types, and correlation ids. It
does not define a parallel event bus, a module-global store, or a second registry.

- `PhiSignalAction` is not widened. Transitions use the approved actions -- `activate` to raise an event,
  `change` to report a new state, `reload` to ask for one, `clear` to abandon. `PhiSignalChannel` is open,
  so a machine channel needs no enum change.
- The host declares every input and output through its normal `runtimeSignals` metadata, so a machine is
  visible to Builder wiring and to descriptor validation like any other capability.
- An event reaches a machine only through an explicitly routed signal from the originating instance. The
  host attaches no DOM listeners and infers no transition from a neighbouring Widget's internals.
- Effects are dispatched by the host and never by a Widget that received a listen route.
  [SIGNALS.md](../SIGNALS.md) states the rule the other way round -- "Listen routes update local state
  only; they never emit another signal implicitly" -- and a machine that lived in a Widget would break it
  on every transition. Keeping the machine in the Controller is what keeps that rule true.
- A reply, a state change, and every effect carry the correlation id of the signal that caused them,
  across helpers and awaits.
- Suppress no-op transitions. A guard that refuses, or a transition whose target equals the current state,
  reports nothing.

## Lifetime and persistence

Where the state lives and how long is the first question a machine has to answer, and the one the current
Controller contract leaves open: `controllerMountPolicy` distinguishes `site`, `area` and `demand`, but
nothing states whether an Area Controller survives a navigation inside its Area.

- A machine's lifetime is its host's lifetime. When the host unmounts, an unpersisted machine is gone.
- **Which, inside an Area, has two values already** -- this was an open question and the answer was in
  the tree the whole time. `PhiRuntimeControllerServerHost` is mounted twice:
  `components/cms/phi-cms-root-layout.tsx` mounts `registeredControllerSettings`, and
  `components/cms/phi-cms-root-page.tsx` (with the slot Page beside it) mounts `pageControllerSettings`.
  A Controller from the Layout host survives a soft navigation within its Area; one from the Page host
  goes with the Page. Nothing states this today, for Controllers either, and `MODULES.md` is where it
  belongs.
  A machine does not get a field for it. One that *must* survive a navigation says so through
  `persistence`, never by being registered in the luckier host -- otherwise correctness hangs on a
  position in the tree that whoever wrote the preset was not thinking about.
- **A machine never crosses an Area boundary in memory.** Crossing one is a hard navigation
  ([SIGNALS.md](../SIGNALS.md): no signal travels from one Area to another), so a machine that spans Areas
  checkpoints to a declared persistence target before the forward and resumes through the destination
  Area's own host -- the rule already written for Tours. Login in Public followed by a destination in App
  is exactly this case.
- A definition declares its persistence target explicitly, and the closed set is the point of the field:
  - `none` -- the machine is gone on unmount;
  - `query` -- one or more validated query parameters, which is what the reset-password and confirm flows
    use today and what makes an emailed link resumable;
  - `server` -- the authoritative store behind a `server` authority machine; the binding holds a copy and
    re-reads it, never writes it;
  - `profile` -- account-bound state for a position that should outlive the session, held in the store
    described in [USER_STATE.md](./USER_STATE.md), which is built: the contract vocabulary is
    `@phis/contracts/user-state`, the store is `user_site_memberships.module_state`, and the two ends are
    `@phis/ui/runtime/user-state-client` and `getPhiUserState`.
- `profile` is the target with the most conditions attached, and they come from the store rather than from
  this design. A machine that wants it has to live with all five:
  - **A checkpoint is a `value`, and its schema is the snapshot's.** The store's `value` shape asks for a
    declared `valueSchema` in the ordinary `<package>/signals/<key>` grammar -- the same thing
    [Reading the current state](#reading-the-current-state) already requires of a snapshot. One
    declaration serves both, and a machine that could not name the shape of its own position could not
    have published a snapshot either.
  - **The key belongs to the owning Module, not to the host.** A user-state key is `<moduleId>/<key>` and
    the prefix is the whole authorization, so a machine checkpoints under the id of the Module that
    *defines* it. A Controller from another Module may host it, but it cannot be the one whose id is on
    the key.
  - **Only for a signed-in viewer, and never read on Public.** The store answers from the session, and a
    Public page renders once for everybody with empty cookies. So the Area-crossing case this section
    names first -- login in Public, destination in App -- is exactly the one `profile` cannot carry: it
    stays `query` or `server`. `profile` is for a machine that is already behind a login on both ends.
  - **Writing is a round trip; reading is a request of its own.** Neither is a local set. A machine
    checkpoints at positions worth a request, not on every transition, and a resuming host pays one
    `getPhiUserState` while it renders. A machine whose every step must survive a reload wants `query`,
    which costs nothing and is in the address bar already.
  - **The Module's whole namespace is capped** at `PHIS_USER_STATE_MAX_SERIALIZED_BYTES`, shared with
    every other key that Module keeps. A position is a state key and a version; a machine that wants to
    store its course of events there has misread what the store is for.
- `localStorage`, `sessionStorage`, cookies invented for the purpose, and module globals are not
  persistence targets. The Form draft in `sessionStorage` stays what it is -- a draft of typed input, not
  the position in a flow.
- Persisted state stores stable state keys and the definition version. A version mismatch discards -- and
  under `profile` discarding means clearing the key, not writing a null into it, because the store treats
  an absent key and a falsy one as different answers.

## The server-owned case

Auth is the first consumer and the reason the `server` authority exists. Under this design:

- The Auth Controller hosts one projection whose reader is `fetchPhiAuthWorkflow()`. The state is
  `anonymous`, `primary-verified`, `factor-enrollment-required`, `factor-challenge-required` and
  `complete` -- the progression `phis-server` AUTHENTICATION.md §9 already publishes, read from the
  endpoint that already answers it instead of from a field on a login response.
- **That reader has to be fixed before it can be one.** `gateway/auth-public-manifest.ts` returns `null`
  for a `401` -- a visitor who is not mid-authentication -- and `null` again when the workflow says
  `complete`. Two different answers, one return value, and a projection handed `null` cannot tell
  `anonymous` from `complete`. [Reading another Module's machine](#reading-another-modules-machine)
  already states the rule this breaks: for a machine over a security decision, "no state" must never
  pass as `complete`. So the first piece of work on Auth is this function, not the binding.
- **A re-read that contradicts the shown state wins, and says so.** Under `server` authority the browser
  holds no opinion it could weigh against the server, so "report instead of adopt" is not an available
  answer -- the projection adopts. The report is what comes with it rather than instead of it: a
  contradicting re-read is nearly always a fault in the effect that ran before it, and silence there is
  how a flow that resets itself once per hour stays unexplained. See
  [Diagnostics](#diagnostics) for the level.
- A reload during a second factor re-reads the state and resumes. Nothing in the browser constructs a
  workflow value; `security/client.tsx` starts enrollment by raising an event, and the state it then shows
  is Core's answer.
- `stage` and `capabilitiesByArea` become meaningful: a state names the presentation capability it needs,
  and a Site policy whose machine reaches a state no active provider can present fails closed at
  resolution instead of at the visitor.
- Nothing about enforcement changes. Core remains the only party that marks a factor, assurance level or
  session complete; a projection is presentation state and holds no credential, token or seed.

## Composition

Two machines coordinate through signals. **A machine is never a state of another machine.**

Nesting would need a second addressing (how is the inner one spoken to), a second persistence rule (where
does its position go), and a second version beside the outer one -- and the case that raises the question,
checkout, is precisely the one with *two authorities*. An inner machine that keeps its own authority is
not nested; it is a second machine with a hidden wire.

Nothing is lost by refusing it. "Payment is running" is a state of the outer machine, and the inner
machine's ending is an event. What it costs instead is that published statements stop being optional: the
outer machine learns what the inner one is doing through the named fact the inner one publishes, which is
[the section below](#reading-another-modules-machine) and not a separate mechanism.

## Diagnostics

A wrong transition is as invisible today as a dropped signal was before the bus reported one. The bus has
since grown three levels, and a machine adds no fourth -- it sorts its own faults into the same three
(`components/runtime/runtime-signal-bus.tsx`):

| Bus fault | Level | Machine fault at the same level |
| --- | --- | --- |
| `undeliverable` -- an address nobody answers to | `warn`, deduplicated, **in production too** | an unknown state key; an event with no transition for `(from, event)`, deduplicated by `(machineId, from, event)` |
| circulation -- a signal setting itself off | `error`, **development only**, guarded at the call site so the bundler removes it | a `server` re-read that contradicts the state being shown |
| `pending` -- a receiver not mounted yet | nothing, held | a guard that refuses; a transition whose target is the current state |

The reasoning carries over with the levels. An unknown state key is a fault in a definition, not in a
run, and the bus says of its own production warning that "a wiring that names an address nobody answers
to is not a state a Site is meant to be in" -- the same is true of a state key nothing declares. A
refused guard is the ordinary case and stays silent, which [States, events, and
transitions](#states-events-and-transitions) already requires. Divergence sits with circulation because
detecting it costs a comparison on every read.

All of it belongs to the binding and none of it to the host. Diagnostics written per host is how
`getCsrfToken` ended up with six spellings and logout with three different error postures, two of which
discarded the failure silently.

Built as [helpers/state-machine-diagnostics.ts](../helpers/state-machine-diagnostics.ts). One line of
this table needed sharpening twice, and both times in the same direction -- towards saying less.

Divergence is reported only when a re-read disagrees with what was shown **and nothing had been sent**.
A projection changing state after a request is what a projection does, so reporting every change would
have buried the case worth reading: a second tab, an expired Session, or an effect that reported a
transition the server never made.

And **never for the first state a projection is handed**, which a test of the mounted binding caught
before anything used it. A projection's first state always arrives unasked -- the host mounts, reads,
and hands over whatever Core said -- so the original rule would have put a line in the console on every
single sign-in. The machine has shown nothing at that point; there is nothing for an answer to
contradict.

## Third-party surface

A Module declares a machine the way it declares a Controller or a provider descriptor: serializable
metadata in the Module's server-safe graph, executable parts reachable only through Area-local Client
loader manifests ([THIRD_PARTY_MODULES.md](../THIRD_PARTY_MODULES.md)). No global registry, no
import-side-effect registration, no request-derived imports.

What a third party gets: state, transitions, guards, effects, snapshot delivery, condition-state answering,
persistence, and version handling. What it must not do: define a machine over a security decision another
party owns, write a `server` authority machine without a reader, or reach another Area's host. Reading a
machine it does not own is [its own section](#reading-another-modules-machine); writing to one is declared
by the owner or refused.

## Non-goals

- Not a replacement for handler phases. `submit`/`confirm` and the handler table keep doing what they do;
  a machine may raise a Form submit as an effect, and an ordinary two-stage Form needs no machine at all.
- Not a Builder feature. v1 adds no canvas, no visual transition editor, no generated definitions. Builder
  may display and validate an existing machine's addresses once authoring is separately approved.
- Not a router, not a navigation policy, and not an authorization mechanism. A machine asks the Core
  Runtime Controller to forward, which still refuses anything that is not a path on this Site, and a state
  never grants access.
- Not a way to keep a Widget's transient interaction state. A disclosure, a hover, an open dropdown are
  component state.

## Candidates

| Candidate | Status today | Authority |
| --- | --- | --- |
| Auth workflow: challenge, enrollment, step-up, recovery, reset | built, state in a Widget's `useState`, server reader unused | server |
| Guided Tours | designed in [TOURS.md](./TOURS.md), not built | client, `profile` |
| Checkout and payment | named as a separate lifecycle in [FORMS.md](../FORMS.md) and [PRESET_FORMS_HOWTO.md](../components/forms/PRESET_FORMS_HOWTO.md), not built | composed |
| Builder draft commands | built, hand-written | client |
| Multi-stage Forms (reset, confirm, provider link) | built as composition plus query conditions | client, `query` |

Five consumers, three of them already written or designed. The spread matters as much as the count: a
design shaped around Auth alone would not survive the other four.

## Answered

The four questions this document opened with are decided, and two of them turned out to have had an
answer in the repository rather than needing one invented.

1. **Divergence under `server` authority** -- the projection adopts and reports.
   [The server-owned case](#the-server-owned-case).
2. **Lifetime inside an Area** -- already determined by which of the two hosts mounts the Controller, and
   a machine gets no field for it. [Lifetime and persistence](#lifetime-and-persistence).
3. **Composition** -- signals only; a machine is never a state of another machine.
   [Composition](#composition).
4. **Diagnostics** -- the bus's three levels, nothing new.
   [Diagnostics](#diagnostics).

A fifth was raised and decided against the first instinct: the condition source for
`(ownerModuleId, machineId)` is in the first build, because two conditions in the login preset break
silently without it. [Reading another Module's machine](#reading-another-modules-machine).

## What is still open

Not design questions -- one approval and one dependency.

- **A seventh `PHI_RUNTIME_CONDITION_SOURCES` value** is a closed enum and needs operator approval.
- **Server-side progression.** A machine whose state advances as the side effect of a server action has
  no browser write with which to checkpoint to `profile`. This is [USER_STATE.md](./USER_STATE.md)'s one
  remaining open question seen from this end, and it does not block a `server` authority machine, which
  re-reads instead of checkpointing.
- **The Page host is being rebuilt.** The lifetime answer above reads three files that the removal of
  parallel routes for `page.tsx` touches. Writing the rule down does not wait; building the binding on
  top of it should.

## Build order

It follows from the answers rather than from preference, and the first two steps were not about machines
at all -- both were things that were already wrong.

1. ~~`fetchPhiAuthWorkflow` stops folding `401` and `complete` into the same `null`.~~ **Done.** It folded
   three things: a misconfiguration, an absent Session, and a finished one. Core answers `complete` for
   every signed-in viewer (`serializeAuthWorkflow`), so a signed-in visitor and an anonymous one gave the
   same answer. `null` now means one thing, and the two other cases throw.
2. ~~The rule for which host a Controller is mounted in, into `MODULES.md`.~~ **Done.** One paragraph, no
   code, true before it was written down.
3. ~~The definition grammar.~~ **Done**, as [types/state-machine.ts](../types/state-machine.ts) -- not in
   `@phis/contracts`, for the reason in [Where the grammar lives](#where-the-grammar-lives). Authority,
   persistence, states, flat transitions, guards as ordinary condition expressions, effects that name
   rather than carry, published statements, and `collectPhiStateMachineDefinitionErrors` holding the two
   determinism rules the flat shape gave up structural enforcement of.
4. ~~`PhiStateMachineBinding`, headless, with the diagnostics above in it and not in a host.~~ **Done**,
   in three files rather than one, on the split `helpers/table-binding.ts` already has beside
   `phi-table-binding.ts`: which transition an event takes and whether a fault is worth printing are
   decisions about a definition rather than about a component. The hook holds where the machine is and
   who re-renders when it moves. The diagnostics are the binding's and not a host's, which was the point.
5. The condition source, and with it the two login-preset conditions rewritten from
   `source: "widget"` onto a named statement.
6. Auth as the first consumer: one projection, `security/client.tsx` raising an event instead of
   constructing a workflow value.

Two things the grammar settled that this document had left vaguer than it should have. A machine is named
`(ownerModuleId, machineKey)` like a Page preset, not by an id of its own -- a package may carry two
Modules and a Site run one of them, which is the same reason user-state keys take a Module id. And a
`profile` checkpoint's key is derived from that pair rather than declared, which puts the owning Module's
id in front by construction: the prefix the store authorizes on cannot be got wrong.
