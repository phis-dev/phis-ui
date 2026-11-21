"use client";

import { createContext, useContext } from "react";

/**
 * Drag reordering of the items a Collection draws, offered by the `collection-view` Widget around
 * whatever renderer draws them.
 *
 * The renderer -- the Provider's Render Client or one a Site chose (`itemRendererKey`) -- lays its items
 * out through `PhiCollectionViewControl`, and that is where each of them gets a drag handle: the
 * renderer is not touched and does not know. `itemKeys` are the keys of the items in the order the
 * renderer draws them, one per item; where the renderer draws another number of items than there are
 * keys, the Control cannot tell which is which and offers no reordering.
 */
export type PhiCollectionReorderContextValue = {
  itemKeys: readonly (string | number)[];
  /** Every key in the new order, once an item was dropped somewhere else. */
  onReorder: (itemKeys: (string | number)[]) => void;
  /** True while an order is being written; nothing is dragged meanwhile. */
  disabled?: boolean;
  /** The drag handle's name for assistive technology. */
  handleLabel: string;
};

export const PhiCollectionReorderContext = createContext<PhiCollectionReorderContextValue | null>(null);

export function usePhiCollectionReorder() {
  return useContext(PhiCollectionReorderContext);
}
