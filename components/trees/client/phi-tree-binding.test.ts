// @vitest-environment happy-dom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PhiTreeProviderMutationRequest } from "../../../types/tree-widget";

/**
 * Taking back one failed change, and only that one.
 *
 * The Tree binding used to restore the whole snapshot from before a request when it failed, so a second
 * edit that the Provider accepted in the meantime vanished with the first. What is proven here is that
 * a failure reverts its own field, and that a later edit of the same field supersedes an earlier one.
 */
const pending: { request: PhiTreeProviderMutationRequest; resolve: (value: unknown) => void; reject: (error: unknown) => void }[] = [];

const provider = {
  providerKey: "test-tree",
  resources: [] as unknown[],
  query: vi.fn(async () => ({
    nodes: [
      { id: 1, parentId: null, title: "One", note: "a" },
      { id: 2, parentId: 1, title: "Two", note: "b" },
    ],
  })),
  mutate: vi.fn((request: PhiTreeProviderMutationRequest) => new Promise((resolve, reject) => {
    pending.push({ request, resolve, reject });
  })),
};
const resource = {
  resourceKey: "nodes",
  nodeIdentityPath: "id",
  parentNodeIdentityPath: "parentId",
  fields: [
    { key: "title", type: "string", mutable: true },
    { key: "note", type: "string", mutable: true },
  ],
};
provider.resources.push(resource);
const binding = { provider, resource, bindingError: null };

vi.mock("../../widgets/client/shared/phi-tree-provider", () => ({
  usePhiTreeProvider: () => binding,
}));

const { usePhiTreeBinding } = await import("./phi-tree-binding");

const source = { providerKey: "test-tree", resourceKey: "nodes" };

async function mountTree() {
  pending.length = 0;
  const hook = renderHook(() => usePhiTreeBinding({ source: source as never }));
  await waitFor(() => expect(hook.result.current.nodes).toHaveLength(2));
  return hook;
}

function readNode(nodes: readonly Record<string, unknown>[], id: number) {
  return nodes.find((node) => node.id === id);
}

describe("a failed edit", () => {
  it("takes back its own field and keeps the edit that was accepted meanwhile", async () => {
    const { result } = await mountTree();

    let first!: Promise<unknown>;
    act(() => {
      first = result.current.commitField(1, "title", "Uno").catch((error: unknown) => error);
    });
    act(() => {
      void result.current.commitField(2, "note", "beta");
    });
    expect(pending).toHaveLength(2);

    await act(async () => {
      pending[1]!.resolve({ status: "accepted", invalidation: "none" });
    });
    await act(async () => {
      pending[0]!.reject(new Error("refused"));
      await first;
    });

    expect(readNode(result.current.nodes, 1)?.title).toBe("One");
    expect(readNode(result.current.nodes, 2)?.note).toBe("beta");
  });

  it("does not let an earlier answer for the same field undo a later edit", async () => {
    const { result } = await mountTree();

    let first!: Promise<unknown>;
    act(() => {
      first = result.current.commitField(1, "title", "Uno").catch((error: unknown) => error);
    });
    act(() => {
      void result.current.commitField(1, "title", "Eins");
    });

    await act(async () => {
      pending[0]!.reject(new Error("refused"));
      await first;
    });
    expect(readNode(result.current.nodes, 1)?.title).toBe("Eins");

    await act(async () => {
      pending[1]!.resolve({ status: "accepted", invalidation: "none" });
    });
    expect(readNode(result.current.nodes, 1)?.title).toBe("Eins");
  });

  it("puts a moved node back under its old parent when the move fails", async () => {
    const { result } = await mountTree();

    let move!: Promise<unknown>;
    act(() => {
      move = Promise.resolve(result.current.moveNode({
        movedNodeIdentity: 2,
        targetParentNodeIdentity: null,
        beforeNodeIdentity: 1,
        afterNodeIdentity: null,
      })).catch((error: unknown) => error);
    });
    expect(readNode(result.current.nodes, 2)?.parentId).toBeNull();
    expect(result.current.nodes.map((node) => node.id)).toEqual([2, 1]);

    await act(async () => {
      pending[0]!.reject(new Error("refused"));
      await move;
    });

    expect(readNode(result.current.nodes, 2)?.parentId).toBe(1);
    expect(result.current.nodes.map((node) => node.id)).toEqual([1, 2]);
  });
});
