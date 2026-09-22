"use client";

import { lazy, Suspense, type ReactNode } from "react";

import type { PhiResultWidgetBodyProps } from "./result-body-client";

export type { PhiResultWidgetBodyProps } from "./result-body-client";

/**
 * Lazy boundary for the Result widget body. The body is the only reason antd's Result would sit
 * in a route's first load: the server widget registry statically references every widget body, so
 * a direct antd import here becomes an eager client reference on every page — rendered or not.
 * The boundary keeps the implementation in an on-demand chunk that loads when a page actually
 * renders a Result widget.
 */
const PhiResultWidgetBodyImplementation = lazy(async () => ({
  default: (await import("./result-body-client")).PhiResultWidgetBody,
}));

/**
 * What stands there while the implementation is still on its way.
 *
 * Nothing, for a Page: the Result is one block among others, the rest of the Page is already there,
 * and a placeholder that swaps itself out moves the text around it. The 500 page is the other case --
 * it is the whole page, it is reached at the moment something is already broken, and the chunk it
 * waits for may be the next thing that fails to arrive. It passes markup of its own, which needs
 * nothing loaded, and lets the Result replace it if it gets there.
 */
export function PhiResultWidgetBody({
  fallback = null,
  ...props
}: PhiResultWidgetBodyProps & { fallback?: ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <PhiResultWidgetBodyImplementation {...props} />
    </Suspense>
  );
}
