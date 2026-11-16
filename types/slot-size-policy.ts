export type PhiSlotAxisSizePolicy = "intrinsic" | "fill" | "fixed";

export type PhiSlotSizePolicyPreset =
  | "intrinsic"
  | "fill-inline"
  | "fill-block"
  | "fill"
  | "fixed";

/** A policy that holds whatever the config says. */
export type PhiSlotSizePolicyValue =
  | PhiSlotSizePolicyPreset
  | {
      inline?: PhiSlotAxisSizePolicy | null;
      block?: PhiSlotAxisSizePolicy | null;
    };

/**
 * A policy one field of the block's own config decides: `byValue[config[configField]]`, else `otherwise`.
 * Declarative on purpose: the policy travels to the Builder as data.
 */
export type PhiSlotSizePolicyByConfig = {
  configField: string;
  byValue: Readonly<Record<string, PhiSlotSizePolicyValue>>;
  otherwise: PhiSlotSizePolicyValue;
};

export type PhiSlotSizePolicy = PhiSlotSizePolicyValue | PhiSlotSizePolicyByConfig;

export type PhiNormalizedSlotSizePolicy = {
  inline: PhiSlotAxisSizePolicy;
  block: PhiSlotAxisSizePolicy;
};
