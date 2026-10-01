"use client";

import { lazy, Suspense, type ReactNode } from "react";

/*
 * Ant Design's Tooltip, loaded where a hover text is actually drawn.
 *
 * Its module brings the Form library along: the tooltip isolates Form context through
 * `antd/es/form/context`, which imports `@rc-component/form`, a package that declares no side-effect
 * freedom -- so the whole Form library and its validator came with every Control that could show a hover
 * text, whether it had one or not. The Theme mode switch on the Landing has no label and no description,
 * and still preloaded the Tooltip, Typography and the Form library through `PhiLabeledControl`.
 */
const PhiLazyTooltip = lazy(() => import("antd/es/tooltip"));

/**
 * A hover text around one element, for the Controls in this directory.
 *
 * Rendered on the Server it is complete, and hydration waits for the chunk instead of swapping anything.
 * Mounted in the browser before the chunk is there, the element stands without its hover text until it
 * arrives.
 */
export function PhiHoverText({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <PhiLazyTooltip title={title}>{children}</PhiLazyTooltip>
    </Suspense>
  );
}
