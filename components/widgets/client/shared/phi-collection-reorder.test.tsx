// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PhiCollectionProviderData, PhiCollectionViewBindingModel } from "../../../../types/collection-provider";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../types/collection-view-widget";
import { PHI_COLLECTION_VIEW_WIDGET_DEFAULT_LABELS } from "../../label-types/collection-view";
import {
  orderPhiCollectionItems,
  resolvePhiCollectionReorderKeys,
  usePhiCollectionReorderBinding,
} from "./phi-collection-reorder";

/**
 * Drag reordering in a Collection View: offered only where a drop can name the whole collection's
 * order, shown at once, written through the Provider's action with every key, and taken back where the
 * Provider refuses.
 */

function config(overrides: {
  reorder?: PhiCmsCollectionViewWidgetConfig["features"]["reorder"];
  mode?: PhiCmsCollectionViewWidgetConfig["presentation"]["mode"];
  initialFilters?: Record<string, string>;
} = {}): PhiCmsCollectionViewWidgetConfig {
  return {
    presentation: { mode: overrides.mode ?? "grid" },
    features: {
      tools: { mode: "self-contained" },
      ...("reorder" in overrides ? { reorder: overrides.reorder } : { reorder: { enabled: true } }),
    },
    initialQuery: overrides.initialFilters ? { filters: overrides.initialFilters } : undefined,
    source: { providerKey: "@phis/test/collection", resourceKey: "items" },
  } as PhiCmsCollectionViewWidgetConfig;
}

const items = [{ id: 1, name: "a" }, { id: 2, name: "b" }, { id: 3, name: "c" }];
const data = (list: Record<string, unknown>[] = items, total = list.length): PhiCollectionProviderData =>
  ({ resourceKey: "items", items: list, total, loading: false, error: null });

describe("where reordering is offered", () => {
  const resolve = (overrides: Partial<Parameters<typeof resolvePhiCollectionReorderKeys>[0]> = {}) =>
    resolvePhiCollectionReorderKeys({ config: config(), query: { page: 1, pageSize: 20, filters: {} }, data: data(), itemIdentityPath: "id", ...overrides });

  it("answers the keys in the order shown", () => {
    expect(resolve()).toEqual([1, 2, 3]);
    expect(resolve({ config: config({ mode: "stack" }) })).toEqual([1, 2, 3]);
  });

  it("is off unless enabled, and in masonry", () => {
    expect(resolve({ config: config({ reorder: undefined }) })).toBeNull();
    expect(resolve({ config: config({ reorder: { enabled: false } }) })).toBeNull();
    expect(resolve({ config: config({ mode: "masonry" }) })).toBeNull();
  });

  it("is off while a search or a filter of the reader's narrows the list, not for the Widget's own", () => {
    expect(resolve({ query: { search: "lake" } })).toBeNull();
    expect(resolve({ query: { search: "  " } })).toEqual([1, 2, 3]);
    expect(resolve({ query: { filters: { kind: "image" } } })).toBeNull();
    expect(resolve({ query: { filters: { kind: "", tags: [] } } })).toEqual([1, 2, 3]);
    expect(resolve({ config: config({ initialFilters: { kind: "image" } }), query: { filters: { kind: "image" } } }))
      .toEqual([1, 2, 3]);
  });

  it("is off where the collection goes on beyond the page, or an item has no key of its own", () => {
    expect(resolve({ data: data(items, 4) })).toBeNull();
    expect(resolve({ data: data([{ id: 1 }, { name: "x" }]) })).toBeNull();
    expect(resolve({ data: data([{ id: 1 }, { id: 1 }]) })).toBeNull();
    expect(resolve({ data: null })).toBeNull();
  });
});

describe("orderPhiCollectionItems", () => {
  it("follows the keys, and keeps an item they do not name at the end", () => {
    const ordered = orderPhiCollectionItems([...items, { id: 4, name: "d" }], ["3", 1, 2], (item) => item.id);
    expect(ordered.map((item) => item.id)).toEqual([3, 1, 2, 4]);
  });
});

describe("a drop", () => {
  function setup(action: () => Promise<PhiCollectionProviderData>, loading = false) {
    const activate = vi.fn(action);
    const reload = vi.fn();
    const showMessage = vi.fn();
    const binding = {
      query: { page: 1, pageSize: 20, filters: {} },
      data: data(),
      loading,
      error: null,
      openPanelKey: null,
      setQuery: vi.fn(),
      setOpenPanelKey: vi.fn(),
      reload,
      activate,
    } as unknown as PhiCollectionViewBindingModel;
    const hook = renderHook(() => usePhiCollectionReorderBinding({
      config: config({ reorder: { enabled: true, actionKey: "sort" } }),
      binding,
      itemIdentityPath: "id",
      labels: PHI_COLLECTION_VIEW_WIDGET_DEFAULT_LABELS,
      showMessage,
    }));
    return { ...hook, activate, reload, showMessage };
  }

  it("shows the new order at once and sends every key with the Widget's action", async () => {
    let answer: (value: PhiCollectionProviderData) => void = () => {};
    const { result, activate } = setup(() => new Promise((resolve) => { answer = resolve; }));
    expect(result.current.reorder?.itemKeys).toEqual([1, 2, 3]);
    act(() => result.current.reorder!.onReorder([3, 1, 2]));
    expect(activate).toHaveBeenCalledWith({ actionKey: "sort", itemKeys: [3, 1, 2] });
    expect(result.current.binding.data?.items.map((item) => item.id)).toEqual([3, 1, 2]);
    expect(result.current.reorder).toMatchObject({ itemKeys: [3, 1, 2], disabled: true });
    await act(async () => { answer(data([items[2]!, items[0]!, items[1]!])); });
    expect(result.current.reorder?.disabled).toBe(false);
  });

  it("takes the order back, reads again and says the Provider's words where it refuses", async () => {
    const { result, reload, showMessage } = setup(async () => { throw new Error("Locked."); });
    await act(async () => { result.current.reorder!.onReorder([2, 1, 3]); });
    expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ level: "error", content: "Locked." }));
    expect(reload).toHaveBeenCalled();
    expect(result.current.binding.data?.items.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("says its own words for a refusal that has none", async () => {
    const { result, showMessage } = setup(async () => ({ ...data(), error: "" }) as never);
    await act(async () => { result.current.reorder!.onReorder([2, 1, 3]); });
    expect(showMessage).not.toHaveBeenCalled();
    const refused = setup(async () => { throw new Error(""); });
    await act(async () => { refused.result.current.reorder!.onReorder([2, 1, 3]); });
    expect(refused.showMessage).toHaveBeenCalledWith(expect.objectContaining({
      content: PHI_COLLECTION_VIEW_WIDGET_DEFAULT_LABELS.reorderFailed,
    }));
  });

  it("is not offered while the list is being read, which may answer other params", () => {
    const { result } = setup(async () => data(), true);
    expect(result.current.reorder).toBeNull();
  });
});
