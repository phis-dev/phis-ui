import { describe, expect, it } from "vitest";

import { resolvePhiCommandButtonDisabled, resolvePhiCommandButtonVariant } from "./phi-command-buttons";

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

/* The confirm of a type-to-confirm dialog is placed greyed out and woken once the word is typed. */
describe("whether a command button is greyed out", () => {
  it("is what it was placed with until a signal says otherwise", () => {
    expect(resolvePhiCommandButtonDisabled({ disabled: true }, {})).toBe(true);
    expect(resolvePhiCommandButtonDisabled({}, {})).toBe(false);
  });

  it("is what enabled/change said last, either way, over what it was placed with", () => {
    expect(resolvePhiCommandButtonDisabled({ disabled: true }, { enabled: true })).toBe(false);
    expect(resolvePhiCommandButtonDisabled({ disabled: true }, { enabled: false })).toBe(true);
    expect(resolvePhiCommandButtonDisabled({}, { enabled: false })).toBe(true);
  });
});
