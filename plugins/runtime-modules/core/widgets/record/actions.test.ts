// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PhiTableProviderRegistration } from "../../../../../components/widgets/client/shared/phi-table-provider";
import type { PhiRecordWidgetAction } from "../../../../../types/record-widget";
import type {
  PhiTableProviderMutationRequest,
  PhiTableProviderMutationResult,
  PhiTableRowIdentity,
} from "../../../../../types/table-widget";
import { usePhiRecordWidgetActions } from "./actions";

/*
 * Running a Provider action on the record shown (`./actions.ts`): the request the Table's Binding sends,
 * for the identity the record Widget holds, and what it says when the Provider refuses.
 */

const source = { providerKey: "@phis/ui/modules/test/tables/products", resourceKey: "products", params: { site: 3 } } as const;
const resource = {
  resourceKey: "products",
  title: "Products",
  rowIdentityPath: "id",
  fields: [],
  query: {},
  recordRead: true,
  actions: [
    { key: "release", title: "Release", scope: "row", intent: "write", confirmation: "required" },
    { key: "purge", title: "Purge", scope: "selection", intent: "destructive" },
  ],
} as const satisfies PhiTableProviderRegistration["resources"][number];

function setup(input: {
  answer?: (request: PhiTableProviderMutationRequest) => Promise<unknown>;
  actions?: readonly PhiRecordWidgetAction[];
  rowIdentity?: PhiTableRowIdentity | null;
} = {}) {
  const mutate = vi.fn(input.answer ?? (async () => ({ status: "accepted", invalidation: "view" })));
  const provider = {
    key: source.providerKey,
    resources: [resource],
    query: async () => ({ rows: [] }),
    mutate,
  } as unknown as PhiTableProviderRegistration;
  const onAccepted = vi.fn();
  const hook = renderHook(() => usePhiRecordWidgetActions({
    actions: input.actions ?? [{ key: "release", mode: "normal" }],
    provider,
    resource,
    source,
    rowIdentity: input.rowIdentity === undefined ? "@acme/books:pro" : input.rowIdentity,
    onAccepted,
  }));
  return { ...hook, mutate, onAccepted };
}

describe("an action of the record Widget", () => {
  it("asks the Provider for its row action on the record shown, and hands on what it accepted", async () => {
    const { result, mutate, onAccepted } = setup();
    await act(async () => result.current.activate("release", "exchange-1"));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]![0]).toMatchObject({
      kind: "action",
      actionKey: "release",
      rowIdentity: "@acme/books:pro",
      selectedRowIdentities: [],
      query: {},
      resourceKey: "products",
      params: { site: 3 },
    });
    expect(onAccepted).toHaveBeenCalledWith(
      { status: "accepted", invalidation: "view" },
      { key: "release", mode: "normal" },
      "@acme/books:pro",
      "exchange-1",
    );
    expect(result.current.error).toBeNull();
  });

  it("does nothing for a key it does not list, or while no record is shown", async () => {
    const unlisted = setup();
    await act(async () => unlisted.result.current.activate("lock"));
    expect(unlisted.mutate).not.toHaveBeenCalled();
    const empty = setup({ rowIdentity: null });
    await act(async () => empty.result.current.activate("release"));
    expect(empty.mutate).not.toHaveBeenCalled();
  });

  it("says the Provider's refusal above the record, and announces nothing", async () => {
    const { result, onAccepted } = setup({
      answer: async () => ({ status: "rejected", invalidation: "none", errorCode: "conflict", message: "Nothing waits for release." }),
    });
    await act(async () => result.current.activate("release"));
    expect(result.current.error).toBe("Nothing waits for release.");
    expect(onAccepted).not.toHaveBeenCalled();
    // A new record is not told what was said of the last one.
    act(() => result.current.forget());
    expect(result.current.error).toBeNull();
  });

  it("says a failure on the way, and an answer that is no mutation result, the same way", async () => {
    const failing = setup({ answer: async () => { throw new Error("The server is unavailable."); } });
    await act(async () => failing.result.current.activate("release"));
    expect(failing.result.current.error).toBe("The server is unavailable.");
    const garbled = setup({ answer: async () => ({ ok: true }) });
    await act(async () => garbled.result.current.activate("release"));
    expect(garbled.result.current.error).toBe("Table Provider returned an invalid mutation result.");
    expect(garbled.onAccepted).not.toHaveBeenCalled();
  });

  it("refuses an action the resource offers for selections only, before the Provider is asked", async () => {
    const { result, mutate } = setup({ actions: [{ key: "purge", mode: "danger" }] });
    await act(async () => result.current.activate("purge"));
    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Table action "purge" requires selection identity context.');
  });

  it("runs once for two presses while the first is on its way", async () => {
    let settle: (value: unknown) => void = () => undefined;
    const { result, mutate, onAccepted } = setup({ answer: () => new Promise((resolve) => { settle = resolve; }) });
    act(() => result.current.activate("release"));
    act(() => result.current.activate("release"));
    expect(mutate).toHaveBeenCalledTimes(1);
    await act(async () => settle({ status: "accepted", invalidation: "view" } satisfies PhiTableProviderMutationResult));
    expect(onAccepted).toHaveBeenCalledTimes(1);
  });

  it("asks its question first where it states one, and runs only on the answer", async () => {
    const { result, mutate } = setup({
      actions: [{ key: "release", mode: "normal", confirm: { title: "Release the terms of %1?" } }],
    });
    act(() => result.current.activate("release"));
    expect(mutate).not.toHaveBeenCalled();
    const dialog = result.current.confirmDialog as { props: { open?: boolean; title?: unknown } };
    expect(dialog.props.open).toBe(true);
    expect(dialog.props.title).toBe("Release the terms of @acme/books:pro?");
  });
});
