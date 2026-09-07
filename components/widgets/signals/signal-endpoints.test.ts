import { describe, expect, it } from "vitest";

import { PHI_BOOLEAN_CONTROL_SIGNALS, PHI_SELECT_CONTROL_SIGNALS } from "./control-signal-capabilities";
import { PHI_RENDERABLE_BLOCK_RECEIVE_BINDINGS } from "./renderable-block-signal-capabilities";
import { resolvePhiWidgetSignalEndpoints } from "./signal-endpoints";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";

/**
 * What a Widget may say it receives.
 *
 * Every renderable block is given the block channels at its own address, so a plugin that names one
 * of them again describes one endpoint twice. That is refused rather than merged, because the two
 * declarations can drift apart -- a different value type on the second line, and nobody would see
 * which one the wiring UI offered.
 */

const BLOCK_ID = "EQEXTckA4RzIwceA" as PhiCmsInstanceId;

function listensOf(runtimeSignals: Parameters<typeof resolvePhiWidgetSignalEndpoints>[0]["runtimeSignals"]) {
  return resolvePhiWidgetSignalEndpoints({ blockId: BLOCK_ID, runtimeSignals })
    .flatMap((endpoint) => endpoint.listens)
    .map((capability) => `${capability.channel}/${capability.action}:${capability.valueType}`);
}

describe("a Widget endpoint and the channels it inherits", () => {
  it("gives a boolean Control the block's enabled channel exactly once", () => {
    const listens = listensOf(PHI_BOOLEAN_CONTROL_SIGNALS);
    expect(listens.filter((entry) => entry === "enabled/change:boolean")).toHaveLength(1);
  });

  it("gives a select Control the same, without it saying so itself", () => {
    expect(listensOf(PHI_SELECT_CONTROL_SIGNALS).filter((entry) => entry === "enabled/change:boolean"))
      .toHaveLength(1);
  });

  it("names inheritance as the reason when a plugin declares a block channel", () => {
    expect(() => resolvePhiWidgetSignalEndpoints({
      blockId: BLOCK_ID,
      runtimeSignals: { emits: [], listens: [PHI_RENDERABLE_BLOCK_RECEIVE_BINDINGS[2]] },
    })).toThrow(/inherited by every renderable block/);
  });

  it("still calls a plugin's own repetition a duplicate", () => {
    const own = { id: "size", channel: "pagerSize", action: "change", valueType: "number" } as const;
    expect(() => resolvePhiWidgetSignalEndpoints({
      blockId: BLOCK_ID,
      runtimeSignals: { emits: [], listens: [own, own] },
    })).toThrow(/duplicate receiver capability "pagerSize\/change:number"/);
  });
});
