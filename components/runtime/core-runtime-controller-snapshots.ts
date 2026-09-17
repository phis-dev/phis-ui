import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../types/signals";
import type { PhiCoreRuntimePageSnapshot } from "../../types/core-runtime-controller";
import type { PhiSignalDispatch } from "./runtime-signal-bus";
import { createPhiCoreRuntimeControllerAddress } from "./core-runtime-controller-address";

export function emitPhiCoreRuntimePageSnapshot(input: {
  emitSignal: PhiSignalDispatch;
  snapshot: PhiCoreRuntimePageSnapshot;
}) {
  input.emitSignal({
    scope: "page",
    channel: "pageMeta",
    action: "change",
    value: input.snapshot,
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.pageMeta,
    sender: createPhiCoreRuntimeControllerAddress(),
    receiver: "broadcast",
  });
}

/**
 * The mode on screen, told to everyone. A broadcast rather than a route, like the page snapshot: the
 * Controller does not know which Controls show the mode, and each of them says it listens.
 */
export function emitPhiCoreRuntimeThemeMode(input: {
  emitSignal: PhiSignalDispatch;
  mode: "light" | "dark";
}) {
  input.emitSignal({
    // Page scope, like the page snapshot: the Site scope admits nothing addressed to everyone.
    scope: "page",
    channel: "themeMode",
    action: "change",
    value: input.mode === "dark",
    valueType: "boolean",
    sender: createPhiCoreRuntimeControllerAddress(),
    receiver: "broadcast",
  });
}
