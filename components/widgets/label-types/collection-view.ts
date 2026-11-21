/** What the `collection-view` Widget says of its own, apart from whatever its renderer says. */
export type PhiCollectionViewWidgetLabels = {
  /** The drag handle on each item while reordering is offered (`features.reorder`). */
  reorderHandle: string;
  /** Said when the Provider refused the new order and gave no words of its own. */
  reorderFailed: string;
};

export const PHI_COLLECTION_VIEW_WIDGET_DEFAULT_LABELS: PhiCollectionViewWidgetLabels = {
  reorderHandle: "Drag to reorder",
  reorderFailed: "The new order could not be saved.",
};
