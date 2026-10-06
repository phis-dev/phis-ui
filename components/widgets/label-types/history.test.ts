import { describe, expect, it } from "vitest";

import {
  PHI_HISTORY_DEFAULT_LABELS,
  formatPhiHistoryAction,
  formatPhiHistoryMoveMessage,
  formatPhiHistoryTooltip,
} from "./history";

describe("what a history step says", () => {
  it("names the node it touched", () => {
    expect(formatPhiHistoryAction(PHI_HISTORY_DEFAULT_LABELS, { key: "moveNode", subject: "Hero" }))
      .toBe("Move Hero");
  });

  it("names a Region by the reader's name for it, not by its key", () => {
    expect(formatPhiHistoryAction(PHI_HISTORY_DEFAULT_LABELS, { key: "changeRegion", regionKey: "header_main" }))
      .toBe(`Change the Region ${PHI_HISTORY_DEFAULT_LABELS.regions.regions.headerMain.title}`);
  });

  it("says what an undo took back and what the button would move next", () => {
    const action = { key: "deleteNode", subject: "Gallery" } as const;
    expect(formatPhiHistoryMoveMessage(PHI_HISTORY_DEFAULT_LABELS, "undo", action)).toBe("Undone: Delete Gallery");
    expect(formatPhiHistoryMoveMessage(PHI_HISTORY_DEFAULT_LABELS, "redo", action)).toBe("Redone: Delete Gallery");
    expect(formatPhiHistoryTooltip(PHI_HISTORY_DEFAULT_LABELS, "undo", action)).toBe("Undo: Delete Gallery");
    expect(formatPhiHistoryTooltip(PHI_HISTORY_DEFAULT_LABELS, "redo", null)).toBe("Nothing to redo");
  });
});
