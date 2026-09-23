"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  PHI_AUTH_CONTROLLER_DEFINITION,
  type PhiAuthControllerPreload,
} from "./area-base-controller-definitions";
import { usePhiStateMachineBinding } from "./phi-state-machine-binding";
import { usePhiRuntimeConditionStateResponder } from "./runtime-condition-state-responder";
import {
  PHI_AUTH_MACHINE_DEFINITION,
  PHI_AUTH_MACHINE_REFERENCE,
} from "../../plugins/runtime-modules/auth/machine";
import type { PhiRuntimeControllerPlugin } from "../../types";
import type { PhiAuthWorkflow } from "../../types/auth-manifest";
import {
  createPhiSignalCorrelationId,
  usePhiSignalDispatcher,
  usePhiSignalListener,
} from "./runtime-signal-bus";
import {
  normalizeLoginRedirectTarget,
  resolveSafePostLoginTarget,
} from "../widgets/login-redirect";
import { createPhiRuntimeControllerClient } from "./runtime-controller-client-factory";
import { localizeAreaPath } from "../../helpers/locale";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS, type PhiSignal } from "../../types/signals";
import { createPhiRuntimeFormControllerAddress } from "../forms/runtime-form-controller-address";
import { createPhiCoreRuntimeControllerAddress } from "./core-runtime-controller-address";
import {
  isPhiAuthLoginOverlayArea,
  PHI_AUTH_LOGIN_OVERLAY_IDS,
} from "./auth-overlay-ids";

type PhiAuthControllerRenderArgs = Parameters<NonNullable<
  PhiRuntimeControllerPlugin<Record<string, never>>["renderController"]
>>[0];

/**
 * Whether the provider on a surface can present the state the machine is in.
 *
 * Two declarations that had never met. Each state names the presentation capability it needs, and
 * `authUiProvider.capabilities` names what an Area's provider offers -- of which exactly one value,
 * `primary-login`, was ever read, the other three being vocabulary waiting for a mechanism. This is the
 * mechanism: a state is presentable here or it is not, and the answer comes from the definition rather
 * than from a string written out at the one place that happened to need it.
 *
 * A state naming no capability is presentable anywhere. `complete` is one: there is nothing left to show.
 */
function canPresentPhiAuthState(state: string, capabilities: readonly string[] | undefined) {
  const capability = PHI_AUTH_MACHINE_DEFINITION.states[state]?.capability;
  return !capability || capabilities?.includes(capability) === true;
}

function PhiAuthControllerView({
  address,
  runtime,
  preloadData,
}: Pick<PhiAuthControllerRenderArgs, "address" | "runtime"> & {
  preloadData?: PhiAuthControllerPreload | null;
}) {
  const dispatchSignal = usePhiSignalDispatcher();

  /*
   * Where signing in stands, held here rather than in the Widget that draws the second factor.
   *
   * It used to live in that Widget's `useState`, fed by a field on the login response, so a reload
   * part-way through a factor lost a state Core would still have answered for. The machine is a
   * projection: nothing here computes a next state, and what it shows is what `serverPreload` read.
   */
  const machine = usePhiStateMachineBinding({
    definition: PHI_AUTH_MACHINE_DEFINITION,
    reference: PHI_AUTH_MACHINE_REFERENCE,
  });

  /*
   * The workflow this Controller is currently sure of, from the render and then from the form.
   *
   * Both ends arrive here rather than at the Widget: `serverPreload` brings what Core said while the
   * page rendered, and the login handler's answer arrives on a signal this Controller already listens
   * for. One place that knows, so the Widget that draws the step has one source instead of the
   * `useState` a reload used to empty.
   */
  const [workflow, setWorkflow] = useState<PhiAuthWorkflow | null>(
    preloadData?.unavailable ? null : preloadData?.workflow ?? null,
  );

  /*
   * An unreachable Core leaves the machine alone. `anonymous` would be an assertion about somebody this
   * render could not ask about, and on a Login page that assertion shows the sign-in form to a visitor
   * who is half-way through a second factor.
   */
  const coreUnavailable = preloadData?.unavailable === true;
  const project = machine.project;
  useEffect(() => {
    if (coreUnavailable && !workflow) return;
    const next = workflow?.state ?? "anonymous";

    /*
     * Core decided this state and it is shown either way -- but if no provider here can present it, the
     * visitor is about to see nothing at all and no other line says why.
     *
     * Not deduplicated: a provider that cannot present a state its Site can reach is a configuration
     * fault, so this is rare by definition rather than by suppression. Reported instead of acted on,
     * because forwarding somebody out of a second factor is worse than showing them an empty step.
     */
    if (!canPresentPhiAuthState(next, runtime.authUiProvider?.capabilities)) {
      console.warn(
        `[phi-auth] Signing in reached "${next}", which needs the ` +
        `"${PHI_AUTH_MACHINE_DEFINITION.states[next]?.capability}" capability, and the Auth provider in ` +
        `the "${runtime.area}" Area does not offer it. Nothing will be drawn for this step.`,
      );
    }
    project(next);
  }, [coreUnavailable, project, runtime.area, runtime.authUiProvider, workflow]);

  /*
   * The answer Widgets condition on, and it carries statements rather than the state key. A Widget
   * asking "may somebody start signing in here" gets `false` from a state it has never heard of, which
   * is what a negation over an open set of states could not do.
   */
  usePhiRuntimeConditionStateResponder({
    address,
    scope: "area",
    state: machine.snapshot.statements,
  });
  const pendingOpenRef = useRef<{ correlationId: string; nextPath: string } | null>(null);
  const [openSequence, setOpenSequence] = useState(0);
  const locale = runtime.locale.current;
  const overlayIds = isPhiAuthLoginOverlayArea(runtime.area)
    ? PHI_AUTH_LOGIN_OVERLAY_IDS[runtime.area]
    : null;
  const overlayAddress = useMemo(
    () => overlayIds ? createPhiSignalAddress("cms", overlayIds.overlayLogin) : null,
    [overlayIds],
  );
  const formControllerAddress = useMemo(
    () => overlayIds
      ? createPhiRuntimeFormControllerAddress(`widget-${overlayIds.widgetLogin}`)
      : null,
    [overlayIds],
  );

  const dispatch = useCallback((input: Pick<PhiSignal, "channel" | "action" | "value" | "valueType" | "valueSchema" | "receiver"> & {
    correlationId?: string;
  }) => {
    dispatchSignal({
      scope: "area",
      ...input,
      sender: address,
      correlationId: input.correlationId ?? createPhiSignalCorrelationId(),
      timestamp: Date.now(),
    });
  }, [address, dispatchSignal]);

  const closeOverlay = useCallback((correlationId?: string) => {
    pendingOpenRef.current = null;
    if (overlayAddress) {
      dispatch({
        channel: "dialog",
        action: "close",
        value: null,
        valueType: "none",
        valueSchema: null,
        receiver: overlayAddress,
        correlationId,
      });
    }
  }, [dispatch, overlayAddress]);

  /*
   * Every forward this Controller decides is performed by the runtime, never by this component.
   *
   * It is the one place that refuses a target which is not a path on this Site, and a sign-in is exactly
   * where that matters: the address a visitor arrives with, and the one a server hands back, both end up
   * here.
   */
  const forward = useCallback((path: string, replace = false) => {
    dispatchSignal({
      scope: "site",
      channel: "path",
      action: "activate",
      value: { path, ...(replace ? { replace: true } : {}) },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeNavigation,
      receiver: createPhiCoreRuntimeControllerAddress(),
      sender: address,
      correlationId: createPhiSignalCorrelationId(),
      timestamp: Date.now(),
    });
  }, [address, dispatchSignal]);

  const redirectToPublicLogin = useCallback((target: string) => {
    const loginPath = localizeAreaPath(locale, "public", "/login");
    forward(`${loginPath}?${new URLSearchParams({ next: target }).toString()}`);
  }, [forward, locale]);

  /*
   * What a finished sign-in means, read from the handler's own answer.
   *
   * `complete: false` is not a failure: the account exists and the password was right, and what follows
   * is a second step this Controller has yet to be given a surface for. Until it has one, saying so is
   * better than forwarding somebody into an area they have not finished entering.
   */
  const completeLogin = useCallback(async (payload: Record<string, unknown> | null) => {
    const area = typeof payload?.area === "string" ? payload.area.trim().toLowerCase() : "";
    /*
     * Where they were going before they were asked to sign in, if anywhere.
     *
     * The answer names it when the handler knows it; otherwise it is still in the address, because that
     * is how they arrived here -- `/login?next=…` is what a refused page redirects to. Without this a
     * visitor sent to sign in from somewhere specific lands on the area's front page instead of the page
     * they asked for.
     */
    const next = normalizeLoginRedirectTarget(
      typeof payload?.next === "string" ? payload.next : null,
    ) ?? normalizeLoginRedirectTarget(
      new URLSearchParams(window.location.search).get("next"),
    );
    if (!area) {
      forward(next || "/", true);
      return;
    }
    forward(
      await resolveSafePostLoginTarget(
        next ?? `${window.location.pathname}${window.location.search}`,
        locale,
        area,
      ),
      true,
    );
  }, [forward, locale]);

  /*
   * The workflow handed to whichever step Widget is on screen.
   *
   * Broadcast rather than addressed: the Login preset is built as a Public page and as an Area Overlay
   * with different instance ids, and only one of them exists at a time. A Widget that is not there
   * hears nothing, which is the same as today except that the answer now survives a reload.
   */
  const sendWorkflow = useCallback((
    receiver: PhiSignal["receiver"],
    correlationId?: string,
  ) => {
    dispatch({
      channel: "workflow",
      action: "change",
      value: { workflow },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.authWorkflowState,
      receiver,
      correlationId,
    });
  }, [dispatch, workflow]);

  useEffect(() => {
    sendWorkflow("broadcast");
  }, [sendWorkflow]);

  usePhiSignalListener((signal) => {
    if (
      signal.channel === "submit" &&
      signal.action === "activate" &&
      signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formResult
    ) {
      const result = signal.value as { ok?: boolean; payload?: Record<string, unknown> | null } | null;
      if (result?.ok !== true) return;
      const payload = result.payload ?? null;

      /*
       * Tell the machine an answer is on its way, before handing it one.
       *
       * Not ceremony. The state that follows arrives through `project`, and a projection that changes
       * state with nothing outstanding is reported as divergence -- so without this every sign-in that
       * asks for a second factor would print a console error saying the server contradicted itself.
       * Sending is also what puts the transition table to use: an event from a state that does not
       * answer to it is a fault, and now it is one that says so.
       *
       * Which event it is follows from where the machine stands, because that is what the table
       * distinguishes: primary credentials are answered from `anonymous`, a factor from one of the two
       * states that owe one. The same signal carries both, because the step Widget reports its result
       * the way the Form Widget reports one.
       */
      machine.send(machine.snapshot.state === "anonymous" ? "authenticated" : "factorSettled");

      /*
       * Not finished: a second factor is owed. This used to return and leave the step Widget to work it
       * out from the same signal; now the workflow is taken here, which is what makes this Controller
       * the one place that knows -- and what lets `serverPreload` answer the same question on a reload.
       */
      if (payload?.complete === false) {
        const next = payload.workflow;
        if (next && typeof next === "object" && !Array.isArray(next)) {
          setWorkflow(next as PhiAuthWorkflow);
        }
        return;
      }
      setWorkflow(null);
      closeOverlay(signal.correlationId);
      void completeLogin(payload);
      return;
    }
    /*
     * Dismissed is dismissed: the Page the login was opened over is where the viewer stays.
     *
     * Leaving for the Public `/login` on close is the reauthentication rule (AUTHENTICATION.md section
     * 4), and it is right where it belongs: there the surface behind the modal was rendered under a
     * session that has since expired, so it is masked and inert, and staying would leave somebody
     * looking at a page nothing on it still works. Applied to every close, it answered "not now" with
     * the very form that was just closed -- a guest choosing Login in the Account Widget over a Public
     * Page, then changing their mind, was carried off the Page they were reading.
     *
     * Reauthentication is not wired to this Controller yet. When it is, the caller that opens the
     * modal says why, and this is where the two are told apart -- not in the close itself, which
     * cannot know what it is closing.
     */
    if (
      (signal.channel === "command" || signal.channel === "dialog") &&
      signal.action === "close"
    ) {
      closeOverlay(signal.correlationId);
      return;
    }
    /*
     * A step Widget that mounted late, asking for what it missed. The answer goes back to the asker
     * with the correlation id it was asked with, as every reply on this bus does.
     */
    if (signal.channel === "workflow" && signal.action === "reload" && signal.sender != null) {
      sendWorkflow(signal.sender, signal.correlationId);
      return;
    }
    if (signal.channel !== "command" || signal.action !== "open") return;
    const next = (
      typeof signal.value === "string" ? normalizeLoginRedirectTarget(signal.value) : null
    ) ?? normalizeLoginRedirectTarget(`${window.location.pathname}${window.location.search}`) ?? "/";
    /*
     * Asked of the state signing in starts from rather than of a written-out `"primary-login"`. Same
     * answer today, and it stays the right question if a Site ever opens this modal from somewhere
     * other than the beginning.
     */
    if (
      !overlayAddress ||
      !formControllerAddress ||
      !canPresentPhiAuthState(PHI_AUTH_MACHINE_DEFINITION.initial, runtime.authUiProvider?.capabilities)
    ) {
      redirectToPublicLogin(next);
      return;
    }
    pendingOpenRef.current = { correlationId: signal.correlationId, nextPath: next };
    setOpenSequence((current) => current + 1);
  }, {
    scopes: ["area"],
    channels: ["command", "dialog", "submit", "workflow"],
    actions: ["open", "close", "activate", "reload"],
    receiver: address,
  });

  useEffect(() => {
    const pendingOpen = pendingOpenRef.current;
    if (!pendingOpen || !overlayAddress || !formControllerAddress) return;
    dispatch({
      channel: "values",
      action: "change",
      value: { values: { next: pendingOpen.nextPath } },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      receiver: formControllerAddress,
      correlationId: pendingOpen.correlationId,
    });
    dispatch({
      channel: "dialog",
      action: "activate",
      value: null,
      valueType: "none",
      valueSchema: null,
      receiver: overlayAddress,
      correlationId: pendingOpen.correlationId,
    });
    pendingOpenRef.current = null;
  }, [dispatch, formControllerAddress, openSequence, overlayAddress]);

  return null;
}

const PHI_AUTH_CONTROLLER_CLIENT_PLUGIN = {
  ...PHI_AUTH_CONTROLLER_DEFINITION,
  renderController: ({ address, runtime, preloadData }) => (
    <PhiAuthControllerView
      address={address}
      runtime={runtime}
      preloadData={preloadData}
    />
  ),
} satisfies PhiRuntimeControllerPlugin<Record<string, never>, PhiAuthControllerPreload>;

export const PhiAuthControllerClient = createPhiRuntimeControllerClient(
  PHI_AUTH_CONTROLLER_CLIENT_PLUGIN,
);
