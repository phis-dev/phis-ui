import { describe, expect, it } from "vitest";

import { resolvePhiCommandButtonVariant } from "./phi-command-buttons";

/* A dialog's Save leads its footer; a Builder toolbar's Save is plain. Both are `action: "save"`. */
describe("a command button's look", () => {
  const save = { variant: undefined };
  const apply = { variant: "primary" as const };

  it("is its action's where the button states none", () => {
    expect(resolvePhiCommandButtonVariant({}, save)).toBeUndefined();
    expect(resolvePhiCommandButtonVariant({}, apply)).toBe("primary");
  });

  it("is its own where it states one, beside an action", () => {
    expect(resolvePhiCommandButtonVariant({ variant: "primary" }, save)).toBe("primary");
    expect(resolvePhiCommandButtonVariant({ variant: "normal" }, apply)).toBe("normal");
    expect(resolvePhiCommandButtonVariant({ variant: "dashed" }, null)).toBe("dashed");
  });
});
