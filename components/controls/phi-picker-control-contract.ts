/** Where a popup opens beside the element it belongs to, in Ant Design's placement names. */
export const PHI_POPUP_PLACEMENTS = [
  "top",
  "topLeft",
  "topRight",
  "bottom",
  "bottomLeft",
  "bottomRight",
  "left",
  "leftTop",
  "leftBottom",
  "right",
  "rightTop",
  "rightBottom",
] as const;

export const PHI_PICKER_PLACEMENTS = ["auto", ...PHI_POPUP_PLACEMENTS] as const;

export type PhiPickerPlacement = (typeof PHI_PICKER_PLACEMENTS)[number];

export type PhiPickerTransactionCallbacks<TValue> = {
  onChange?: (value: TValue) => void;
  onCommit?: (value: TValue, originalValue: TValue) => void;
  onDiscard?: (originalValue: TValue) => void;
  onOpenChange?: (open: boolean) => void;
};
