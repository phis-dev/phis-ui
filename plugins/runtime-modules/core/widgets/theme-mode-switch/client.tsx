"use client";

import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiThemeModeSwitchWidgetConfig } from "./config";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { usePhiSignalDispatcher } from "../../../../../components/runtime/runtime-signal-bus";
import { createPhiCoreRuntimeControllerAddress } from "../../../../../components/runtime/core-runtime-controller-address";
import { PhiSwitchControl } from "../../../../../components/controls/phi-switch-control";

/**
 * Light or dark, read from the mode that is on screen and written to the one address that owns it.
 *
 * The state is not kept here and not carried in. `usePhiConfig()` is the same context that hands every
 * Widget its tokens, so what this draws cannot disagree with what the page looks like -- a switch that
 * mounts inside an Overlay opened an hour later starts out correct, with nobody having told it.
 *
 * Flipping it is the one thing that is an event, and it is sent as one: to the Core Runtime Controller,
 * in Site scope, which is where the preference is kept for this browser and stored on the account.
 */
export function PhiThemeModeSwitchWidget({
  config,
  disabled,
  readOnly,
  signalsEnabled = true,
}: {
  config?: PhiThemeModeSwitchWidgetConfig | null;
  blockId?: string | number | null;
  disabled?: boolean;
  readOnly?: boolean;
  signalsEnabled?: boolean;
  runtime?: PhiBlockRuntime;
}) {
  const { mode } = usePhiConfig();
  const dispatchSignal = usePhiSignalDispatcher();

  function requestMode(nextChecked: boolean) {
    /*
     * Nothing is set here and nothing waits for an answer. The Controller applies the mode, and this
     * Widget draws whatever `usePhiConfig()` then reports -- so the switch cannot come to rest in a
     * position the Site is not actually in, which is exactly what a local `useState` would allow.
     */
    dispatchSignal({
      scope: "site",
      channel: "themeMode",
      action: "change",
      value: nextChecked,
      valueType: "boolean",
      receiver: createPhiCoreRuntimeControllerAddress(),
    });
  }

  return (
    <PhiSwitchControl
      checked={mode === "dark"}
      disabled={disabled}
      readOnly={readOnly || !signalsEnabled}
      size={config?.controlSize}
      label={config?.label}
      checkedChildren={config?.checkedChildren}
      unCheckedChildren={config?.unCheckedChildren}
      onChange={requestMode}
    />
  );
}
