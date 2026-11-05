"use client";

import { cloneElement, lazy, Suspense, useState, type ReactElement, type ReactNode, type Ref } from "react";

/* The same Tooltip `PhiHoverText` loads, and loaded the same way: only where one is drawn. */
const PhiLazyTooltip = lazy(() => import("antd/es/tooltip"));

/** Whether an element shows less than its text: cut off at its end by an ellipsis, or by its height. */
function isPhiElementTruncated(element: HTMLElement | null): boolean {
  return element != null
    && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1);
}

/**
 * A hover text that says what an ellipsis cut off, and only then.
 *
 * Around one element that cuts its own text short (`text-overflow: ellipsis`): pointed at, the element is
 * measured, and the whole text shows in the house tooltip when it did not fit. An element whose text fits
 * shows nothing -- a tooltip repeating the words that stand right there is noise. The child is the element
 * itself, not a component, so the measuring reaches the box that cuts.
 */
export function PhiTruncatedHoverText({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactElement<{ ref?: Ref<HTMLElement> }>;
}) {
  // A callback ref held as state: the element is read when it is pointed at, never while rendering.
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const target = cloneElement(children, { ref: setElement });
  return (
    <Suspense fallback={children}>
      <PhiLazyTooltip
        title={title}
        open={open}
        onOpenChange={(next) => setOpen(next && isPhiElementTruncated(element))}
      >
        {target}
      </PhiLazyTooltip>
    </Suspense>
  );
}
