"use client";

import { useId, type ReactNode } from "react";

import { usePhiConfig } from "../root/phi-config-provider";
import { PhiDescriptionHint } from "./phi-description-tooltip-icon";
import { PhiHoverText } from "./phi-hover-text";

/**
 * A Control with the words around it: a label beside it, a description behind an information glyph.
 *
 * **A description without a label is the hover text on its own**, and that is the shape to reach for
 * when a Control shows no words but still has to say what it is -- a colour swatch, one cell of a
 * padding grid. It is not a second way to write a tooltip: the Control inside still names itself with
 * its own `aria-label`, because an accessible name cannot be handed to a child from outside it. A
 * graphic that has no name of its own is `PhiNameControl` instead, which renders the named element and
 * can therefore give it both from one string.
 */
/**
 * The id a Control's label is rendered with, and the `aria-labelledby` its focusable element names it by.
 *
 * The label is drawn beside the Control rather than as a `<label>` around it, so nothing ties the two
 * together on its own: without this a screen reader announced "edit text" where the eye reads "Email".
 * The Control generates the id because it renders both halves -- the label through `PhiLabeledControl`,
 * the element itself -- and a name cannot be handed to a child from outside it. An explicit `ariaLabel`
 * wins, as it would in the browser, so `labelledBy` stays empty then.
 */
export function usePhiControlLabel(label: ReactNode, ariaLabel?: string) {
  const id = useId();
  const hasLabel = label != null && label !== "";
  return {
    labelId: hasLabel ? id : undefined,
    labelledBy: hasLabel && !ariaLabel ? id : undefined,
  };
}

export function PhiLabeledControl({
  label,
  labelId,
  description,
  children,
  fill = false,
}: {
  label?: ReactNode;
  /** The id the label is rendered with, from `usePhiControlLabel`, so the Control can point at it. */
  labelId?: string;
  description?: ReactNode;
  children: ReactNode;
  fill?: boolean;
}) {
  const { token } = usePhiConfig();
  const hasLabel = label != null && label !== "";
  const hasDescription = description != null && description !== "";

  if (!hasLabel && !hasDescription) {
    return children;
  }

  if (!hasLabel) {
    return (
      <PhiHoverText title={description}>
        <span style={{ display: "inline-flex", minWidth: 0, width: fill ? "100%" : undefined }}>
          {children}
        </span>
      </PhiHoverText>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--phi-labeled-control-label-width, max-content) minmax(0, 1fr)",
        alignItems: "center",
        columnGap: token.paddingXS,
        minWidth: 0,
        /*
         * A form makes its rows the same width; anywhere else the row is as wide as it needs to be.
         *
         * `auto` is what a labelled Control has always been, and inside a flex column that means
         * shrink-to-fit -- which is why two rows in a form would otherwise sit at two label widths.
         * The form layout sets both variables, so a Control still knows nothing about forms.
         */
        width: fill ? "100%" : "var(--phi-labeled-control-width, auto)",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: token.paddingXXS, minWidth: 0 }}>
        <span id={labelId} className="phi-typography phi-labeled-control__label">{label}</span>
        {hasDescription ? <PhiDescriptionHint description={description} /> : null}
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifySelf: fill ? "stretch" : "start",
          minWidth: 0,
          width: fill ? "100%" : "fit-content",
        }}
      >
        {children}
      </div>
    </div>
  );
}
