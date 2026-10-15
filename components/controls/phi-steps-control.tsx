"use client";

import { Steps } from "antd";

import type { PhiControlSize } from "../../types/control";
import { PhiIcon } from "../shell/phi-icon";

/**
 * One step: what it is called, a line under it, and its own icon where it has one.
 *
 * `status` is for the step that differs from what its position says -- the one that failed. Left out,
 * the Control derives it: before `current` is done, `current` is in progress, after it waits.
 */
export type PhiStepsControlItem = {
  key: string;
  title: string;
  description?: string;
  /** A Phi icon name, never a node: the item is data a Widget stores. */
  icon?: string;
  status?: "wait" | "process" | "finish" | "error";
  disabled?: boolean;
};

export type PhiStepsControlProps = {
  items: readonly PhiStepsControlItem[];
  /** The index of the step in progress. Past the last, every step is done. */
  current: number;
  orientation?: "horizontal" | "vertical";
  /** `dot` draws the steps as points on a line, for a sequence the eye only follows. */
  presentation?: "default" | "dot";
  size?: PhiControlSize;
  ariaLabel?: string;
  /**
   * Going to a step. Without it the steps are an indicator and nothing about them is clickable -- the
   * Widget decides whether they navigate, never the Control by default.
   */
  onChange?: (index: number) => void;
};

/**
 * Where a sequence stands: a checkout, a sign-up, the slots of a Stack walked one after another.
 *
 * A Control of its own rather than a pass-through. Ant Design's items take nodes for their title, icon and
 * content, and a Steps that navigates is a navigation primitive like Menu and Tabs: its item shape stays
 * here and does not become the package's. `content` is not offered -- a step says what it is in a line,
 * and what belongs under it in full is the Stack slot it stands for.
 */
export function PhiStepsControl({
  items,
  current,
  orientation = "horizontal",
  presentation = "default",
  size,
  ariaLabel,
  onChange,
}: PhiStepsControlProps) {
  return (
    <Steps
      aria-label={ariaLabel}
      current={current}
      orientation={orientation}
      type={presentation === "dot" ? "dot" : "default"}
      /* Steps knows no large; a large Control stands at the medium size beside it. */
      size={size === "small" ? "small" : "medium"}
      items={items.map((item) => ({
        key: item.key,
        title: item.title,
        content: item.description,
        icon: item.icon ? <PhiIcon name={item.icon} size="inherit" /> : undefined,
        status: item.status,
        disabled: item.disabled,
      }))}
      onChange={onChange}
    />
  );
}
