export type PhiSlotAxisSizePolicy = "intrinsic" | "fill" | "fixed";

export type PhiSlotSizePolicyPreset =
  | "intrinsic"
  | "fill-inline"
  | "fill-block"
  | "fill"
  | "rest"
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
 * A string field is read as it is, a boolean field as the key `"true"` or `"false"`; anything else is `otherwise`.
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
  /**
   * Set by `"rest"` alone, which is `fill` on both axes and this. Only a Flex Layout reads it: where a
   * child that fills the Layout's main axis also states it, that child alone grows into the room left over.
   */
  takesRest?: true;
};
