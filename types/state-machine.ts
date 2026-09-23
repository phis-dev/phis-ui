import { isPhiSignalValueSchemaShape, type PhiSignalValueSchema } from "./signals";
import type { PhiRuntimeConditionExpression } from "./runtime-condition";
import type { PhiCmsPresetIdentity, PhiRuntimeModuleId } from "./cms-module-descriptors";

/**
 * A named description of the states one piece of work can be in, and how it moves between them.
 *
 * It lives here and not in `@phis/contracts` because phi-server never sees one. What that package holds
 * is what phi-server reads: the signal vocabulary it validates on stored wiring, the user-state shapes it
 * checks a write against. A machine definition belongs to a Module the way a Controller descriptor does,
 * and the guards below are `PhiRuntimeConditionExpression`, which is itself stored on CMS nodes and read
 * by nobody on the server side. Moving this across would drag that whole vocabulary to a party with no
 * use for it. ([design/STATE_MACHINES.md](../design/STATE_MACHINES.md) -- and note that document is a
 * design: this file is the grammar, `PhiStateMachineBinding` does not exist yet.)
 *
 * Nothing here is executable and nothing here is a reference to something executable. A definition is
 * serializable on the same terms as a Form descriptor: no callbacks, no element references, no
 * selectors, no credentials, and no route targets. Where a machine has to reach something -- a signal to
 * raise, a reader to call, a Page to forward to -- it names it, and the host resolves the name.
 */

/**
 * Who decides what state the machine is in.
 *
 * This is the first field of a definition rather than an implementation detail, because it is the field
 * that makes a whole class of mistake unavailable. Under `server` there is no local transition function
 * to write, so a third party structurally cannot rebuild a security state machine in the browser -- which
 * is what `phis-server` AUTHENTICATION.md §9 forbids in prose today and what the Auth security Widget
 * does anyway, for want of anywhere to put the state.
 *
 * A machine never mixes the two. Work that is partly server-owned -- a checkout whose payment step is
 * settled elsewhere -- is two machines that coordinate, not one machine that is half of each.
 */
export const PHI_STATE_MACHINE_AUTHORITIES = ["server", "client"] as const;

export type PhiStateMachineAuthority = (typeof PHI_STATE_MACHINE_AUTHORITIES)[number];

/**
 * Where the position is kept, and how long it survives.
 *
 * A machine's lifetime is its host's lifetime, and how long that is depends on which host mounted the
 * Controller -- Layout-hosted survives a navigation within its Area, Page-hosted does not
 * ([MODULES.md](../MODULES.md)). A machine that must outlast its host says so here rather than by
 * being registered in the luckier tree.
 *
 * - `none` -- gone on unmount, which is the honest answer for most of them.
 * - `query` -- validated query parameters. What the reset-password and confirm flows use today, what
 *   makes an emailed link resumable, and what costs nothing because it is in the address bar already.
 * - `server` -- the authoritative store behind a `server` authority machine. The binding holds a copy
 *   and re-reads it; it never writes it.
 * - `profile` -- the account-bound store ([design/USER_STATE.md](../design/USER_STATE.md)), under the
 *   key `<ownerModuleId>/<machineKey>`. Only for a signed-in viewer, never readable on Public, one
 *   round trip per checkpoint and one request to resume. A machine that needs every step to survive a
 *   reload wants `query` instead.
 *
 * `localStorage`, `sessionStorage`, a cookie invented for the purpose and a module global are not on
 * this list and are not alternatives to it. The Form draft in `sessionStorage` stays what it is: typed
 * input somebody has not sent, not a position in a flow.
 */
export const PHI_STATE_MACHINE_PERSISTENCE_TARGETS = ["none", "query", "server", "profile"] as const;

export type PhiStateMachinePersistence = (typeof PHI_STATE_MACHINE_PERSISTENCE_TARGETS)[number];

/**
 * Which machine, named the way a route names a Page.
 *
 * `(ownerModuleId, machineKey)`, resolved through the Modules this Area runs -- never a
 * `controller:` address written out. [THIRD_PARTY_MODULES.md](../THIRD_PARTY_MODULES.md) forbids the
 * analogue for routes ("Your own path must not appear anywhere in your Module"), and the reason carries
 * over unchanged: a written-out address breaks quietly the moment the instance is named differently or
 * the owning Module is not active in that Area.
 *
 * The owner is a Module id and not a package name, for the reason the user-state key grammar gives: a
 * package may carry two Modules and a Site may run one of them.
 */
export type PhiStateMachineReference = {
  readonly ownerModuleId: PhiRuntimeModuleId;
  readonly machineKey: string;
};

/**
 * One state, and the two things it may say about itself.
 *
 * A state is a name first. `statements` is what outside readers see (below); `capability` is what the
 * state needs in order to be shown at all -- the vocabulary `capabilitiesByArea` already declares and
 * nothing reads. Naming it here is what lets a Site policy fail closed at resolution, when a machine
 * can reach a state no active provider can present, instead of failing in front of the visitor.
 *
 * There is deliberately no `terminal` flag. A state with no transition out of it is terminal by being
 * one, and a second spelling of that fact is a second thing to keep true.
 */
export type PhiStateMachineState = {
  /** Which of the definition's published statements are true here. Absent means none of them are. */
  readonly statements?: readonly string[];
  /** The presentation capability this state needs a provider for. */
  readonly capability?: string;
};

/**
 * What a transition asks its host to do, once it has been taken.
 *
 * The binding performs none of these. It says what should happen and the host does it, which is the
 * same split `PhiTableBinding` has and the reason a machine can live in a Controller without the
 * Controller's powers leaking into it. A definition that wanted to touch `window`, the router or a
 * gateway could not express it here, which is the point.
 *
 * - `signal` names a `capabilityId` from the host's own `runtimeSignals`, so the address is whatever
 *   the Builder wired that capability to -- and an unwired one is a wiring fault the bus already
 *   reports, not a silent no-op invented here.
 * - `forward` names a Page by preset identity, resolved through the current route table.
 * - `read` re-reads the authoritative state. Only meaningful under `server` authority, where it is how
 *   a transition says "the outcome is whatever Core says next".
 */
export type PhiStateMachineEffect =
  | { readonly kind: "signal"; readonly capabilityId: string }
  | ({ readonly kind: "forward" } & PhiCmsPresetIdentity)
  | { readonly kind: "read" };

/**
 * `(from, event) -> to`, optionally guarded.
 *
 * Keyed flat by transition key rather than nested under `from` and then `event`, because nesting makes
 * the guarded alternative inexpressible -- one event, two targets, decided by a condition. Auth does not
 * need it and the first non-trivial client machine probably will. What the nesting would have enforced
 * is checked instead, by `collectPhiStateMachineDefinitionErrors`.
 *
 * A guard is a `PhiRuntimeConditionExpression`, so a guard and a `visibleWhen` are the same language,
 * evaluated the same way, against the same sources. Nobody has to learn a second one.
 */
export type PhiStateMachineTransition = {
  readonly from: string;
  readonly event: string;
  readonly to: string;
  readonly when?: PhiRuntimeConditionExpression;
  readonly effects?: readonly PhiStateMachineEffect[];
};

type PhiStateMachineDefinitionBase = {
  readonly machineKey: string;
  /**
   * The identity of persisted state, and nothing else.
   *
   * Changing it deliberately makes a different machine: state recorded under an older version is
   * discarded, never migrated. It is not a compatibility promise -- pre-v1 an ABI break is allowed even
   * where a third party reads it, and that package is rebuilt. So there is no version tolerance to
   * negotiate and a reader declares no version it was written against.
   *
   * A machine that must keep history across versions records it as domain data. History is not position.
   */
  readonly version: number;
  readonly persistence: PhiStateMachinePersistence;
  readonly initial: string;
  readonly states: Readonly<Record<string, PhiStateMachineState>>;
  readonly transitions: Readonly<Record<string, PhiStateMachineTransition>>;
  /**
   * The facts this machine publishes about itself, which is the whole of what an outside reader sees.
   *
   * State keys stay internal. A reader asking about them would be guessing at somebody else's field
   * names -- which is what a `controller` condition does today, reading `permissions.readOnly` out of a
   * `Record<string, unknown>`. The distinction already exists among the condition sources: `feature` is
   * what a Module publishes deliberately under a name it keeps, `controller` is whatever somebody
   * happened to report. A machine's published surface is its `feature`.
   *
   * The closed list is what makes it survive a new state. Because a state names the statements true in
   * it, a state added later publishes none of them until its author says otherwise -- so a reader
   * asking "is this complete" gets `false` from a state nobody told it about, rather than a negation
   * over an open set silently becoming wrong. `noStepRunning()` in the login preset is that negation
   * today, and it is why this is not optional.
   */
  readonly statements: readonly string[];
  /**
   * The shape of the `data` a snapshot carries -- not of the snapshot itself.
   *
   * The envelope is identical for every machine: reference, version, state key, statements. What
   * differs is what a state hangs off it, and that is the part a reader has to know in advance and a
   * third party or phi-server can check. The `<package>/signals/<key>` grammar because a snapshot
   * travels as a signal value, and because the user-state `value` shape asks for a schema of exactly
   * that form -- so a `profile` machine names this once and both hold it to it.
   *
   * Required even from a machine that carries no data yet. One that cannot name the shape of what it
   * publishes has not finished deciding what it publishes.
   */
  readonly snapshotSchema: PhiSignalValueSchema;
  /**
   * Which events this machine accepts from outside its owning Module. None unless it says so.
   *
   * Reading is one thing and raising an event in somebody else's machine is another. Server authority
   * softens this only halfway: Core still decides the outcome, but a foreign `enroll` is still an
   * interference.
   */
  readonly acceptsExternalEvents?: readonly string[];
};

/**
 * A machine definition, with `authority` deciding what else it must carry.
 *
 * Under `server` the `reader` is required by the type rather than by a rule somebody has to remember:
 * a projection whose authoritative state cannot be re-read is not a projection, it is a guess that
 * survives until the first reload. The reader is a name the host resolves, on the same terms as a Form
 * handler key -- the definition stays serializable.
 */
export type PhiStateMachineDefinition =
  | (PhiStateMachineDefinitionBase & {
      readonly authority: "server";
      readonly reader: string;
    })
  | (PhiStateMachineDefinitionBase & { readonly authority: "client" });

/**
 * What the machine is doing, as anybody reading it sees it.
 *
 * Readable on demand and not only observable as an event, which is the gap the signal bus leaves: it
 * holds an addressed signal for a receiver that has not mounted, but nothing teaches a late receiver a
 * value it already missed. A mode delivered only as an event has to be repeated on every registration;
 * a snapshot is asked for.
 *
 * `statements` is resolved to every published name with a boolean, not just the true ones, so a reader
 * can tell "false" from "this machine does not publish that at all".
 */
export type PhiStateMachineSnapshot = {
  readonly machine: PhiStateMachineReference;
  readonly version: number;
  readonly state: string;
  readonly statements: Readonly<Record<string, boolean>>;
  readonly data?: Readonly<Record<string, unknown>>;
};

/**
 * A persisted position: where it was, and which machine it belonged to.
 *
 * Stored under `query` or `profile`, and deliberately nothing more than this. Discarding on a version
 * mismatch is what keeps an old position from being read as a current one -- and under `profile`
 * discarding means clearing the key, because that store treats an absent key and a falsy one as
 * different answers.
 */
export type PhiStateMachineCheckpoint = {
  readonly version: number;
  readonly state: string;
};

const PHI_STATE_MACHINE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function isPhiStateMachineAuthority(value: unknown): value is PhiStateMachineAuthority {
  return typeof value === "string" &&
    (PHI_STATE_MACHINE_AUTHORITIES as readonly string[]).includes(value);
}

export function isPhiStateMachinePersistence(value: unknown): value is PhiStateMachinePersistence {
  return typeof value === "string" &&
    (PHI_STATE_MACHINE_PERSISTENCE_TARGETS as readonly string[]).includes(value);
}

/**
 * The user-state key a `profile` machine checkpoints under.
 *
 * Derived rather than declared, because the two parts are already there and a second declaration is a
 * second thing that can disagree. It also lands the key where the store's authorization expects it: the
 * prefix is the owning Module's id, which is the whole of what phi-server checks.
 */
export function createPhiStateMachineUserStateKey(reference: PhiStateMachineReference) {
  return `${reference.ownerModuleId}/${reference.machineKey}` as const;
}

/**
 * Every error a definition can carry, collected rather than thrown one at a time.
 *
 * Collected because a Module author fixing one definition wants the whole list, the way
 * `collectCmsSignalRouteErrors` gives phi-server the whole list of a wiring's faults. The determinism
 * rules are the substance here: they are what the flat transition shape gave up structural enforcement
 * of, and checking them is the price of the guarded alternative being expressible at all.
 */
export function collectPhiStateMachineDefinitionErrors(
  definition: PhiStateMachineDefinition,
): string[] {
  const errors: string[] = [];
  const label = definition.machineKey || "<unnamed machine>";

  if (!PHI_STATE_MACHINE_KEY_PATTERN.test(definition.machineKey)) {
    errors.push(`${label}: machineKey must be lower-case letters, digits and hyphens.`);
  }
  if (!Number.isSafeInteger(definition.version) || definition.version < 1) {
    errors.push(`${label}: version must be a positive integer.`);
  }
  if (!isPhiSignalValueSchemaShape(definition.snapshotSchema)) {
    errors.push(`${label}: snapshotSchema must be "<package>/signals/<key>".`);
  }
  if (definition.authority === "server" && !definition.reader.trim()) {
    errors.push(
      `${label}: a "server" authority machine is a projection and needs a reader. ` +
      "Without one it cannot re-read the state it is showing, which is the whole of what a projection is.",
    );
  }

  const stateKeys = new Set(Object.keys(definition.states));
  if (stateKeys.size === 0) {
    errors.push(`${label}: a machine needs at least one state.`);
  }
  if (!stateKeys.has(definition.initial)) {
    errors.push(`${label}: initial state "${definition.initial}" is not among the declared states.`);
  }

  const statements = new Set(definition.statements);
  for (const [stateKey, state] of Object.entries(definition.states)) {
    for (const statement of state.statements ?? []) {
      if (!statements.has(statement)) {
        errors.push(
          `${label}: state "${stateKey}" publishes "${statement}", which the machine does not declare.`,
        );
      }
    }
  }

  /*
   * Determinism, which the flat shape has to be told rather than shown.
   *
   * Two unguarded transitions out of the same `(from, event)` is a coin toss over which one a reader of
   * the object happens to reach first -- position carries no meaning in these objects, so there is no
   * "first" to appeal to. And a guarded set without an unguarded fallback is a dead end that looks like
   * a transition: the event arrives, every guard refuses, and nothing happens for a reason nobody
   * wrote down.
   */
  const unguarded = new Map<string, number>();
  const guarded = new Map<string, number>();
  const events = new Set<string>();

  for (const [transitionKey, transition] of Object.entries(definition.transitions)) {
    events.add(transition.event);
    if (!stateKeys.has(transition.from)) {
      errors.push(`${label}: transition "${transitionKey}" leaves undeclared state "${transition.from}".`);
    }
    if (!stateKeys.has(transition.to)) {
      errors.push(`${label}: transition "${transitionKey}" targets undeclared state "${transition.to}".`);
    }
    if (!transition.event.trim()) {
      errors.push(`${label}: transition "${transitionKey}" has no event.`);
    }
    const pair = `${transition.from}|${transition.event}`;
    const bucket = transition.when ? guarded : unguarded;
    bucket.set(pair, (bucket.get(pair) ?? 0) + 1);
  }

  for (const [pair, count] of unguarded) {
    if (count > 1) {
      const [from, event] = pair.split("|");
      errors.push(
        `${label}: "${event}" from "${from}" has ${count} unguarded transitions, so which one is taken ` +
        "depends on object order, which carries no meaning here. Guard all but one.",
      );
    }
  }
  for (const pair of guarded.keys()) {
    if (!unguarded.has(pair)) {
      const [from, event] = pair.split("|");
      errors.push(
        `${label}: "${event}" from "${from}" is guarded with no unguarded fallback, so a refusal by ` +
        "every guard is a dead end. Declare the transition that is taken when none of them match.",
      );
    }
  }

  for (const event of definition.acceptsExternalEvents ?? []) {
    if (!events.has(event)) {
      errors.push(
        `${label}: "${event}" is accepted from outside but no transition responds to it.`,
      );
    }
  }

  return errors;
}
