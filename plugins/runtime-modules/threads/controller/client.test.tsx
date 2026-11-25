// @vitest-environment happy-dom
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import type { PhiSignal } from "../../../../types";
import type { PhiRuntimeControllerPlugin } from "../../../../types";
import { createPhiThreadsControllerAddress } from "../../../../constants/threads-controller-address";
import type { PhiThreadsControllerConfig } from "./definition";

/**
 * A customer file Page's member select answers a user id as text; the Tables take filters, the addresses
 * binding params and the file panel a thread. The Controller translates the one choice into all three.
 */

const listeners: Array<(signal: PhiSignal) => void> = [];
const sent: Array<{ capabilityId: string; value: unknown }> = [];

vi.mock("../../../../components/runtime/runtime-signal-bus", () => ({
  usePhiSignalDispatcher: () => () => undefined,
  usePhiSignalListener: (listener: (signal: PhiSignal) => void) => {
    listeners.push(listener);
  },
}));
vi.mock("../../../../components/runtime/runtime-signal-identity", () => ({
  dispatchPhiSignalCapability: (_dispatch: unknown, _sender: unknown, _routes: unknown, capabilityId: string, value: unknown) => {
    sent.push({ capabilityId, value });
  },
}));
vi.mock("../../../../components/runtime/runtime-condition-state-responder", () => ({
  usePhiRuntimeConditionStateResponder: () => undefined,
}));
vi.mock("../../../../components/runtime/runtime-controller-client-factory", () => ({
  createPhiRuntimeControllerClient: (plugin: unknown) => plugin,
}));
vi.mock("../services/customer-file-read", () => ({
  readPhiCustomerFileThreadId: async () => 77,
}));

const plugin = (await import("./client")).PhiThreadsRuntimeControllerClient as unknown as
  PhiRuntimeControllerPlugin<PhiThreadsControllerConfig>;
const address = createPhiThreadsControllerAddress();

function member(value: string): PhiSignal {
  return {
    originId: "test",
    scope: "page",
    channel: "member",
    action: "change",
    value,
    valueType: "string",
    sender: "cms:AAAAAAAAAAAAAAAA",
    receiver: address,
    correlationId: "test",
    timestamp: 0,
  } as unknown as PhiSignal;
}

describe("the Conversations Controller on a customer file Page", () => {
  it("hands the chosen member to the Tables, the addresses and the file panel, and nobody once cleared", async () => {
    listeners.length = 0;
    sent.length = 0;
    render(plugin.renderController!({ key: "threads", address, config: { signalRoutes: null } } as never) as ReactElement);

    await act(async () => listeners.at(-1)!(member("12")));
    expect(sent).toEqual([
      { capabilityId: "memberFiltersChange", value: { userId: 12 } },
      { capabilityId: "memberParamsChange", value: { params: { userId: 12 } } },
      { capabilityId: "fileThreadChange", value: { threadId: null } },
      { capabilityId: "fileThreadChange", value: { threadId: 77 } },
    ]);

    // The same member again is no new choice.
    sent.length = 0;
    await act(async () => listeners.at(-1)!(member("12")));
    expect(sent).toEqual([]);

    await act(async () => listeners.at(-1)!(member("")));
    expect(sent).toEqual([
      { capabilityId: "memberFiltersChange", value: { userId: null } },
      { capabilityId: "memberParamsChange", value: { params: { userId: null } } },
      { capabilityId: "fileThreadChange", value: { threadId: null } },
    ]);
  });
});
