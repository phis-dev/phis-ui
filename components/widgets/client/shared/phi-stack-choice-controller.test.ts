// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PhiSignal } from "../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS, createPhiSignalAddress } from "../../../../types/signals";
import { createPhiPresetCmsInstanceId } from "../../../../types/cms-instance-id";

/**
 * Every Stack answers `stackMeta` on the same broadcast. A stack-mode Choice takes the answer of the
 * Stack its own request names, and no other: with two Stacks on a page it showed whichever spoke last.
 */

const listeners: Array<(signal: PhiSignal) => void> = [];

vi.mock("../../../runtime/runtime-signal-bus", () => ({
  usePhiSignalListener: (listener: (signal: PhiSignal) => void) => {
    listeners.push(listener);
  },
}));
vi.mock("./phi-control-signals", () => ({
  usePhiControlSignalController: () => ({
    disabled: false,
    emitCapability: () => undefined,
    emitChange: () => undefined,
    emitFocus: () => undefined,
    emitBlur: () => undefined,
  }),
}));
vi.mock("../../../controls/phi-options-provider", () => ({
  usePhiControlOptionsProvider: () => ({ options: [], value: null }),
}));

const { usePhiStackChoiceController } = await import("./phi-choice-controller");

const stackId = (nodeKey: string) =>
  createPhiPresetCmsInstanceId({ domain: "page", ownerModuleId: "@phis/test/stacks", presetKey: "page", nodeKey });
const OWN_STACK = stackId("own");
const OTHER_STACK = stackId("other");

function stackMeta(stackId: string, label: string, activeSlotIndex: number): PhiSignal {
  return {
    scope: "page",
    channel: "stackMeta",
    action: "change",
    value: { activeSlotIndex, slots: [{ index: 0, key: "a", label, hasContent: true }] },
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.stackMeta,
    sender: createPhiSignalAddress("cms", stackId),
    receiver: "broadcast",
    correlationId: "test",
    timestamp: 0,
  } as unknown as PhiSignal;
}

const config = {
  valueMode: "stack-slot-index",
  value: "0",
  signalRoutes: {
    emits: [{
      routeKey: "request",
      capabilityId: "stackMeta",
      scope: "page",
      channel: "stackMeta",
      action: "activate",
      valueType: "none",
      receiver: createPhiSignalAddress("cms", OWN_STACK),
    }],
    listens: [{
      routeKey: "response",
      capabilityId: "stackMeta",
      scope: "page",
      channel: "stackMeta",
      action: "change",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.stackMeta,
      receiver: "broadcast",
    }],
  },
} as never;

describe("usePhiStackChoiceController", () => {
  it("follows only the Stack its stackMeta request is addressed to", () => {
    listeners.length = 0;
    const { result } = renderHook(() => usePhiStackChoiceController({
      config,
      typeKey: "segmented",
      defaultKey: "choice",
    }));

    act(() => listeners.at(-1)!(stackMeta(OWN_STACK, "Own", 0)));
    expect(result.current.options.map((option) => option.label)).toEqual(["Own"]);

    act(() => listeners.at(-1)!(stackMeta(OTHER_STACK, "Other", 0)));
    expect(result.current.options.map((option) => option.label)).toEqual(["Own"]);
  });
});
