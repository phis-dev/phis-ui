"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  isPhiStateMachineState,
  readPhiStateMachineCheckpoint,
  readPhiStateMachineSnapshot,
  resolvePhiStateMachineTransition,
  restorePhiStateMachineState,
} from "../../helpers/state-machine-binding";
import {
  reportPhiStateMachineDivergence,
  reportPhiStateMachineMisuse,
  reportPhiStateMachineRefusal,
} from "../../helpers/state-machine-diagnostics";
import type { PhiRuntimeConditionSourceValues } from "../../types/runtime-condition";
import type {
  PhiStateMachineCheckpoint,
  PhiStateMachineDefinition,
  PhiStateMachineEffect,
  PhiStateMachineReference,
  PhiStateMachineSnapshot,
} from "../../types/state-machine";

/**
 * A machine, held by whoever hosts it, performing nothing.
 *
 * The binding decides what should happen; the host is what does it. It never dispatches a signal, asks
 * the Core Runtime Controller for a forward, calls a gateway, writes a checkpoint or touches `window` --
 * those come back as effects for the host, which is what lets a machine live inside a Controller without
 * the Controller's powers leaking into a definition a third party wrote. It is the split
 * `PhiTableBinding` already has.
 *
 * A Widget never holds one. [SIGNALS.md](../../SIGNALS.md) says listen routes update local state only
 * and never emit another signal implicitly; a machine in a Widget would break that on every transition
 * that has an effect. Keeping it in the Controller is what keeps that rule true.
 *
 * What it decides lives in `helpers/state-machine-binding.ts` and what it says out loud in
 * `helpers/state-machine-diagnostics.ts`. That is the split `helpers/table-binding.ts` already has
 * beside `phi-table-binding.ts`: which transition an event takes and whether a fault is worth printing
 * are decisions about a definition, not about a component, and they are the same decisions whether or
 * not React is in the room. What is left here is the part that genuinely needs one -- where the machine
 * currently is, and who gets re-rendered when it moves.
 */

/**
 * Where the machine is, kept twice for two readers.
 *
 * Rendering needs it in React state, so a change re-runs what shows it. `send` needs it synchronously,
 * because two sends in one tick have to see each other -- a Controller answering an event by raising the
 * next one is ordinary -- and state read back in the same tick would still be the old value. Both hold
 * the same object; the ref is written first and read only from callbacks.
 */
type PhiStateMachinePosition = {
  readonly state: string;
  readonly data?: Readonly<Record<string, unknown>>;
};

export type PhiStateMachineSendResult = {
  /** Whether the machine moved. Under `server` authority this is always false: Core decides. */
  readonly taken: boolean;
  readonly effects: readonly PhiStateMachineEffect[];
  /** The position for the host to keep, or null when this machine keeps none. */
  readonly checkpoint: PhiStateMachineCheckpoint | null;
  readonly snapshot: PhiStateMachineSnapshot;
};

export type UsePhiStateMachineBindingOptions = {
  readonly definition: PhiStateMachineDefinition;
  readonly reference: PhiStateMachineReference;
  /**
   * A position the host read back, from the query string or the account-bound store.
   *
   * Used only for the state the machine starts in, and discarded without complaint when its version no
   * longer matches -- that is what the version is for.
   */
  readonly restored?: PhiStateMachineCheckpoint | null;
};

export type PhiStateMachineBinding = {
  readonly snapshot: PhiStateMachineSnapshot;
  /**
   * Raise an event. Returns what the host should do about it.
   *
   * `sources` are the condition sources the guards read, and they are passed per call rather than held,
   * because a guard evaluated against sources from the last render is the quiet mistake this whole
   * mechanism exists to avoid. A machine without guards can leave them out.
   */
  readonly send: (event: string, sources?: PhiRuntimeConditionSourceValues) => PhiStateMachineSendResult;
  /**
   * Hand the machine what the authoritative reader answered. `server` authority only.
   *
   * This is the only way a projection's state changes. There is no local transition function to call
   * instead, which is the structural part of `authority`: a third party cannot rebuild a security state
   * machine in the browser because this package gives them nowhere to write one.
   */
  readonly project: (state: string, data?: Readonly<Record<string, unknown>>) => void;
};

export function usePhiStateMachineBinding({
  definition,
  reference,
  restored,
}: UsePhiStateMachineBindingOptions): PhiStateMachineBinding {
  const initial = restorePhiStateMachineState(definition, restored) ?? definition.initial;
  const [rendered, setRendered] = useState<PhiStateMachinePosition>({ state: initial });
  const positionRef = useRef(rendered);

  /*
   * Whether an answer is owed, which is what separates progress from divergence.
   *
   * A projection changing state is the ordinary case -- that is what a projection does -- so a report
   * on every change would be noise, and noise is how the one that matters gets missed. What is
   * surprising is a re-read that disagrees with what was on screen while nothing was asked: another tab
   * finished the flow, a Session expired underneath, or an effect reported a transition the server
   * never made. Sending sets this; projecting clears it.
   *
   * It starts owed for a projection, and that is not a convenience. A projection's first state always
   * arrives unasked -- the host mounts, reads, and hands over whatever Core said -- so treating that as
   * a contradiction would put a line in the console on every single sign-in, which is how the one line
   * that means something stops being read. The machine has shown nothing yet; there is nothing for an
   * answer to contradict.
   */
  const awaitingAnswer = useRef(definition.authority === "server");

  /*
   * Rendered from the state and never from the ref.
   *
   * The two hold the same position for different readers, and reading the ref here would be a real bug
   * rather than a lint rule being strict: this memo is keyed on `rendered`, so a projection that brought
   * new data for the state the machine was already in would have left the old data on screen. The state
   * is the one that makes React re-run this.
   */
  const snapshot = useMemo(
    () => readPhiStateMachineSnapshot(definition, reference, rendered.state, rendered.data),
    [definition, reference, rendered],
  );

  const send = useCallback((event: string, sources: PhiRuntimeConditionSourceValues = {}) => {
    const { state: from, data } = positionRef.current;

    /*
     * Under server authority an event is a request and never a transition.
     *
     * The effects still go out -- that is how the request reaches Core -- but nothing here moves, and
     * the next state arrives through `project`. A binding that guessed the outcome and corrected itself
     * afterwards would be showing a state no server ever said.
     */
    if (definition.authority === "server") {
      const resolution = resolvePhiStateMachineTransition(definition, from, event, sources);
      if (!resolution.taken) {
        reportPhiStateMachineRefusal(reference, resolution.refusal, from, event);
        return {
          taken: false,
          effects: [],
          checkpoint: null,
          snapshot: readPhiStateMachineSnapshot(definition, reference, from, data),
        } as const;
      }
      awaitingAnswer.current = true;
      return {
        taken: false,
        effects: resolution.transition.effects ?? [],
        checkpoint: null,
        snapshot: readPhiStateMachineSnapshot(definition, reference, from, data),
      } as const;
    }

    const resolution = resolvePhiStateMachineTransition(definition, from, event, sources);
    if (!resolution.taken) {
      reportPhiStateMachineRefusal(reference, resolution.refusal, from, event);
      return {
        taken: false,
        effects: [],
        checkpoint: null,
        snapshot: readPhiStateMachineSnapshot(definition, reference, from, data),
      } as const;
    }

    const to = resolution.transition.to;
    const effects = resolution.transition.effects ?? [];

    /*
     * A transition onto the state the machine is already in reports nothing and keeps nothing.
     *
     * Its effects still run, because a transition that asks for something is asking whether or not the
     * name of the state changes. What is suppressed is the render and the checkpoint: a position that
     * did not move is not worth a round trip, and a change signal for a state nobody left is the kind
     * of no-op that ends up in a loop.
     */
    if (to === from) {
      return {
        taken: true,
        effects,
        checkpoint: null,
        snapshot: readPhiStateMachineSnapshot(definition, reference, from, data),
      } as const;
    }

    /*
     * A new state arrives without the old one's data, which is why this replaces rather than merges.
     * The data is the state's, not the machine's -- carrying it forward would let a Widget read a
     * factor's method key while the machine is back at the beginning.
     */
    const next: PhiStateMachinePosition = { state: to };
    positionRef.current = next;
    setRendered(next);
    return {
      taken: true,
      effects,
      checkpoint: readPhiStateMachineCheckpoint(definition, to),
      snapshot: readPhiStateMachineSnapshot(definition, reference, to),
    } as const;
  }, [definition, reference]);

  const project = useCallback((state: string, data?: Readonly<Record<string, unknown>>) => {
    if (definition.authority !== "server") {
      reportPhiStateMachineMisuse(
        reference,
        `a state was pushed into a "client" authority machine, which owns its own. Send an event instead.`,
      );
      return;
    }
    if (!isPhiStateMachineState(definition, state)) {
      reportPhiStateMachineRefusal(reference, "unknown-state", state, "<projected>");
      return;
    }
    if (
      process.env.NODE_ENV !== "production" &&
      !awaitingAnswer.current &&
      positionRef.current.state !== state
    ) {
      reportPhiStateMachineDivergence(reference, positionRef.current.state, state);
    }
    awaitingAnswer.current = false;
    const next: PhiStateMachinePosition = { state, ...(data ? { data } : {}) };
    positionRef.current = next;
    setRendered(next);
  }, [definition, reference]);

  return { snapshot, send, project };
}
