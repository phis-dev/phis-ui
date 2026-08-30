import type { PhiSignalDispatch } from "../../../components/runtime/runtime-signal-bus";
import { createPhiBuilderControllerAddress } from "./controller/address";

/**
 * The Builder broadcasts the title of the Page being edited, which its own read-only title field
 * listens for through the Page preset's signal route.
 *
 * This lives in the Builder rather than in the shared signal helpers because the Builder is its only
 * sender: a base file that names a Module's Controller address has the dependency the wrong way round.
 */
export function emitPhiPageTitleInputSignal(input: {
  emitSignal: PhiSignalDispatch;
  area?: string | null;
  pageKey?: string | null;
  title: string;
}) {
  input.emitSignal({
    scope: "page",
    channel: "pageTitle",
    action: "change",
    value: input.title,
    valueType: "string",
    sender: createPhiBuilderControllerAddress(),
    receiver: "broadcast",
    timestamp: Date.now(),
  });
}
