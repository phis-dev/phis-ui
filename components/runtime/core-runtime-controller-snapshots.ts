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
