"use client";

import { useEffect } from "react";

import type { PhiRuntimeControllerPlugin } from "../../../../types";
import { readPhiTableActionSignalValue } from "../../../../types/table-widget";
import { createPhiRuntimeControllerClient } from "../../../../components/runtime/runtime-controller-client-factory";
import { usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import {
  PHI_OBSERVABILITY_RUNTIME_CONTROLLER_DEFINITION,
  type PhiObservabilityControllerConfig,
} from "../controller/definition";
import {
  clearPhiObservabilitySelection,
  setPhiObservabilitySelection,
} from "../controller/state";

type ControllerRenderArgs = Parameters<NonNullable<
  PhiRuntimeControllerPlugin<PhiObservabilityControllerConfig>["renderController"]
>>[0];

function PhiObservabilityControllerView({
  address,
  config,
}: Pick<ControllerRenderArgs, "address" | "config">) {
  useEffect(() => () => clearPhiObservabilitySelection(address), [address]);

  usePhiSignalListener((signal) => {
    if (signal.valueType === "boolean") {
      if (signal.value === false) clearPhiObservabilitySelection(address);
      return;
    }
    const action = readPhiTableActionSignalValue(signal.value);
    if (
      action?.actionKey === config.openActionKey &&
      action.rowIdentity != null
    ) {
      setPhiObservabilitySelection(address, action.rowIdentity);
    }
  }, {
    scopes: ["page"],
    channels: ["action", "state"],
    actions: ["activate", "change"],
    receiver: address,
  });

  return null;
}

export const PHI_OBSERVABILITY_RUNTIME_CONTROLLER_PLUGIN = {
  ...PHI_OBSERVABILITY_RUNTIME_CONTROLLER_DEFINITION,
  renderController: ({ key, address, config }) => (
    <PhiObservabilityControllerView key={key} address={address} config={config} />
  ),
} satisfies PhiRuntimeControllerPlugin<PhiObservabilityControllerConfig>;

export const PhiObservabilityRuntimeControllerClient = createPhiRuntimeControllerClient(
  PHI_OBSERVABILITY_RUNTIME_CONTROLLER_PLUGIN,
);
