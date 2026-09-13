import { isValidElement, type CSSProperties, type ReactNode } from "react";

import type { PhiRenderableBlockBase, PhiSlotAxisSizePolicy, PhiSlotSizePolicy, PhiNormalizedSlotSizePolicy } from "../../types";

export type PhiSlotChildKind = "widget" | "layout";

export type PhiSlotChildSizing = {
  policy: PhiNormalizedSlotSizePolicy;
  explicitInlineSize: boolean;
  explicitBlockSize: boolean;
  minInlineSize?: CSSProperties["minWidth"];
  minBlockSize?: CSSProperties["minHeight"];
  maxInlineSize?: CSSProperties["maxWidth"];
  maxBlockSize?: CSSProperties["maxHeight"];
};

const PHI_SLOT_CHILD_DEFAULT_POLICY: Record<PhiSlotChildKind, PhiNormalizedSlotSizePolicy> = {
  widget: {
    inline: "intrinsic",
    block: "intrinsic",
  },
  layout: {
    inline: "fill",
    block: "fill",
  },
};

function normalizePhiSlotPolicyAxis(
  axis: PhiSlotAxisSizePolicy | null | undefined,
  fallback: PhiSlotAxisSizePolicy,
) {
  return axis === "fill" || axis === "fixed" || axis === "intrinsic" ? axis : fallback;
}

export function resolvePhiSlotSizePolicy(
  policy: PhiSlotSizePolicy | null | undefined,
  kind: PhiSlotChildKind,
): PhiNormalizedSlotSizePolicy {
  const fallback = PHI_SLOT_CHILD_DEFAULT_POLICY[kind];

  if (policy == null || policy === "intrinsic") {
    return fallback;
  }

  if (policy === "fill") {
    return {
      inline: "fill",
      block: "fill",
    };
  }

  if (policy === "fill-inline") {
    return {
      inline: "fill",
      block: "intrinsic",
    };
  }

  if (policy === "fill-block") {
    return {
      inline: "intrinsic",
      block: "fill",
    };
  }

  if (policy === "fixed") {
    return {
      inline: "fixed",
      block: "fixed",
    };
  }

  return {
    inline: normalizePhiSlotPolicyAxis(policy.inline, fallback.inline),
    block: normalizePhiSlotPolicyAxis(policy.block, fallback.block),
  };
}

export function resolvePhiSlotChildExplicitAxes(
  config: Pick<PhiRenderableBlockBase, "size"> | null | undefined,
) {
  return {
    explicitInlineSize: config?.size?.width != null,
    explicitBlockSize: config?.size?.height != null,
  };
}

function resolvePhiSlotChildSizeConstraints(
  config: Pick<PhiRenderableBlockBase, "minSize" | "maxSize"> | null | undefined,
) {
  return {
    minInlineSize: config?.minSize?.width ?? undefined,
    minBlockSize: config?.minSize?.height ?? undefined,
    maxInlineSize: config?.maxSize?.width ?? undefined,
    maxBlockSize: config?.maxSize?.height ?? undefined,
  };
}

/**
 * The sizing a client-enhanced slot child hands to the parent layout, resolved rather than referred.
 *
 * A Widget that needs a client frame is rendered through the Render Client Host, and the parent layout
 * still has to learn how it sizes. Passing the block config along for the parent to read looked like the
 * small move, and it put the same object in two places of one element's props. React's serializer writes
 * the second one as a reference back into the element it is still building, to be filled in once that
 * element exists -- and element props are frozen on creation in development, so the write can throw
 * `Cannot assign to read only property 'config'` and take the Widget's whole render with it. The account
 * menu was lost to exactly that shape, from a different source; see the Account Widget plugin.
 *
 * Six resolved values carry the same information and share nothing, so there is no reference to fill in.
 */
export function resolvePhiSlotChildSizingForConfig(
  kind: PhiSlotChildKind,
  slotSizePolicy: PhiSlotSizePolicy | null | undefined,
  config: Pick<PhiRenderableBlockBase, "size" | "minSize" | "maxSize"> | null | undefined,
): PhiSlotChildSizing {
  return {
    policy: resolvePhiSlotSizePolicy(slotSizePolicy, kind),
    ...resolvePhiSlotChildExplicitAxes(config),
    ...resolvePhiSlotChildSizeConstraints(config),
  };
}

export function buildPhiSlotChildClassName(policy: PhiNormalizedSlotSizePolicy) {
  return [
    "phi-slot-child",
    `phi-slot-child--inline-${policy.inline}`,
    `phi-slot-child--block-${policy.block}`,
  ].join(" ");
}

export function buildPhiSlotChildDataAttributes(
  policy: PhiNormalizedSlotSizePolicy,
  options?: {
    explicitInlineSize?: boolean;
    explicitBlockSize?: boolean;
    minInlineSize?: CSSProperties["minWidth"];
    minBlockSize?: CSSProperties["minHeight"];
    maxInlineSize?: CSSProperties["maxWidth"];
    maxBlockSize?: CSSProperties["maxHeight"];
  },
) {
  const explicitInlineSize = options?.explicitInlineSize === true;
  const explicitBlockSize = options?.explicitBlockSize === true;
  const fillInline = policy.inline === "fill";
  const fillBlock = policy.block === "fill";
  const serializeSize = (value: CSSProperties["width"] | undefined) =>
    typeof value === "number" ? `${value}px` : value;

  return {
    "data-phi-slot-size-inline": policy.inline,
    "data-phi-slot-size-block": policy.block,
    "data-phi-layout-fill-slot": fillInline || fillBlock ? "true" : undefined,
    "data-phi-layout-explicit-width": explicitInlineSize ? "true" : undefined,
    "data-phi-layout-explicit-height": explicitBlockSize ? "true" : undefined,
    "data-phi-slot-min-inline-size": serializeSize(options?.minInlineSize),
    "data-phi-slot-min-block-size": serializeSize(options?.minBlockSize),
    "data-phi-slot-max-inline-size": serializeSize(options?.maxInlineSize),
    "data-phi-slot-max-block-size": serializeSize(options?.maxBlockSize),
  };
}

export function resolvePhiSlotChildSizing(
  child: ReactNode,
  fallbackKind: PhiSlotChildKind = "widget",
): PhiSlotChildSizing {
  if (!isValidElement(child)) {
    return {
      policy: resolvePhiSlotSizePolicy(undefined, fallbackKind),
      explicitInlineSize: false,
      explicitBlockSize: false,
    };
  }

  const props = child.props as {
    slotSizePolicy?: PhiSlotSizePolicy | null;
    kind?: PhiSlotChildKind;
    explicitInlineSize?: unknown;
    explicitBlockSize?: unknown;
    config?: Pick<PhiRenderableBlockBase, "minSize" | "maxSize"> | null;
    "data-phi-slot-size-inline"?: unknown;
    "data-phi-slot-size-block"?: unknown;
    "data-phi-layout-explicit-width"?: unknown;
    "data-phi-layout-explicit-height"?: unknown;
    "data-phi-slot-min-inline-size"?: unknown;
    "data-phi-slot-min-block-size"?: unknown;
    "data-phi-slot-max-inline-size"?: unknown;
    "data-phi-slot-max-block-size"?: unknown;
    slotChildSizing?: PhiSlotChildSizing | null;
  };

  const sizingProps = props.slotChildSizing;
  if (sizingProps?.policy) {
    return sizingProps;
  }

  const configConstraints = resolvePhiSlotChildSizeConstraints(props.config);

  if (props.slotSizePolicy != null || props.kind != null) {
    const resolvedKind =
      props.kind === "widget" || props.kind === "layout"
        ? props.kind
        : fallbackKind;

    return {
      policy: resolvePhiSlotSizePolicy(props.slotSizePolicy, resolvedKind),
      explicitInlineSize:
        props.explicitInlineSize === true || props["data-phi-layout-explicit-width"] === "true",
      explicitBlockSize:
        props.explicitBlockSize === true || props["data-phi-layout-explicit-height"] === "true",
      ...configConstraints,
    };
  }

  const policy = resolvePhiSlotSizePolicy(
    {
      inline:
        props["data-phi-slot-size-inline"] === "fill" ||
        props["data-phi-slot-size-inline"] === "fixed" ||
        props["data-phi-slot-size-inline"] === "intrinsic"
          ? props["data-phi-slot-size-inline"]
          : undefined,
      block:
        props["data-phi-slot-size-block"] === "fill" ||
        props["data-phi-slot-size-block"] === "fixed" ||
        props["data-phi-slot-size-block"] === "intrinsic"
          ? props["data-phi-slot-size-block"]
          : undefined,
    },
    fallbackKind,
  );

  return {
    policy,
    explicitInlineSize: props["data-phi-layout-explicit-width"] === "true",
    explicitBlockSize: props["data-phi-layout-explicit-height"] === "true",
    minInlineSize:
      configConstraints.minInlineSize ??
      (typeof props["data-phi-slot-min-inline-size"] === "string"
        ? props["data-phi-slot-min-inline-size"]
        : undefined),
    minBlockSize:
      configConstraints.minBlockSize ??
      (typeof props["data-phi-slot-min-block-size"] === "string"
        ? props["data-phi-slot-min-block-size"]
        : undefined),
    maxInlineSize:
      configConstraints.maxInlineSize ??
      (typeof props["data-phi-slot-max-inline-size"] === "string"
        ? props["data-phi-slot-max-inline-size"]
        : undefined),
    maxBlockSize:
      configConstraints.maxBlockSize ??
      (typeof props["data-phi-slot-max-block-size"] === "string"
        ? props["data-phi-slot-max-block-size"]
        : undefined),
  };
}

export function resolvePhiSlotChildBaseStyle(policy: PhiNormalizedSlotSizePolicy): CSSProperties {
  return {
    minWidth: 0,
    minHeight: 0,
    maxWidth: "100%",
    maxHeight: "100%",
    ...(policy.inline === "fill" ? { width: "100%" } : policy.inline === "intrinsic" ? { width: "fit-content" } : {}),
    ...(policy.block === "fill" ? { height: "100%" } : policy.block === "intrinsic" ? { height: "fit-content" } : {}),
  };
}
