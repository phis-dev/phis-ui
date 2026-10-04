import { describe, expect, it } from "vitest";

import {
  buildPhiSpacingScaleOptions,
  resolvePhiSpacingScaleKey,
  resolvePhiSpacingScaleValue,
} from "./spacing-options";

/**
 * One scale for a padding and a gap. Two families used to exist, and a gap written on one was not
 * recognized by the field that offered the other: the Inspector showed nothing selected.
 */
describe("the spacing scale", () => {
  it("offers each step as the value it writes", () => {
    expect(resolvePhiSpacingScaleValue("base")).toBe("var(--ant-padding)");
    expect(buildPhiSpacingScaleOptions().find((option) => option.label === "base")?.value).toBe("var(--ant-padding)");
  });

  it("recognizes a written step however it is written", () => {
    expect(resolvePhiSpacingScaleKey("var(--ant-padding)")).toBe("base");
    expect(resolvePhiSpacingScaleKey(21)).toBe("base");
    expect(resolvePhiSpacingScaleKey("21px")).toBe("base");
    expect(resolvePhiSpacingScaleKey("0")).toBe("none");
  });

  it("does not know Ant Design's margin family, which Phi code does not write", () => {
    expect(resolvePhiSpacingScaleKey("var(--ant-margin)")).toBeNull();
  });
});
