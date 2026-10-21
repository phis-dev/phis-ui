"use client";

import { useEffect, useMemo } from "react";
import { Tour, type TourProps } from "antd";

import type { PhiTourLabels, PhiTourPlacement } from "../../types/tours";
import { PhiCompactGroupControl } from "./phi-compact-group-control";
import {
  bringPhiTourTargetIntoView,
  resolvePhiTourScrollBehavior,
  resolvePhiTourScrollBlock,
} from "./phi-tour-viewport";

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
    // Ant Design spaces the two buttons apart; joined, the seam between them is drawn once instead.
    prevButtonProps: { children: labels.previous, style: { marginInlineStart: 0 } },
    nextButtonProps: { children: index === steps.length - 1 ? labels.finish : labels.next, style: { marginInlineStart: 0 } },
  })), [labels.finish, labels.next, labels.previous, steps]);

  /*
   * The shown step scrolls the way its Controller already brought it in (`phi-tour-viewport.ts`): Ant
   * Design scrolls again whenever the target is not wholly inside the window, which a tall one never is,
   * and the same alignment under the same scroll padding lands where the target already stands.
   */
  const shownTarget = open ? steps[current]?.target?.() ?? null : null;
  const shownSteps = shownTarget
    ? tourSteps.map((step, index) => index === current
      ? { ...step, scrollIntoViewOptions: { block: resolvePhiTourScrollBlock(shownTarget), inline: "nearest" as const, behavior: resolvePhiTourScrollBehavior() } }
      : step)
    : tourSteps;
  // A target under a sticky band is inside the window, so Ant Design leaves it there; this brings it out.
  useEffect(() => {
    if (shownTarget) bringPhiTourTargetIntoView(shownTarget, resolvePhiTourScrollBehavior());
  }, [current, shownTarget]);

  return (
    <Tour
      open={open && steps.length > 0}
      current={current}
      steps={shownSteps}
      mask={mask}
      disabledInteraction={disabledInteraction}
      keyboard
      // Previous and Next as one bar: two steps of one way through, not two separate commands.
      actionsRender={(actions) => <PhiCompactGroupControl size="small">{actions}</PhiCompactGroupControl>}
      scrollIntoViewOptions={{ block: "center", behavior: resolvePhiTourScrollBehavior() }}
      onChange={onStepChange}
      onClose={onClose}
      onFinish={onFinish}
    />
  );
}
