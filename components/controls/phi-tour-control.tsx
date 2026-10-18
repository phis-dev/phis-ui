"use client";

import { useMemo } from "react";
import { Tour, type TourProps } from "antd";

import type { PhiTourLabels, PhiTourPlacement } from "../../types/tours";

/**
 * One step as it is presented: text already in the viewer's language, and the target already resolved by
 * the owning Controller (design/TOURS.md).
 *
 * `target` is `null` for a step that is deliberately centered -- never for one whose target was not
 * found; the Controller skips or stops such a step before it gets here.
 */
export type PhiTourControlStep = {
  key: string;
  title: string;
  description?: string;
  target: (() => HTMLElement | null) | null;
  placement?: PhiTourPlacement;
};

export type PhiTourControlProps = {
  open: boolean;
  /** Index into `steps`. Presentation order, not identity -- the Controller keeps the step's key. */
  current: number;
  steps: readonly PhiTourControlStep[];
  labels: PhiTourLabels;
  /** Dim everything but the target. On by default: the point of a step is where it points. */
  mask?: boolean;
  /** Whether the highlighted target may be used during the step. */
  disabledInteraction?: boolean;
  onStepChange: (index: number) => void;
  /** Closing by the close button or Escape -- a dismissal, never a completion. */
  onClose: () => void;
  onFinish: () => void;
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * A guided Tour's presentation, and the only place Ant Design `Tour` is used.
 *
 * It holds no workflow. Which step is current, whether the Tour is open, what was completed or dismissed
 * and whether a target is ready are the owning Controller's; this draws what it is given and reports what
 * the viewer did. Nothing here resolves an address, navigates or writes progress.
 *
 * Every button label is passed in, because Ant Design's own "Next", "Previous" and "Finish" come from its
 * locale bundle -- a second translation source the Site's label sets cannot reach.
 */
export function PhiTourControl({
  open,
  current,
  steps,
  labels,
  mask = true,
  disabledInteraction = false,
  onStepChange,
  onClose,
  onFinish,
}: PhiTourControlProps) {
  const tourSteps = useMemo<NonNullable<TourProps["steps"]>>(() => steps.map((step, index) => ({
    title: step.title,
    description: step.description,
    // Ant Design types the getter as one that always finds its element; a target can leave mid-step.
    target: (step.target ?? null) as (() => HTMLElement) | null,
    placement: step.target ? step.placement : undefined,
    prevButtonProps: { children: labels.previous },
    nextButtonProps: { children: index === steps.length - 1 ? labels.finish : labels.next },
  })), [labels.finish, labels.next, labels.previous, steps]);

  return (
    <Tour
      open={open && steps.length > 0}
      current={current}
      steps={tourSteps}
      mask={mask}
      disabledInteraction={disabledInteraction}
      keyboard
      scrollIntoViewOptions={{ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" }}
      onChange={onStepChange}
      onClose={onClose}
      onFinish={onFinish}
    />
  );
}
