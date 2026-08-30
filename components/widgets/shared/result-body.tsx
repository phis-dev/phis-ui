"use client";

import { lazy, Suspense } from "react";

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

export function PhiResultWidgetBody(props: PhiResultWidgetBodyProps) {
  return (
    <Suspense fallback={null}>
      <PhiResultWidgetBodyImplementation {...props} />
    </Suspense>
  );
}
