import { describe, expect, it } from "vitest";

import {
  applyPhiRenderableBlockSignal,
  type PhiRenderableBlockRuntimeState,
} from "./renderable-block-runtime";

const base: PhiRenderableBlockRuntimeState = {
  blockId: null,
  receiver: null,
  signalScope: null,
  surface: {
    background: { base: { kind: "color", color: "#fff" }, overlay: null, filter: null, motion: null },
    borderSource: "theme",
    shadow: "soft",
  },
};

describe("a Signal for a part of the Surface", () => {
  it("replaces that part and keeps the others", () => {
    const next = applyPhiRenderableBlockSignal(base, "background", "change", {
      base: { kind: "color", color: "#000" },
    });
    expect(next.surface?.background?.base).toEqual({ kind: "color", color: "#000" });
    expect(next.surface?.borderSource).toBe("theme");
    expect(next.surface?.shadow).toBe("soft");
  });

  it("draws a line sent by Signal whatever source the stored Surface names", () => {
    const next = applyPhiRenderableBlockSignal(base, "border", "change", {
      borderWidth: 2,
      borderStyle: "solid",
      borderColor: "#f00",
    });
    expect(next.surface?.borderSource).toBe("custom");
    expect(next.surface?.border).toMatchObject({ borderWidth: 2, borderColor: "#f00" });
  });

  it("takes a part away for null", () => {
    const next = applyPhiRenderableBlockSignal(base, "shadow", "change", null);
    expect(next.surface?.shadow).toBeUndefined();
    expect(next.surface?.background).toBeDefined();
  });

  it("ignores a value no part reads", () => {
    expect(applyPhiRenderableBlockSignal(base, "background", "change", "red")).toBe(base);
    expect(applyPhiRenderableBlockSignal(base, "shadow", "change", "huge").surface?.shadow).toBeUndefined();
  });

  it("gives a block without a Surface one", () => {
    const next = applyPhiRenderableBlockSignal({ ...base, surface: undefined }, "shadow", "change", "strong");
    expect(next.surface).toEqual({ shadow: "strong" });
  });
});
