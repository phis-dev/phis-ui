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
   * An unreachable Core leaves the machine alone. `anonymous` would be an assertion about somebody this
   * render could not ask about, and on a Login page that assertion shows the sign-in form to a visitor
   * who is half-way through a second factor.
   */
  const projectedState = preloadData?.unavailable
    ? null
    : preloadData?.workflow?.state ?? "anonymous";
  const project = machine.project;
  useEffect(() => {
    if (projectedState) project(projectedState);
  }, [project, projectedState]);

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
  const canRenderPrimaryLogin = runtime.authUiProvider?.capabilities.includes("primary-login") === true;

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

  usePhiSignalListener((signal) => {
    if (
      signal.channel === "submit" &&
      signal.action === "activate" &&
      signal.valueSchema === PHI_SIGNAL_VALUE_SCHEMAS.formResult
    ) {
      const result = signal.value as { ok?: boolean; payload?: Record<string, unknown> | null } | null;
      if (result?.ok !== true) return;
      const payload = result.payload ?? null;
      if (payload?.complete === false) return;
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
    if (signal.channel !== "command" || signal.action !== "open") return;
    const next = (
      typeof signal.value === "string" ? normalizeLoginRedirectTarget(signal.value) : null
    ) ?? normalizeLoginRedirectTarget(`${window.location.pathname}${window.location.search}`) ?? "/";
    if (
      !overlayAddress ||
      !formControllerAddress ||
      !canRenderPrimaryLogin
    ) {
      redirectToPublicLogin(next);
      return;
    }
    pendingOpenRef.current = { correlationId: signal.correlationId, nextPath: next };
    setOpenSequence((current) => current + 1);
  }, {
    scopes: ["area"],
    channels: ["command", "dialog", "submit"],
    actions: ["open", "close", "activate"],
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
