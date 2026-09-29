// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolvePhiSearchDraftQuery, usePhiSearchDraft } from "./phi-search-draft";

describe("resolvePhiSearchDraftQuery", () => {
  it("trims and takes the search back below the minimum", () => {
    expect(resolvePhiSearchDraftQuery("  chair ", 3)).toBe("chair");
    expect(resolvePhiSearchDraftQuery("ch", 3)).toBe("");
    expect(resolvePhiSearchDraftQuery("   ", 1)).toBe("");
    expect(resolvePhiSearchDraftQuery("c", 0)).toBe("c");
  });
});

describe("usePhiSearchDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function mount(initial: { query: string; minQueryLength?: number }) {
    const onQueryChange = vi.fn<(query: string) => void>();
    const hook = renderHook(
      (props: { query: string; onQueryChange: (query: string) => void }) => usePhiSearchDraft({
        query: props.query,
        onQueryChange: props.onQueryChange,
        debounceMs: 250,
        minQueryLength: initial.minQueryLength ?? 1,
      }),
      { initialProps: { query: initial.query, onQueryChange } },
    );
    return { ...hook, onQueryChange };
  }

  it("emits once the person stops typing", () => {
    const { result, onQueryChange } = mount({ query: "" });
    act(() => result.current.setDraft("chair"));
    act(() => vi.advanceTimersByTime(249));
    expect(onQueryChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onQueryChange).toHaveBeenCalledWith("chair");
  });

  it("does not restart the debounce when the parent renders with a new callback", () => {
    const { result, rerender, onQueryChange } = mount({ query: "" });
    act(() => result.current.setDraft("chair"));
    act(() => vi.advanceTimersByTime(200));
    rerender({ query: "", onQueryChange: vi.fn((query: string) => onQueryChange(query)) });
    act(() => vi.advanceTimersByTime(50));
    expect(onQueryChange).toHaveBeenCalledWith("chair");
  });

  it("follows a query changed from outside", () => {
    const { result, rerender, onQueryChange } = mount({ query: "chair" });
    rerender({ query: "table", onQueryChange });
    expect(result.current.draft).toBe("table");
    act(() => vi.advanceTimersByTime(500));
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it("keeps the draft when the query is its own echo", () => {
    const { result, rerender, onQueryChange } = mount({ query: "" });
    act(() => result.current.setDraft("chair "));
    act(() => vi.advanceTimersByTime(250));
    expect(onQueryChange).toHaveBeenCalledWith("chair");
    rerender({ query: "chair", onQueryChange });
    expect(result.current.draft).toBe("chair ");
  });

  it("takes the search back when the draft falls below the minimum", () => {
    const { result, rerender, onQueryChange } = mount({ query: "chair", minQueryLength: 3 });
    act(() => result.current.setDraft("ch"));
    act(() => vi.advanceTimersByTime(250));
    expect(onQueryChange).toHaveBeenLastCalledWith("");
    rerender({ query: "", onQueryChange });
    expect(result.current.draft).toBe("ch");
  });

  it("answers an emptied box at once", () => {
    const { result, onQueryChange } = mount({ query: "chair" });
    act(() => result.current.setDraft(""));
    act(() => vi.advanceTimersByTime(0));
    expect(onQueryChange).toHaveBeenCalledWith("");
  });

  it("does not repeat a settled draft as a change", () => {
    const { result, onQueryChange } = mount({ query: "" });
    act(() => result.current.setDraft("chair"));
    act(() => result.current.settle());
    act(() => vi.advanceTimersByTime(500));
    expect(onQueryChange).not.toHaveBeenCalled();
  });
});
