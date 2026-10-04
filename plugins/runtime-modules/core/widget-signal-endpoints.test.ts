import { describe, expect, it } from "vitest";

import { resolvePhiWidgetSignalEndpoints } from "../../../components/widgets/signals/signal-endpoints";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import { PHI_RUNTIME_MODULE_WIDGETS } from "./widgets";

const BLOCK_ID = "EQEXTckA4RzIwceA" as PhiCmsInstanceId;

/*
 * A Widget that names a channel every renderable block already receives is refused
 * (`components/widgets/signals/signal-endpoints.ts`) -- but only once it is placed, so the plugin waits
 * for the first author to put it on a page: the Dimension Control listened on `size/change` for its
 * value, and the wiring options of every page holding one threw. Every Core Widget is resolved here,
 * with the Surface channels too, as a Widget whose slot frame draws its Surface has them.
 */
describe("every Core Widget", () => {
  it.each(PHI_RUNTIME_MODULE_WIDGETS.map((widget) => [widget.definition.typeKey, widget.definition] as const))(
    "%s names no block channel again",
    (_typeKey, definition) => {
      expect(() => resolvePhiWidgetSignalEndpoints({
        blockId: BLOCK_ID,
        runtimeSignals: definition.runtimeSignals,
        surfacePolicy: "frame",
      })).not.toThrow();
    },
  );
});
