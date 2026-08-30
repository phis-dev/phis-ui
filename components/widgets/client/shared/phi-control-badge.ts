"use client";

import { useCallback, useMemo, useState } from "react";

import type { PhiSignal, PhiSignalValue } from "../../../../types";
import type { PhiSignalRouteSet } from "../../../../types/signals";
import { usePhiSignalListener } from "../../../runtime/runtime-signal-bus";
import { usePhiSignalIdentity } from "../../../runtime/runtime-signal-identity";
import type { PhiControlBadgeConfig } from "../../config/control-signal-config";

const PHI_CONTROL_BADGE_ROUTE_IDS = new Set([
  "badgeText",
  "badgeCount",
]);

export type PhiControlBadgeState = {
  enabled: boolean;
  visible: boolean;
  value: string | number | null;
  showZero: boolean;
  overflowCount?: number;
  color?: string;
};

export type PhiControlBadgeControllerOptions = {
  config?: PhiControlBadgeConfig | null;
  signalRoutes?: PhiSignalRouteSet | null;
  signalsEnabled?: boolean;
};

type PhiControlBadgeRuntimeState = {
  sourceSignature: string;
  value: string | number | null;
};

function resolveInitialBadgeValue(config: PhiControlBadgeConfig | null | undefined): string | number | null {
  if (typeof config?.badgeText === "string") {
    return config.badgeText;
  }
  if (typeof config?.badgeCount === "number") {
    return config.badgeCount;
  }
  return null;
}

function hasVisibleBadgeValue(value: string | number | null, showZero: boolean) {
  if (value == null) {
    return false;
  }
  if (typeof value === "number") {
    return showZero ? true : value !== 0;
  }
  return value.trim().length > 0;
}

function readBadgeValue(signal: PhiSignal): string | number | null {
  const value: PhiSignalValue = signal.value;
  if (signal.valueType === "string") {
    return typeof value === "string" ? value : value == null ? "" : String(value);
  }
  if (signal.valueType === "number") {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }
  return null;
}

export function usePhiControlBadgeController({
  config,
  signalRoutes = null,
  signalsEnabled = true,
}: PhiControlBadgeControllerOptions): PhiControlBadgeState {
  const signalIdentity = usePhiSignalIdentity();
  const badgeListenRoutes = useMemo(
    () => (signalRoutes?.listens ?? []).filter((route) => PHI_CONTROL_BADGE_ROUTE_IDS.has(route.capabilityId)),
    [signalRoutes?.listens],
  );
  const sourceSignature = `${config?.badgeText ?? ""}\u0000${config?.badgeCount ?? ""}`;
  const [runtimeState, setRuntimeState] = useState<PhiControlBadgeRuntimeState>(() => ({
    sourceSignature,
    value: resolveInitialBadgeValue(config),
  }));
  const badgeValue = runtimeState.sourceSignature === sourceSignature
    ? runtimeState.value
    : resolveInitialBadgeValue(config);
  const badgeEnabled = config?.badgeEnabled === true || badgeListenRoutes.length > 0;
  const showZero = config?.badgeShowZero === true;
  const visible = hasVisibleBadgeValue(badgeValue, showZero);

  const handleSignal = useCallback(
    (signal: PhiSignal) => {
      if (!signalsEnabled || badgeListenRoutes.length === 0) {
        return;
      }

      const route = badgeListenRoutes.find((candidate) =>
        candidate.channel === signal.channel &&
        candidate.action === signal.action &&
        candidate.valueType === signal.valueType &&
        candidate.receiver !== null,
      );
      if (!route) {
        return;
      }

      const targetsCurrentControl =
        signal.receiver === "broadcast" ||
        (signalIdentity.sender != null && signal.receiver === signalIdentity.sender);
      if (!targetsCurrentControl) {
        return;
      }

      if (route.capabilityId === "badgeText" || route.capabilityId === "badgeCount") {
        setRuntimeState({
          sourceSignature,
          value: readBadgeValue(signal),
        });
      }
    },
    [badgeListenRoutes, signalIdentity.sender, signalsEnabled, sourceSignature],
  );

  const signalFilter = useMemo(
    () => {
      if (badgeListenRoutes.length === 0) {
        return null;
      }

      return {
        scopes: Array.from(new Set(badgeListenRoutes.map((route) => route.scope))),
        channels: Array.from(new Set(badgeListenRoutes.map((route) => route.channel))),
      };
    },
    [badgeListenRoutes],
  );

  usePhiSignalListener(handleSignal, signalFilter);

  return {
    enabled: badgeEnabled,
    visible,
    value: badgeValue,
    showZero,
    overflowCount: config?.badgeOverflowCount,
    color: config?.badgeColor,
  };
}
