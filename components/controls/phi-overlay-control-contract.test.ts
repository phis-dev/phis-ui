import { describe, expect, it } from "vitest";

import {
  PHI_MODAL_RESPONSIVE_MIN_WIDTH,
  resolvePhiModalResponsiveMode,
  resolvePhiModalWidth,
  resolvePhiOverlayMaskPresentation,
} from "./phi-overlay-control-contract";

describe("the overlay mask", () => {
  it.each([
    [false, false, true],
    [false, true, true],
    [true, false, false],
    [true, true, true],
  ])("allowOutsideInteraction %s, closable %s captures the outside pointer: %s", (
    allowOutsideInteraction,
    closable,
    captures,
  ) => {
    const presentation = resolvePhiOverlayMaskPresentation({
      appearance: "normal",
      allowOutsideInteraction,
      closable,
    });
    expect(presentation.capturesOutsidePointer).toBe(captures);
    expect(presentation.adapterMask.closable).toBe(closable);
    expect("pointerEvents" in presentation.maskStyle).toBe(!captures);
  });

  it("keeps appearance apart from both", () => {
    const presentation = resolvePhiOverlayMaskPresentation({
      appearance: "blurred",
      allowOutsideInteraction: true,
      closable: false,
    });
    expect(presentation.adapterMask.blur).toBe(true);
    expect(presentation.capturesOutsidePointer).toBe(false);
  });
});

describe("the Modal's responsive width", () => {
  it("switches modes on the container scale, not Ant Design's device breakpoints", () => {
    expect(PHI_MODAL_RESPONSIVE_MIN_WIDTH).toEqual({ medium: 377, wide: 610 });
    expect(resolvePhiModalResponsiveMode(376)).toBe("compact");
    expect(resolvePhiModalResponsiveMode(377)).toBe("medium");
    expect(resolvePhiModalResponsiveMode(609)).toBe("medium");
    expect(resolvePhiModalResponsiveMode(610)).toBe("wide");
    expect(resolvePhiModalResponsiveMode(768)).toBe("wide");
  });

  it("resolves every mode of a fully stated width", () => {
    const width = { compact: "calc(100vw - 32px)", medium: 480, wide: 520 };
    expect(resolvePhiModalWidth(width, undefined, "compact")).toBe("calc(100vw - 32px)");
    expect(resolvePhiModalWidth(width, undefined, "medium")).toBe(480);
    expect(resolvePhiModalWidth(width, undefined, "wide")).toBe(520);
  });

  it("cascades an unset mode from the nearest smaller one", () => {
    expect(resolvePhiModalWidth({ compact: 300 }, 720, "wide")).toBe(300);
    expect(resolvePhiModalWidth({ compact: 300, medium: 480 }, 720, "wide")).toBe(480);
  });

  it("gives a mode below every stated one the fallback instead of nothing", () => {
    expect(resolvePhiModalWidth({ medium: 480 }, 720, "compact")).toBe(720);
    expect(resolvePhiModalWidth({ medium: 480 }, 720, "medium")).toBe(480);
    expect(resolvePhiModalWidth({ medium: 480 }, 720, "wide")).toBe(480);
    expect(resolvePhiModalWidth({ wide: 960 }, undefined, "medium")).toBeUndefined();
  });

  it("takes a single width at every mode and the fallback when there is none", () => {
    expect(resolvePhiModalWidth(640, 720, "compact")).toBe(640);
    expect(resolvePhiModalWidth(undefined, 720, "wide")).toBe(720);
  });
});
