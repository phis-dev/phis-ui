"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PHI_AUTH_CONTROLLER_DEFINITION } from "./area-base-controller-definitions";
import type { PhiRuntimeControllerPlugin } from "../../types";
import {
  createPhiSignalCorrelationId,
  usePhiSignalDispatcher,
  usePhiSignalListener,
} from "./runtime-signal-bus";
import { normalizeLoginRedirectTarget } from "../widgets/login-redirect";
import { createPhiRuntimeControllerClient } from "./runtime-controller-client-factory";
import { localizeAreaPath } from "../../helpers/locale";
import { createPhiSignalAddress, PHI_SIGNAL_VALUE_SCHEMAS, type PhiSignal } from "../../types/signals";
import { createPhiRuntimeFormControllerAddress } from "../forms/runtime-form-controller-address";
import { usePhiSignalInstancesReady } from "./runtime-signal-registry";
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
}: Pick<PhiAuthControllerRenderArgs, "address" | "runtime">) {
  const dispatchSignal = usePhiSignalDispatcher();
  const [nextPath, setNextPath] = useState<string | null>(null);
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
  const formWidgetAddress = useMemo(
    () => overlayIds ? createPhiSignalAddress("cms", overlayIds.widgetLogin) : null,
    [overlayIds],
  );
  const receiversReady = usePhiSignalInstancesReady(
    useMemo(
      () => [overlayAddress, formControllerAddress, formWidgetAddress]
        .filter((value): value is NonNullable<typeof value> => value != null),
      [formControllerAddress, formWidgetAddress, overlayAddress],
    ),
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

  const redirectToPublicLogin = useCallback((target: string) => {
    const loginPath = localizeAreaPath(locale, "public", "/login");
    window.location.assign(`${loginPath}?${new URLSearchParams({ next: target }).toString()}`);
  }, [locale]);

  usePhiSignalListener((signal) => {
    if (signal.channel === "command" && signal.action === "close") {
      closeOverlay(signal.correlationId);
      setNextPath(null);
      return;
    }
    if (signal.channel === "dialog" && signal.action === "close") {
      const target = nextPath ?? normalizeLoginRedirectTarget(
        `${window.location.pathname}${window.location.search}`,
      ) ?? "/";
      closeOverlay(signal.correlationId);
      redirectToPublicLogin(target);
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
    setNextPath(next);
    pendingOpenRef.current = { correlationId: signal.correlationId, nextPath: next };
    setOpenSequence((current) => current + 1);
  }, {
    scopes: ["area"],
    channels: ["command", "dialog"],
    actions: ["open", "close"],
    receiver: address,
  });

  useEffect(() => {
    const pendingOpen = pendingOpenRef.current;
    if (!pendingOpen || !receiversReady || !overlayAddress || !formControllerAddress) return;
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
  }, [dispatch, formControllerAddress, openSequence, overlayAddress, receiversReady]);

  return null;
}

const PHI_AUTH_CONTROLLER_CLIENT_PLUGIN = {
  ...PHI_AUTH_CONTROLLER_DEFINITION,
  renderController: ({ address, runtime }) => (
    <PhiAuthControllerView
      address={address}
      runtime={runtime}
    />
  ),
} satisfies PhiRuntimeControllerPlugin<Record<string, never>>;

export const PhiAuthControllerClient = createPhiRuntimeControllerClient(
  PHI_AUTH_CONTROLLER_CLIENT_PLUGIN,
);
