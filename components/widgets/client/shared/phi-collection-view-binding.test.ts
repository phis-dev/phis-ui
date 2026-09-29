// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PhiCollectionProviderData } from "../../../../types/collection-provider";
import type { PhiCollectionProviderRegistration } from "./phi-collection-provider";

/**
 * The binding a Collection View reads: one object while nothing in it changes, and a list that only
 * the newest request may write.
 */

type Deferred = { resolve: (data: PhiCollectionProviderData) => void };

const pending: { query: Deferred[]; action: Deferred[] } = { query: [], action: [] };

function defer(bucket: Deferred[]) {
  return new Promise<PhiCollectionProviderData>((resolve) => bucket.push({ resolve }));
}

const provider = {
  key: "@phis/test/collection",
  query: () => defer(pending.query),
  action: () => defer(pending.action),
  resources: [{ resourceKey: "items", itemRendererKey: "@phis/test/item" }],
} as unknown as PhiCollectionProviderRegistration;

vi.mock("./phi-collection-provider", () => ({
  usePhiCollectionProvider: () => ({ provider, resource: provider.resources[0], bindingError: null }),
}));

const { usePhiCollectionViewBinding } = await import("./phi-collection-view-binding");

function data(label: string): PhiCollectionProviderData {
  return { items: [{ label }], total: 1, error: null } as unknown as PhiCollectionProviderData;
}

const source = { providerKey: "@phis/test/collection", resourceKey: "items" } as const;

describe("usePhiCollectionViewBinding", () => {
  it("keeps the binding object while nothing in it changes", async () => {
    pending.query.length = 0;
    const { result, rerender } = renderHook(() => usePhiCollectionViewBinding({ source }));
    await waitFor(() => expect(pending.query.length).toBeGreaterThan(0));
    await act(async () => pending.query.at(-1)?.resolve(data("first")));
    const before = result.current.binding;
    rerender();
    expect(result.current.binding).toBe(before);
  });

  it("does not let an older action answer overwrite a newer query", async () => {
    pending.query.length = 0;
    pending.action.length = 0;
    const { result } = renderHook(() => usePhiCollectionViewBinding({ source }));
    await waitFor(() => expect(pending.query.length).toBeGreaterThan(0));
    await act(async () => pending.query.at(-1)?.resolve(data("first")));

    let action: Promise<PhiCollectionProviderData> | undefined;
    act(() => {
      action = result.current.binding.activate({ actionKey: "delete", itemKey: 1 });
    });
    const queriesBefore = pending.query.length;
    act(() => result.current.binding.setQuery((current) => ({ ...current, search: "chair" })));
    await waitFor(() => expect(pending.query.length).toBeGreaterThan(queriesBefore));
    await act(async () => pending.query.at(-1)?.resolve(data("chair")));
    expect(result.current.binding.data?.items).toEqual([{ label: "chair" }]);

    await act(async () => {
      pending.action.at(-1)?.resolve(data("after delete"));
      await action;
    });
    expect(result.current.binding.data?.items).toEqual([{ label: "chair" }]);
  });
});
