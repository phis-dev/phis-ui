"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { PhiSignal, PhiSignalAddress, PhiSignalRoute, PhiSignalValue } from "../../../../types";
import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import type { PhiCommandButtonConfig } from "../../../../types/core-widget-placements";
import {
  createPhiSignalSubcontrolAddress,
  findPhiSignalRoutesByCapabilityId,
  type PhiSignalRouteSet,
} from "../../../../types/signals";
import { usePhiSignalListener } from "../../../runtime/runtime-signal-bus";
import { usePhiSignalEmitter, usePhiSignalIdentity } from "../../../runtime/runtime-signal-identity";
import { registerPhiSignalInstance } from "../../../runtime/runtime-signal-registry";
import { usePhiSignalRuntimePartition } from "../../../runtime/runtime-signal-partition";
import type { PhiToolbarControlItem } from "../../../controls/phi-toolbar-control";
import type { PhiControlBadgePresentation } from "../../../controls/phi-button-control";
import { resolvePhiButtonVariantType } from "../../config/button-variant";
import type { PhiCommonControlLabels } from "../../label-types/common-controls";
import { resolvePhiCommonControlAction } from "./phi-common-controls";
import { resolvePhiButtonIcon } from "./phi-button-icons";

/*
 * The runtime of a Widget's command buttons: every button registered at its own subcontrol address,
 * what it is told there kept per button, and a press sent along the routes its emits name.
 *
 * The Command Toolbar and the Float Button draw the same buttons differently, and nothing about a button
 * depends on how it is drawn -- so this is theirs together, and each Widget only hands the items it gets
 * back to its Control.
 */

type PhiCommandButtonRuntimeState = {
  enabled?: boolean;
  loading?: boolean;
  visible?: boolean;
  badge?: string | number | null;
  icon?: string | null;
  label?: string | null;
  tooltip?: string | null;
};

function resolveButtonSubcontrolAddress(blockId: PhiCmsInstanceId | null | undefined, key: string): PhiSignalAddress | null {
  return blockId == null ? null : createPhiSignalSubcontrolAddress("cms", blockId, key);
}

function readButtonSignalValue(signal: PhiSignal): string | number | boolean | null {
  if (signal.valueType === "string") {
    return typeof signal.value === "string" ? signal.value : signal.value == null ? "" : String(signal.value);
  }
  if (signal.valueType === "number") {
    return typeof signal.value === "number" && Number.isFinite(signal.value) ? signal.value : null;
  }
  if (signal.valueType === "boolean") {
    return typeof signal.value === "boolean" ? signal.value : null;
  }
  if (signal.valueType === "icon") {
    return typeof signal.value === "string" ? signal.value : null;
  }
  return null;
}

/**
 * The badge a button shows: what a signal last said, else what its config states.
 *
 * A signal switches the badge on by speaking -- the toolbar's buttons had no badge fields, and a count
 * sent to one was the only way it ever had a badge. The stated one is drawn only where its config
 * enables it, as on the Button Widget.
 */
function resolveButtonBadge(
  button: PhiCommandButtonConfig,
  runtimeBadge: string | number | null | undefined,
): PhiControlBadgePresentation | undefined {
  if (runtimeBadge != null) {
    return {
      enabled: true,
      value: runtimeBadge,
      color: button.badgeColor,
      overflowCount: button.badgeOverflowCount,
      showZero: button.badgeShowZero,
    };
  }
  if (button.badgeEnabled !== true) {
    return undefined;
  }
  return {
    enabled: true,
    value: button.badgeText ?? button.badgeCount ?? null,
    color: button.badgeColor,
    overflowCount: button.badgeOverflowCount,
    showZero: button.badgeShowZero,
  };
}

export type PhiCommandButtonsOptions = {
  buttons: readonly PhiCommandButtonConfig[];
  signalRoutes?: PhiSignalRouteSet | null;
  blockId?: PhiCmsInstanceId | null;
  labels?: PhiCommonControlLabels | null;
  disabled?: boolean;
  signalsEnabled?: boolean;
};

export type PhiCommandButtonsResult = {
  items: PhiToolbarControlItem[];
  /** The whole Widget's answer: disabled from outside, or switched off by `enabled/change`. */
  disabled: boolean;
  activate: (buttonKey: string) => void;
};

export function usePhiCommandButtons({
  buttons,
  signalRoutes,
  blockId,
  labels,
  disabled,
  signalsEnabled = true,
}: PhiCommandButtonsOptions): PhiCommandButtonsResult {
  const signalIdentity = usePhiSignalIdentity();
  const signalPartition = usePhiSignalRuntimePartition();
  const emitSignal = usePhiSignalEmitter(null);
  const emitRoutes = useMemo(() => signalRoutes?.emits ?? [], [signalRoutes?.emits]);
  const listenRoutes = useMemo(() => signalRoutes?.listens ?? [], [signalRoutes?.listens]);
  const [commandDisabled, setCommandDisabled] = useState<boolean | null>(null);
  const [buttonStateByKey, setButtonStateByKey] = useState<Record<string, PhiCommandButtonRuntimeState>>({});
  const resolvedDisabled = disabled === true || commandDisabled === true;
  const widgetReceiver = signalIdentity.sender;
  const buttonAddresses = useMemo(
    () => new Map(buttons.map((button) => [button.key, resolveButtonSubcontrolAddress(blockId, button.key)])),
    [blockId, buttons],
  );

  useEffect(() => {
    /*
     * A subcontrol only receives what its address is registered for, in the signal's own scope. The
     * identity context supplies a scope only inside an Overlay, so every toolbar outside one left its
     * buttons unregistered and every signal aimed at them was dropped before delivery -- which is why
     * Undo and Redo stayed clickable on an empty history. The scope a button is addressed in is the one
     * declared by the routes that address it; the identity scope stands in where no route names it.
     */
    const scopeByAddress = new Map<PhiSignalAddress, PhiSignal["scope"]>();
    for (const route of listenRoutes) {
      if (typeof route.receiver !== "string" || route.receiver === "broadcast") continue;
      if (!scopeByAddress.has(route.receiver)) scopeByAddress.set(route.receiver, route.scope);
    }
    const unregister = Array.from(buttonAddresses.values()).flatMap((address) => {
      const scope = address == null ? null : scopeByAddress.get(address) ?? signalIdentity.scope;
      return address == null || !scope
        ? []
        : [registerPhiSignalInstance(signalPartition, {
            address,
            scope,
          })];
    });
    return () => {
      for (const dispose of unregister) dispose();
    };
  }, [buttonAddresses, listenRoutes, signalIdentity.scope, signalPartition]);

  const readButtonKeyFromReceiver = useCallback(
    (receiver: PhiSignal["receiver"]) => {
      if (typeof receiver !== "string") {
        return null;
      }
      for (const [buttonKey, address] of buttonAddresses) {
        if (address === receiver) {
          return buttonKey;
        }
      }
      return null;
    },
    [buttonAddresses],
  );

  function activate(buttonKey: string) {
    if (!signalsEnabled) {
      return;
    }

    const button = buttons.find((candidate) => candidate.key === buttonKey);
    if (!button || button.readOnly) {
      return;
    }

    const sender = buttonAddresses.get(button.key) ?? widgetReceiver;
    for (const buttonEmit of button.emits) {
      for (const route of findPhiSignalRoutesByCapabilityId(emitRoutes, buttonEmit.capabilityId)) {
        if (route.receiver == null || (route.valueType === "json" && !route.valueSchema)) {
          continue;
        }
        emitSignal({
          sender,
          scope: route.scope,
          channel: route.channel,
          action: route.action,
          value: route.valueType === "none" ? null : buttonEmit.value as PhiSignalValue,
          valueType: route.valueType,
          valueSchema: route.valueSchema ?? null,
          receiver: route.receiver,
        });
      }
    }
  }

  const handleSignal = useCallback(
    (signal: PhiSignal) => {
      if (!signalsEnabled || listenRoutes.length === 0) {
        return;
      }

      const route = listenRoutes.find((candidate) =>
        candidate.channel === signal.channel &&
        candidate.action === signal.action &&
        candidate.valueType === signal.valueType &&
        (
          candidate.valueType !== "json" ||
          (candidate.valueSchema != null && candidate.valueSchema === signal.valueSchema)
        ) &&
        candidate.receiver !== null,
      );
      if (!route) {
        return;
      }

      const targetsWidget = signal.receiver === "broadcast" || (widgetReceiver != null && signal.receiver === widgetReceiver);
      const buttonKey = readButtonKeyFromReceiver(signal.receiver);
      if (!targetsWidget && !buttonKey) {
        return;
      }

      /*
       * What the signal sets is the capability its route names, not the channel it came in on: a route
       * chooses its channel freely -- a Save button's `loading` arrives on `pageMetaSubmitting` or
       * `submitting` -- and comparing the channel left every such button without its loading state.
       */
      const capability = route.capabilityId;
      if (targetsWidget) {
        if (capability === "enabled") {
          setCommandDisabled(typeof signal.value === "boolean" ? !signal.value : false);
        }
        return;
      }

      if (!buttonKey) {
        return;
      }

      const value = readButtonSignalValue(signal);
      setButtonStateByKey((current) => {
        const previous = current[buttonKey] ?? {};
        if (capability === "enabled") {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              enabled: typeof value === "boolean" ? value : undefined,
            },
          };
        }
        if (capability === "visibility") {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              visible: typeof value === "boolean" ? value : undefined,
            },
          };
        }
        if (capability === "loading") {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              loading: typeof value === "boolean" ? value : undefined,
            },
          };
        }
        if ((capability === "badgeText" || capability === "badgeCount")) {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              badge: typeof value === "string" || typeof value === "number" ? value : null,
            },
          };
        }
        if (capability === "icon") {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              icon: typeof value === "string" ? value : null,
            },
          };
        }
        if (capability === "label") {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              label: typeof value === "string" ? value : null,
            },
          };
        }
        if (capability === "tooltip") {
          return {
            ...current,
            [buttonKey]: {
              ...previous,
              tooltip: typeof value === "string" && value ? value : null,
            },
          };
        }
        return current;
      });
    },
    [listenRoutes, readButtonKeyFromReceiver, signalsEnabled, widgetReceiver],
  );

  const signalFilter = useMemo(
    () => {
      if (listenRoutes.length === 0) {
        return null;
      }

      const valueSchemas = Array.from(
        new Set(listenRoutes.map((route) => route.valueSchema).filter((schema): schema is NonNullable<PhiSignalRoute["valueSchema"]> => Boolean(schema))),
      );

      return {
        scopes: Array.from(new Set(listenRoutes.map((route) => route.scope))),
        channels: Array.from(new Set(listenRoutes.map((route) => route.channel))),
        ...(valueSchemas.length > 0 ? { valueSchemas } : null),
      };
    },
    [listenRoutes],
  );

  /*
   * The addresses this one listener answers for: the Widget, and every button in it.
   *
   * Registering the buttons as instances was only half of it. A receiver with an instance and no
   * listener counted for it is not wrong, it is "not ready yet", so an addressed signal was held and
   * never delivered -- the Save button in the Page dialog never learned it should read "Create", and
   * Undo never learned it was disabled. Both were sent, both waited.
   */
  const answeredAddresses = useMemo(
    () => [widgetReceiver, ...buttonAddresses.values()]
      .filter((address): address is PhiSignalAddress => typeof address === "string"),
    [buttonAddresses, widgetReceiver],
  );
  usePhiSignalListener(handleSignal, signalFilter, answeredAddresses);

  const items = buttons.map((button): PhiToolbarControlItem => {
    const buttonState = buttonStateByKey[button.key] ?? {};
    /*
     * An action answers for the words and the look; the icon stays the button's to swap, and the
     * tooltip is only ever its own. What a signal says at runtime -- "Create" for "Save", or the step
     * Undo would take back -- still wins.
     */
    const action = resolvePhiCommonControlAction(labels, button.action);
    const resolvedIcon = resolvePhiButtonIcon(buttonState.icon ?? button.icon ?? action?.icon);
    const label = buttonState.label ?? (action ? action.label : button.label) ?? button.key;
    return {
      key: button.key,
      ariaLabel: label || button.tooltip || button.key,
      label,
      tooltip: buttonState.tooltip ?? button.tooltip,
      showLabel: button.display == null ? undefined : button.display !== "icon",
      type: resolvePhiButtonVariantType(action ? action.variant : button.variant) ?? "default",
      danger: action ? action.danger === true : button.danger === true,
      disabled: button.disabled === true || buttonState.enabled === false,
      readOnly: button.readOnly === true,
      loading: buttonState.loading,
      icon: button.display === "label" ? null : resolvedIcon,
      visible: buttonState.visible,
      badge: resolveButtonBadge(button, buttonState.badge),
    };
  });

  return { items, disabled: resolvedDisabled, activate };
}
