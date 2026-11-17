"use client";

import { lazy, Suspense, type ComponentType } from "react";

import type { PhiFormFieldProviderProps } from "./form-provider-registry";

/**
 * A field Control whose code loads when a field of its kind is first rendered.
 *
 * Every kind in the shared registry that has code of its own to ship: the choice and number fields, the slider and the
 * cascader, the date and time picker, and the compound Table and Tree fields, which bring the Table and
 * Tree Controls with an editor for every column kind. Only text and toggle fields stay in the registry
 * itself. The choice fields stayed too once, as kinds nearly every form has -- but the form every
 * Landing carries is the sign-in, which has none of them, and paid for the Select on every first visit.
 */
export function lazyPhiFormFieldControl(
  load: () => Promise<ComponentType<PhiFormFieldProviderProps>>,
  /** How many control rows the field occupies once loaded, so the form keeps its height meanwhile. */
  placeholderRows = 1,
): ComponentType<PhiFormFieldProviderProps> {
  const LazyControl = lazy(async () => ({ default: await load() }));
  /*
   * Only shown where the browser renders the field before its chunk arrived -- a navigation without a
   * server render. On a server-rendered page React keeps the server HTML until the chunk is there.
   */
  const placeholder = (
    <div
      aria-busy="true"
      style={{
        blockSize: `calc(var(--phi-control-height) * ${placeholderRows} + var(--phi-padding-sm) * ${placeholderRows - 1})`,
        /*
         * The Control shape, because this stands where a Control is about to stand. `grown-md` is half a
         * Control line, which on the one-row placeholder is exactly the capsule and on a taller one is the
         * capsule held -- the same answer the field itself will give when it arrives, so the shape does not
         * change under the reader at the moment the chunk lands.
         */
        borderRadius: "var(--phi-control-radius-grown-md)",
        background: "var(--phi-color-fill-quaternary)",
      }}
    />
  );
  return function PhiLazyFormFieldControl(props: PhiFormFieldProviderProps) {
    return (
      <Suspense fallback={placeholder}>
        <LazyControl {...props} />
      </Suspense>
    );
  };
}
