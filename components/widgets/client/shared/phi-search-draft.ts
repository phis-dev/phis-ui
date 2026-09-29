"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";

/**
 * The query a search draft stands for.
 *
 * Trimmed, and empty below the minimum length rather than absent: a person who shortens "chair" to "ch"
 * has taken the search back, and the results have to follow them there. Emitting nothing kept the list
 * filtered by a word that was no longer in the box.
 */
export function resolvePhiSearchDraftQuery(draft: string, minQueryLength: number) {
  const trimmed = draft.trim();
  return trimmed.length < Math.max(1, minQueryLength) ? "" : trimmed;
}

export type PhiSearchDraft = {
  /** What the box shows. */
  draft: string;
  setDraft: (draft: string) => void;
  /**
   * Takes the current draft as answered without emitting it -- for a submit that delivers the query
   * another way, so the debounce does not repeat it as a change afterwards.
   */
  settle: () => void;
};

/**
 * Typing is not a query: the draft is what a person sees, the query follows once they stop.
 *
 * Three things hold between the two. The draft follows the query when it changes from outside -- a
 * reset, a new source -- but not when the change is this draft's own echo, which would eat a trailing
 * space the query trimmed away. The debounce restarts only when the draft does; the callback is read
 * when the timer fires, so a parent that renders with a new closure does not postpone the search. And
 * an empty box answers at once, because there is nothing left to wait for.
 */
export function usePhiSearchDraft({
  query,
  onQueryChange,
  debounceMs,
  minQueryLength = 1,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  debounceMs: number;
  minQueryLength?: number;
}): PhiSearchDraft {
  const [draft, setDraft] = useState(query);
  // The query as last seen from outside, to tell a change of it from a render that repeats it.
  const [seenQuery, setSeenQuery] = useState(query);
  // The query this draft last stood for: emitted by it, settled by it, or taken over from outside.
  const [answeredQuery, setAnsweredQuery] = useState(
    () => resolvePhiSearchDraftQuery(query, minQueryLength),
  );

  if (query !== seenQuery) {
    setSeenQuery(query);
    const externalQuery = resolvePhiSearchDraftQuery(query, minQueryLength);
    if (externalQuery !== answeredQuery) {
      setAnsweredQuery(externalQuery);
      setDraft(query);
    }
  }

  const emit = useEffectEvent((nextQuery: string) => {
    setAnsweredQuery(nextQuery);
    onQueryChange(nextQuery);
  });

  const nextQuery = resolvePhiSearchDraftQuery(draft, minQueryLength);
  const delayMs = draft.trim() === "" ? 0 : Math.max(0, debounceMs);
  useEffect(() => {
    if (nextQuery === answeredQuery) {
      return;
    }
    const timer = window.setTimeout(() => emit(nextQuery), delayMs);
    return () => window.clearTimeout(timer);
  }, [answeredQuery, delayMs, nextQuery]);

  const settle = useCallback(() => setAnsweredQuery(nextQuery), [nextQuery]);

  return { draft, setDraft, settle };
}
