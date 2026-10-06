import { describe, expect, it } from "vitest";

import { createPhiHistoryStore } from "./history-store";

/**
 * What a history answers about its steps. The toolbar names the next step in its tooltip and the undo
 * says what it took back, so the store has to hand the step out rather than only move it.
 */
describe("a history's steps", () => {
  const history = createPhiHistoryStore<number, { key: string }>("@phis/ui/test-history");

  it("answers an undo and a redo with the step it moved, and nothing when there is none", () => {
    const scope = "moves";
    history.clear(scope);
    expect(history.undo(scope, () => undefined)).toBeNull();

    history.record(scope, { action: { key: "first" }, before: 0, after: 1 });
    history.record(scope, { action: { key: "second" }, before: 1, after: 2 });

    const applied: number[] = [];
    expect(history.undo(scope, (value) => applied.push(value))?.action).toEqual({ key: "second" });
    expect(history.redo(scope, (value) => applied.push(value))?.action).toEqual({ key: "second" });
    expect(applied).toEqual([1, 2]);
    expect(history.redo(scope, () => undefined)).toBeNull();
  });

  it("says which step each button would move next", () => {
    const scope = "availability";
    history.clear(scope);
    expect(history.getAvailability(scope)).toEqual({
      canUndo: false,
      canRedo: false,
      undoAction: null,
      redoAction: null,
    });

    history.record(scope, { action: { key: "first" }, before: 0, after: 1 });
    history.record(scope, { action: { key: "second" }, before: 1, after: 2 });
    history.undo(scope, () => undefined);
    expect(history.getAvailability(scope)).toEqual({
      canUndo: true,
      canRedo: true,
      undoAction: { key: "first" },
      redoAction: { key: "second" },
    });
  });

  it("keeps one step, named as it began, for a gesture recorded in parts", () => {
    const scope = "gesture";
    history.clear(scope);
    history.record(scope, { action: { key: "drag" }, coalesceKey: "slider", before: 0, after: 1 });
    history.record(scope, { action: { key: "drag" }, coalesceKey: "slider", before: 1, after: 2 });
    history.record(scope, { action: { key: "drag" }, coalesceKey: "slider", before: 2, after: 3 });

    const applied: number[] = [];
    expect(history.undo(scope, (value) => applied.push(value))?.action).toEqual({ key: "drag" });
    expect(applied).toEqual([0]);
    expect(history.getAvailability(scope).canUndo).toBe(false);
  });
});
