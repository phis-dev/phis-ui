import { describe, expect, it, vi } from "vitest";

import { copyPhiRevealedValue } from "./phi-reveal-once-dialog-control";
import { PHI_REVEAL_ONCE_DIALOG_DEFAULT_LABELS } from "./phi-reveal-once-dialog-labels";

/** A value shown once, copied and closed (TABLES.md, "A value shown once"). */
describe("the reveal-once Dialog's copy", () => {
  it("closes only once the value is on the clipboard", async () => {
    const writeText = vi.fn(async () => undefined);
    expect(await copyPhiRevealedValue("PHV-ABCD-EFGH", { writeText })).toBe(true);
    expect(writeText).toHaveBeenCalledWith("PHV-ABCD-EFGH");
  });

  it("stays open where the browser refuses or has no clipboard", async () => {
    expect(await copyPhiRevealedValue("PHV-1", { writeText: async () => { throw new Error("denied"); } })).toBe(false);
    expect(await copyPhiRevealedValue("PHV-1", undefined)).toBe(false);
    expect(PHI_REVEAL_ONCE_DIALOG_DEFAULT_LABELS.copyAndClose).toBe("Copy and close");
  });
});
