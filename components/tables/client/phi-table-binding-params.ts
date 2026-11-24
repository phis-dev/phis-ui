"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * A Table's binding params: what its source was configured with, and what its reader, its binding tools
 * or a signal set since.
 *
 * What was set is tagged with the configuration it was set against. A Builder edit of the configured
 * params is a new starting point; the reader's earlier choice belonged to the old one and would
 * otherwise outlive it.
 *
 * `changeBindingParams` merges a change into the params as they stand after the last change -- ahead of
 * the render that shows them -- and answers the params it made, or null where nothing changed. Both
 * matter to a Table read by a Controller:
 * - two binding tools that answer in the same commit each wrote their value over the params of that
 *   render, so the second put back what the first had changed, and the first answered again on the next
 *   render -- each answer a new source, a new read and a `bindingParamsChange` handed on;
 * - the same params again were a new object, so a new source and a new read, and handed on again: a
 *   Controller that hands its scope on every change of what it reads from read the same history up to
 *   six times on opening the Builder's Revisions. The same params are no change at all now.
 */
export function usePhiTableBindingParams(configured: Record<string, unknown>) {
  const seed = JSON.stringify(configured);
  const [chosen, setChosen] = useState<{ seed: string; params: Record<string, unknown> } | null>(null);
  const bindingParams = chosen?.seed === seed ? chosen.params : configured;
  const latest = useRef(bindingParams);
  useLayoutEffect(() => {
    latest.current = bindingParams;
  }, [bindingParams]);
  const changeBindingParams = useCallback((patch: Record<string, unknown>) => {
    const current = latest.current;
    const next = { ...current, ...patch };
    if (JSON.stringify(next) === JSON.stringify(current)) return null;
    latest.current = next;
    setChosen({ seed, params: next });
    return next;
  }, [seed]);
  return { bindingParams, changeBindingParams };
}
