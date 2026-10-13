"use client";

import type { PhiThemeModeSwitchWidgetConfig } from "./config";
import type { PhiThemeModeSwitchWidgetLabels } from "../../../../../components/widgets/label-types/theme-mode-switch";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { usePhiSignalDispatcher } from "../../../../../components/runtime/runtime-signal-bus";
import { createPhiCoreRuntimeControllerAddress } from "../../../../../components/runtime/core-runtime-controller-address";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiIcon } from "../../../../../components/shell/phi-icon";

/**
 * Light or dark, read from the mode that is on screen and written to the one address that owns it.
 *
 * A sun or a moon on a round button, and nothing else. It used to be the generic Switch with a label,
 * which brought a form field's whole frame -- label, name, hover text, tooltip -- onto every page that
 * has a header. The button shows the mode the page is in; its accessible name says what pressing it does.
 *
 * The state is not kept here and not carried in. `usePhiConfig()` is the same context that hands every
 * Widget its tokens, so what this draws cannot disagree with what the page looks like -- a button that
 * mounts inside an Overlay opened an hour later starts out correct, with nobody having told it.
 *
 * Pressing it is the one thing that is an event, and it is sent as one: to the Core Runtime Controller,
 * in Site scope, which is where the preference is kept for this browser and stored on the account.
 */
export function PhiThemeModeSwitchWidget({
  config,
  labels,
  disabled,
  readOnly,
  signalsEnabled = true,
}: {
  config?: PhiThemeModeSwitchWidgetConfig | null;
  labels: PhiThemeModeSwitchWidgetLabels;
  blockId?: string | number | null;
  disabled?: boolean;
  readOnly?: boolean;
  signalsEnabled?: boolean;
}) {
  const { mode } = usePhiConfig();
  const dispatchSignal = usePhiSignalDispatcher();
  const dark = mode === "dark";

  function requestMode() {
    /*
     * Nothing is set here and nothing waits for an answer. The Controller applies the mode, and this
     * Widget draws whatever `usePhiConfig()` then reports -- so the button cannot come to rest showing
     * a mode the Site is not actually in, which is exactly what a local `useState` would allow.
     */
    dispatchSignal({
      scope: "site",
      channel: "themeMode",
      action: "change",
      value: !dark,
      valueType: "boolean",
      receiver: createPhiCoreRuntimeControllerAddress(),
    });
  }

  return (
    <PhiButtonControl
      type="text"
      shape="circle"
      size={config?.controlSize}
      icon={<PhiIcon name={dark ? "moon" : "sun"} size="inherit" />}
      ariaLabel={dark ? labels.switchToLight : labels.switchToDark}
      disabled={disabled}
      readOnly={readOnly || !signalsEnabled}
      onClick={requestMode}
    />
  );
}
