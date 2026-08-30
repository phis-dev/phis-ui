export type PhiSlotAxisSizePolicy = "intrinsic" | "fill" | "fixed";

export type PhiSlotSizePolicyPreset =
  | "intrinsic"
  | "fill-inline"
  | "fill-block"
  | "fill"
  | "fixed";

export type PhiSlotSizePolicy =
  | PhiSlotSizePolicyPreset
  | {
      inline?: PhiSlotAxisSizePolicy | null;
      block?: PhiSlotAxisSizePolicy | null;
    };

export type PhiNormalizedSlotSizePolicy = {
  inline: PhiSlotAxisSizePolicy;
  block: PhiSlotAxisSizePolicy;
};
