# State machine design

This is a design, not a contract: none of it is built. There is no `PhiStateMachineBinding`, no state
machine definition family, and no state channel.

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

- Every machine has a stable namespaced id and a positive integer definition version.
- Every state has a stable state key. Array or table position is presentation order, never identity.
- Every transition has a stable key within the definition.
- Changing the version deliberately creates a new machine. Persisted state recorded under an older version
  is discarded, not migrated: the package is pre-v1 and keeps no compatibility readers
  ([AGENTS.md](../AGENTS.md)). A machine that must retain history across versions records it as domain
  data, not as machine state.
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
  party and by phi-server.
- The host answers `condition/reload` with the snapshot through the existing
  `usePhiRuntimeConditionStateResponder`, so a node's `visibleWhen` can read `controller` state as it does
  today. This is the compatibility requirement that makes the design adoptable at all: existing presets
  keep composing stages by condition, and gain a named state to condition on instead of an inferred one.
- Signal readiness and state readiness stay distinct facts, as they do for Tour anchors
  ([TOURS.md](./TOURS.md)).

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
- Effects are dispatched by the host and never by a Widget that received a listen route. [SIGNALS.md](../SIGNALS.md)
  states the rule the other way round -- "Listen routes update local state only; they never emit another
  signal implicitly" -- and a machine that lived in a Widget would break it on every transition. Keeping
  the machine in the Controller is what keeps that rule true.
- A reply, a state change, and every effect carry the correlation id of the signal that caused them,
  across helpers and awaits.
- Suppress no-op transitions. A guard that refuses, or a transition whose target equals the current state,
  reports nothing.

## Lifetime and persistence

Where the state lives and how long is the first question a machine has to answer, and the one the current
Controller contract leaves open: `controllerMountPolicy` distinguishes `site`, `area` and `demand`, but
nothing states whether an Area Controller survives a navigation inside its Area.

- A machine's lifetime is its host's lifetime. When the host unmounts, an unpersisted machine is gone.
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
  - `profile` -- User Space state, scoped by Site, user, machine id and definition version, for progress
    that should outlive the session. Anonymous progress, retention and synchronization are out of scope
    here as they are for Tours.
- `localStorage`, `sessionStorage`, cookies invented for the purpose, and module globals are not
  persistence targets. The Form draft in `sessionStorage` stays what it is -- a draft of typed input, not
  the position in a flow.
- Persisted state stores stable state keys and the definition version. A version mismatch discards.

## The server-owned case

Auth is the first consumer and the reason the `server` authority exists. Under this design:

- The Auth Controller hosts one projection whose reader is `fetchPhiAuthWorkflow()`. The state is
  `anonymous`, `primary-verified`, `factor-enrollment-required`, `factor-challenge-required` and
  `complete` -- the progression `phis-server` AUTHENTICATION.md §9 already publishes, read from the
  endpoint that already answers it instead of from a field on a login response.
- A reload during a second factor re-reads the state and resumes. Nothing in the browser constructs a
  workflow value; `security/client.tsx` starts enrollment by raising an event, and the state it then shows
  is Core's answer.
- `stage` and `capabilitiesByArea` become meaningful: a state names the presentation capability it needs,
  and a Site policy whose machine reaches a state no active provider can present fails closed at
  resolution instead of at the visitor.
- Nothing about enforcement changes. Core remains the only party that marks a factor, assurance level or
  session complete; a projection is presentation state and holds no credential, token or seed.

## Third-party surface

A Module declares a machine the way it declares a Controller or a provider descriptor: serializable
metadata in the Module's server-safe graph, executable parts reachable only through Area-local Client
loader manifests ([THIRD_PARTY_MODULES.md](../THIRD_PARTY_MODULES.md)). No global registry, no
import-side-effect registration, no request-derived imports.

What a third party gets: state, transitions, guards, effects, snapshot delivery, condition-state answering,
persistence, and version handling. What it must not do: define a machine over a security decision another
party owns, write a `server` authority machine without a reader, or reach another Area's host.

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

## Open questions

1. **Divergence under `server` authority.** What a projection does when a re-read contradicts the state it
   was showing: discard and re-render, or report. Auth has an obvious answer; a slower domain may not.
2. **Lifetime inside an Area.** Whether an Area-hosted machine survives a soft navigation between Pages of
   that Area, which the Controller contract does not currently state for Controllers either.
3. **Where the grammar lives.** Signal vocabularies sit in `@phis/contracts/signals` because phi-server
   validates stored wiring against the same lists. A machine definition that is ever stored, validated or
   mirrored server-side belongs there too, not in `phis-ui/types`.
4. **Composition.** Whether one machine may host another as a state, or whether two machines only ever
   coordinate through signals. The checkout case forces this question.
5. **Diagnostics.** A wrong transition is as invisible today as a dropped signal was before the bus
   reported one. Whether the binding reports a refused event, an unknown state key, or a guard that never
   resolves, and at what level.
