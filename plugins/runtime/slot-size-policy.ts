import { isValidElement, type CSSProperties, type ReactNode } from "react";

import type { PhiSlotAxisSizePolicy, PhiSlotSizePolicy, PhiNormalizedSlotSizePolicy } from "../../types";
import {
  resolvePhiRenderableBlockGeometry,
  type PhiRenderableBlockGeometryInput,
  type PhiResolvedBlockGeometry,
} from "../../types/renderable-block-geometry";

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

/*
 * What a child sizes like when nothing says otherwise.
 *
 * Every Widget and Layout definition states its own policy (`slotSizePolicy` is required there), so this
 * is no longer the answer any of them relies on. What is left for it: a policy that arrives from a config
 * rather than from a definition and is absent, and an object form that names one axis and leaves the
 * other open. The two entries stay apart because the open axis of a Layout and of a Widget do want
 * different answers -- a Layout has no size of its own and takes the room it is given, a Widget is its
 * content until it says otherwise.
 */
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

  if (policy == null) {
    return fallback;
  }

  /*
   * Stated `intrinsic` means intrinsic, on both axes, for a Layout as much as for a Widget.
   *
   * It used to fall through to the kind's default, which for a Widget happens to be the same answer and
   * for a Layout is the opposite one: a Layout asking to be its content would have filled its slot. No
   * Layout asked, so nothing moved -- but the word has to mean what it says now that every definition
   * has to say it.
   */
  if (policy === "intrinsic") {
    return {
      inline: "intrinsic",
      block: "intrinsic",
    };
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

export function resolvePhiSlotChildExplicitAxes(geometry: PhiResolvedBlockGeometry) {
  return {
    explicitInlineSize: geometry.explicitInline,
    explicitBlockSize: geometry.explicitBlock,
  };
}

/**
 * The policy a child actually runs on, which is not always the one it declared.
 *
 * An axis that states a size of its own is fixed on that axis, whatever the policy said. A Layout's
 * declared policy is fill on both axes and a width used to be recorded beside it without changing it:
 * the child then claimed the whole axis while measuring something else, so the slot stretched, and a
 * Layout with an anchor had nothing left to place. Every caller had to remember to subtract the one
 * from the other, and the callers that forgot were the bugs.
 *
 * A maximum is deliberately not a size. `maxWidth` means "fill, but no further than this" -- a column
 * of copy at a readable measure still wants the width it is given, up to the cap. It stays filling and
 * is merely capped; what it needs is not a different policy but a Layout that places it rather than
 * stretching it, which is the anchor's job.
 *
 * Applied where the sizing is resolved rather than offered as something to call, because a size can
 * also arrive at runtime -- a Signal that sets a width has to flip the policy the same way a stored
 * config does, and a rule that has to be remembered at each site is a rule that is already broken.
 */
export function resolvePhiEffectiveSlotSizePolicy(
  policy: PhiNormalizedSlotSizePolicy,
  explicit: { explicitInlineSize?: boolean; explicitBlockSize?: boolean } | null | undefined,
): PhiNormalizedSlotSizePolicy {
  const inline = explicit?.explicitInlineSize === true ? "fixed" : policy.inline;
  const block = explicit?.explicitBlockSize === true ? "fixed" : policy.block;
  return inline === policy.inline && block === policy.block ? policy : { inline, block };
}

export function resolvePhiSlotChildSizeConstraints(geometry: PhiResolvedBlockGeometry) {
  return {
    minInlineSize: geometry.inline.min?.css,
    minBlockSize: geometry.block.min?.css,
    maxInlineSize: geometry.inline.max?.css,
    maxBlockSize: geometry.block.max?.css,
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
  config: PhiRenderableBlockGeometryInput | null | undefined,
): PhiSlotChildSizing {
  const geometry = resolvePhiRenderableBlockGeometry(config);
  const explicit = resolvePhiSlotChildExplicitAxes(geometry);
  return {
    policy: resolvePhiEffectiveSlotSizePolicy(resolvePhiSlotSizePolicy(slotSizePolicy, kind), explicit),
    ...explicit,
    ...resolvePhiSlotChildSizeConstraints(geometry),
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
    config?: PhiRenderableBlockGeometryInput | null;
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

  const configConstraints = resolvePhiSlotChildSizeConstraints(resolvePhiRenderableBlockGeometry(props.config));

  if (props.slotSizePolicy != null || props.kind != null) {
    const resolvedKind =
      props.kind === "widget" || props.kind === "layout"
        ? props.kind
        : fallbackKind;

    const explicit = {
      explicitInlineSize:
        props.explicitInlineSize === true || props["data-phi-layout-explicit-width"] === "true",
      explicitBlockSize:
        props.explicitBlockSize === true || props["data-phi-layout-explicit-height"] === "true",
    };

    return {
      policy: resolvePhiEffectiveSlotSizePolicy(
        resolvePhiSlotSizePolicy(props.slotSizePolicy, resolvedKind),
        explicit,
      ),
      ...explicit,
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

  const explicit = {
    explicitInlineSize: props["data-phi-layout-explicit-width"] === "true",
    explicitBlockSize: props["data-phi-layout-explicit-height"] === "true",
  };

  return {
    // Idempotent: an element that already wrote the effective policy into its attributes says the same again.
    policy: resolvePhiEffectiveSlotSizePolicy(policy, explicit),
    ...explicit,
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
    /*
     * Whatever the Layout says, which is what an anchor is.
     *
     * A child is a flex item, and a stylesheet that stretches it takes the decision away from the
     * Layout holding it: a stretched item is placed at the start of the cross axis, and a child that
     * caps its own width -- a column at a readable measure -- then sits in the corner of a Layout
     * anchored to the centre, looking as though the anchor did nothing. Stated here, and `auto` rather
     * than a value, so it still stretches wherever the Layout asks for stretch, which is what a Layout
     * with no anchor asks for.
     */
    alignSelf: "auto",
    /*
     * And where a Layout stretched this child in order to give it a width, this is how it is still
     * placed: the slot hands down `--phi-slot-cross-margin`, which is `auto` on the side the anchor
     * pulls towards and `0` everywhere else. A child that fills edge to edge has no room to be moved
     * in and the auto margins come to nothing; a child that caps itself has, and lands where it was
     * asked to. `0` by default, so a child whose slot says nothing keeps the margins it always had.
     *
     * Two longhands rather than the `marginInline` shorthand: React writes a shorthand out as two
     * longhands on the server and keeps it whole in the browser, and the two trees then disagree on an
     * attribute React will not patch up.
     */
    marginInlineStart: "var(--phi-slot-cross-margin-start, 0)",
    marginInlineEnd: "var(--phi-slot-cross-margin-end, 0)",
    ...(policy.inline === "fill" ? { width: "100%" } : policy.inline === "intrinsic" ? { width: "fit-content" } : {}),
    ...(policy.block === "fill" ? { height: "100%" } : policy.block === "intrinsic" ? { height: "fit-content" } : {}),
  };
}
