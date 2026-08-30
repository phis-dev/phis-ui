export const PHI_PICKER_PLACEMENTS = [
  "auto",
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

export type PhiPickerPlacement = (typeof PHI_PICKER_PLACEMENTS)[number];

export type PhiPickerTransactionCallbacks<TValue> = {
  onChange?: (value: TValue) => void;
  onCommit?: (value: TValue, originalValue: TValue) => void;
  onDiscard?: (originalValue: TValue) => void;
  onOpenChange?: (open: boolean) => void;
};
