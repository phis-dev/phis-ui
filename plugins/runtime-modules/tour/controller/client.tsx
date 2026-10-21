"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PhiRuntimeControllerPlugin, PhiSignal, PhiSignalAddress } from "../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import type { PhiResolvedPageTour, PhiTourStepDefinition, PhiTourStepSignal } from "../../../../types/tours";
import type { PhisDeclarableUserStateKey } from "../../../../types/user-state";
import { PhiTourControl, type PhiTourControlStep } from "../../../../components/controls/phi-tour-control";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import { usePhiSignalRuntimePartition } from "../../../../components/runtime/runtime-signal-partition";
import {
  readPhiVisualAnchor,
  waitForPhiVisualAnchor,
  waitForPhiVisualAnchorToSettle,
} from "../../../../components/runtime/runtime-visual-anchors";
import { fetchPhiUserState, writePhiUserState } from "../../../../components/runtime/user-state-client";
import { PHI_TOUR_PROGRESS_USER_STATE_KEY } from "../ids";
import { PHI_TOUR_RUNTIME_CONTROLLER_DEFINITION, type PhiTourControllerConfig } from "./definition";
import {
  readPhiTourProgress,
  recordPhiTourProgress,
  shouldOfferPhiTour,
  type PhiTourProgress,
  type PhiTourProgressStatus,
} from "./progress";

/** How long a step waits for its target before its `ifMissing` decides. */
const TARGET_WAIT_MS = 4000;
/** How long a found target may keep moving before it is pointed at where it stands. */
const TARGET_SETTLE_MS = 1000;

const PROGRESS_DESCRIPTOR = {
  key: PHI_TOUR_PROGRESS_USER_STATE_KEY,
  shape: "value",
  valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tourProgress,
} as const satisfies PhisDeclarableUserStateKey;

/** The Tour on screen: which Tour, the step asked for, and the step presented. */
type PhiTourRun = {
  tour: PhiResolvedPageTour;
  /** The step asked for, by `steps` index. */
  index: number;
  /**
   * The step on screen, `null` before the first one is found. It trails `index` while the next
   * target is waited for: the Tour stays open on the previous step instead of closing in between,
   * because Ant Design re-appends its mask on every reopen and the mask then lands above the panel.
   */
  presented: number | null;
};

const TOUR_LISTEN_FILTER = { scopes: ["area"], channels: ["tour"] } as const;

function PhiTourControllerView({ address, config }: { address: PhiSignalAddress; config: PhiTourControllerConfig }) {
  const partition = usePhiSignalRuntimePartition();
  const dispatchSignal = usePhiSignalDispatcher();
  const tour = config.pageTour;
  const [storedRun, setRun] = useState<PhiTourRun | null>(null);
  // A Tour still running from the previous Page ends with it, unrecorded: it is not this Page's.
  const run = storedRun && storedRun.tour.id === tour?.id ? storedRun : null;
  /*
   * The viewer's progress as last read or written: `undefined` while unread, `null` where there is no
   * account to keep it on. A first visit is offered only where this answered -- a Tour that opens by
   * itself on every visit because nothing could be remembered is worse than none.
   */
  const progressRef = useRef<PhiTourProgress | null | undefined>(undefined);
  /*
   * The Tour already offered on this Page. The config arrives as a new object on every render of the
   * Area, so the offer is keyed by the Tour's id, not by the object -- otherwise it restarts each time.
   */
  const offeredRef = useRef<string | null>(null);
  const available = tour != null;

  const announce = useCallback((correlationId?: string) => {
    dispatchSignal({
      scope: "area",
      channel: "tour",
      action: "change",
      value: { available },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tourAvailability,
      sender: address,
      receiver: "broadcast",
      ...(correlationId ? { correlationId } : {}),
    });
  }, [address, available, dispatchSignal]);

  const record = useCallback((finished: PhiResolvedPageTour, status: PhiTourProgressStatus) => {
    if (progressRef.current === null) return;
    const next = recordPhiTourProgress(progressRef.current ?? null, finished, status);
    progressRef.current = next;
    // Remembering is a convenience; a write that fails costs a second offer, not the Tour.
    void writePhiUserState({ descriptor: PROGRESS_DESCRIPTOR, value: next }).catch(() => undefined);
  }, []);

  const start = useCallback((startTour: PhiResolvedPageTour) => {
    setRun({ tour: startTour, index: 0, presented: null });
  }, []);

  /*
   * A Page with a Tour, a Page without, another Page with another one: the availability is said again,
   * and a first visit is offered once progress has been read.
   */
  useEffect(() => {
    announce();
  }, [announce]);
  useEffect(() => {
    if (!tour) {
      offeredRef.current = null;
      return undefined;
    }
    if (offeredRef.current === tour.id) return undefined;

    const abort = new AbortController();
    const offer = () => {
      offeredRef.current = tour.id;
      if (progressRef.current !== null && shouldOfferPhiTour(progressRef.current ?? null, tour)) {
        start(tour);
      }
    };
    if (progressRef.current !== undefined) {
      offer();
      return undefined;
    }
    fetchPhiUserState(abort.signal)
      .then((state) => {
        progressRef.current = readPhiTourProgress(state[PHI_TOUR_PROGRESS_USER_STATE_KEY]);
        offer();
      })
      .catch(() => {
        if (!abort.signal.aborted) progressRef.current = null;
      });
    return () => abort.abort();
  }, [start, tour]);

  usePhiSignalListener(useCallback((signal: PhiSignal) => {
    if (signal.receiver !== address) return;
    if (signal.action === "reload") {
      announce(signal.correlationId);
      return;
    }
    if (signal.action === "open" && tour) {
      start(tour);
    }
  }, [address, announce, start, tour]), useMemo(() => ({ ...TOUR_LISTEN_FILTER, receiver: address }), [address]));

  /*
   * The shown step's target, waited for before the step is presented. Not found in time, the step's
   * `ifMissing` decides: passed over, or the Tour ends. It is never presented centered instead, and
   * never pointed at anything but its own address in this partition.
   */
  const step: PhiTourStepDefinition | null = run ? run.tour.steps[run.index] ?? null : null;

  const send = useCallback((signals: readonly PhiTourStepSignal[] | undefined) => {
    for (const signal of signals ?? []) {
      dispatchSignal({
        scope: "area",
        channel: signal.channel,
        action: signal.action,
        value: signal.value ?? null,
        valueType: signal.valueType,
        ...(signal.valueSchema ? { valueSchema: signal.valueSchema } : {}),
        sender: address,
        receiver: signal.receiver,
      });
    }
  }, [address, dispatchSignal]);
  /*
   * The step asked for gets its `prepare` before its target is waited for, and its `release` the moment it
   * is no longer the one asked for -- the next step, a step passed over, the Tour closed or finished, the
   * Page left. One effect per step, so every prepare is answered by exactly one release.
   */
  useEffect(() => {
    if (!step) return undefined;
    send(step.prepare);
    return () => send(step.release);
  }, [send, step]);
  // A step centered on purpose has nothing to wait for.
  const presented = run && step?.target == null ? run.index : run?.presented ?? null;
  useEffect(() => {
    if (!run || run.presented === run.index || !step?.target) return undefined;
    const abort = new AbortController();
    void waitForPhiVisualAnchor(partition, step.target, { timeoutMs: TARGET_WAIT_MS, signal: abort.signal })
      .then(async (element) => {
        if (abort.signal.aborted) return;
        if (element) {
          // Pointed at once it stands still: a target a `prepare` just opened is often still moving in.
          await waitForPhiVisualAnchorToSettle(element, { timeoutMs: TARGET_SETTLE_MS, signal: abort.signal });
          if (abort.signal.aborted) return;
          setRun({ ...run, presented: run.index });
          return;
        }
        const next = run.index + 1;
        setRun(step.ifMissing === "stop" || next >= run.tour.steps.length
          ? null
          : { ...run, index: next });
      });
    return () => abort.abort();
  }, [partition, run, step]);

  const steps = useMemo<PhiTourControlStep[]>(() => (run?.tour.steps ?? []).map((definition) => ({
    key: definition.key,
    title: definition.title,
    description: definition.description,
    target: definition.target
      ? () => readPhiVisualAnchor(partition, definition.target!)
      : null,
    placement: definition.placement,
  })), [partition, run?.tour.steps]);

  if (!run) return null;

  return (
    <PhiTourControl
      open={presented != null}
      current={presented ?? 0}
      steps={steps}
      labels={run.tour.labels}
      onStepChange={(index) => setRun({ ...run, index, presented })}
      onClose={() => {
        record(run.tour, "dismissed");
        setRun(null);
      }}
      onFinish={() => {
        record(run.tour, "completed");
        setRun(null);
      }}
    />
  );
}

export const PHI_TOUR_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_TOUR_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ key, address, config }) =>
    <PhiTourControllerView key={key} address={address} config={config} />,
} satisfies PhiRuntimeControllerPlugin<PhiTourControllerConfig>;

export const PhiTourRuntimeControllerClient = createPhiRuntimeControllerClient(PHI_TOUR_RUNTIME_CONTROLLER_PLUGIN);
