"use client";

import { useCallback, useMemo, useState } from "react";

import { readPhiDotPath } from "../../../../helpers/dot-path";
import type { PhiCoreRuntimeMessageValue } from "../../../../types";
import type {
  PhiCollectionProviderData,
  PhiCollectionProviderQuery,
  PhiCollectionProviderQueryValue,
  PhiCollectionViewBindingModel,
} from "../../../../types/collection-provider";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../types/collection-view-widget";
import type { PhiCollectionReorderContextValue } from "../../../controls/phi-collection-reorder-context";
import type { PhiCollectionViewWidgetLabels } from "../../label-types/collection-view";

/** The Provider action a reorder is sent as where the Widget names none. */
const PHI_COLLECTION_REORDER_DEFAULT_ACTION_KEY = "reorder";

type PhiCollectionItemKey = string | number;

function isBlankFilterValue(value: PhiCollectionProviderQueryValue) {
  return value == null || value === "" || (Array.isArray(value) && value.length === 0);
}

/* The filters that narrow the list, blank ones left out, in one order, so two can be compared. */
function readNarrowingFilters(filters: PhiCollectionProviderQuery["filters"]) {
  return JSON.stringify(Object.entries(filters ?? {})
    .filter(([, value]) => !isBlankFilterValue(value))
    .sort(([left], [right]) => left.localeCompare(right)));
}

/**
 * The keys of the items in the order shown, where dragging them into another order is offered -- or
 * `null` where it is not.
 *
 * Offered only where a drop can say the whole collection's order (`itemKeys`): reordering enabled, in
 * `grid` or `stack` (a masonry's columns have no reading order a drop could follow), no search text, no
 * filter apart from the ones the Widget's own initial query sets -- those are what the collection is --,
 * and every item on the page (a total beyond what was answered is a second page, or a cut). Each item
 * needs a key at the resource's `itemIdentityPath`, a string or a number, and no two the same.
 */
export function resolvePhiCollectionReorderKeys(input: {
  config: Pick<PhiCmsCollectionViewWidgetConfig, "presentation" | "features" | "initialQuery">;
  query: PhiCollectionProviderQuery;
  data: Pick<PhiCollectionProviderData, "items" | "total"> | null;
  itemIdentityPath: string;
}): PhiCollectionItemKey[] | null {
  const { config, query, data } = input;
  if (config.features.reorder?.enabled !== true) return null;
  if (config.presentation.mode === "masonry") return null;
  if (!data || data.items.length === 0 || data.total > data.items.length) return null;
  if ((query.search ?? "").trim()) return null;
  if (readNarrowingFilters(query.filters) !== readNarrowingFilters(config.initialQuery?.filters)) return null;
  const keys: PhiCollectionItemKey[] = [];
  const seen = new Set<string>();
  for (const item of data.items) {
    const key = readPhiDotPath(item, input.itemIdentityPath);
    if (typeof key !== "string" && typeof key !== "number") return null;
    if (seen.has(String(key))) return null;
    seen.add(String(key));
    keys.push(key);
  }
  return keys;
}

/** The items in the order the keys give; an item whose key is not among them keeps its place at the end. */
export function orderPhiCollectionItems<TItem>(
  items: readonly TItem[],
  order: readonly PhiCollectionItemKey[],
  readKey: (item: TItem) => unknown,
) {
  const position = new Map(order.map((key, index) => [String(key), index]));
  return items
    .map((item, index) => ({ item, index, at: position.get(String(readKey(item))) }))
    .sort((left, right) => (left.at ?? order.length + left.index) - (right.at ?? order.length + right.index))
    .map((entry) => entry.item);
}

/**
 * Drag reordering for a `collection-view` Widget: the binding its renderer is to draw from -- the items
 * in the dropped order at once, while the Provider writes it -- and what its Collection Control needs to
 * offer the handles (`PhiCollectionReorderContext`), or `null` where reordering is not offered.
 *
 * A drop sends the Provider's reorder action with every key in the new order (`itemKeys`). Its answer is
 * the collection as it now stands and takes the dropped order's place; a refusal -- thrown, or answered
 * with `error` -- puts the order the Provider has back, read again, and is said the way a Collection's
 * other refused actions are (an application message, the Provider's words where it gave some).
 */
export function usePhiCollectionReorderBinding({
  config,
  binding,
  itemIdentityPath,
  labels,
  showMessage,
}: {
  config: PhiCmsCollectionViewWidgetConfig | null | undefined;
  binding: PhiCollectionViewBindingModel;
  itemIdentityPath: string | null;
  labels: PhiCollectionViewWidgetLabels;
  showMessage: (value: PhiCoreRuntimeMessageValue) => void;
}) {
  const [pendingOrder, setPendingOrder] = useState<PhiCollectionItemKey[] | null>(null);
  const itemKeys = useMemo(
    () => config && itemIdentityPath != null
      ? resolvePhiCollectionReorderKeys({ config, query: binding.query, data: binding.data, itemIdentityPath })
      : null,
    [binding.data, binding.query, config, itemIdentityPath],
  );
  const actionKey = config?.features.reorder?.actionKey ?? PHI_COLLECTION_REORDER_DEFAULT_ACTION_KEY;
  const { activate, reload } = binding;

  const onReorder = useCallback((nextKeys: PhiCollectionItemKey[]) => {
    setPendingOrder(nextKeys);
    void (async () => {
      try {
        const answered = await activate({ actionKey, itemKeys: nextKeys });
        if (answered.error) throw new Error(answered.error);
      } catch (error) {
        showMessage({
          level: "error",
          content: error instanceof Error && error.message ? error.message : labels.reorderFailed,
          durationSeconds: 2.8,
        });
        reload();
      } finally {
        setPendingOrder(null);
      }
    })();
  }, [actionKey, activate, labels.reorderFailed, reload, showMessage]);

  const presentedBinding = useMemo<PhiCollectionViewBindingModel>(() => {
    if (!pendingOrder || !binding.data || itemIdentityPath == null) return binding;
    const items = orderPhiCollectionItems(binding.data.items, pendingOrder, (item) => readPhiDotPath(item, itemIdentityPath));
    return { ...binding, data: { ...binding.data, items } };
  }, [binding, itemIdentityPath, pendingOrder]);

  const reorder = useMemo<PhiCollectionReorderContextValue | null>(() => itemKeys ? {
    itemKeys: pendingOrder ?? itemKeys,
    onReorder,
    disabled: pendingOrder != null,
    handleLabel: labels.reorderHandle,
  } : null, [itemKeys, labels.reorderHandle, onReorder, pendingOrder]);

  return { binding: presentedBinding, reorder };
}
