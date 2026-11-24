import { describe, expect, it } from "vitest";

import { PHI_SPACE } from "../../theme/antd-css-var-contract";
import {
  PHI_MODAL_WIDTH_BY_CONTROL_SIZE,
  resolvePhiDrawerGeometry,
  resolvePhiModalGeometry,
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

const VIEWPORT_INLINE = `calc(100vw - ${PHI_SPACE.base} - ${PHI_SPACE.base})`;
const VIEWPORT_BLOCK = `calc(100dvh - ${PHI_SPACE.lg} - ${PHI_SPACE.lg})`;

describe("the Modal's geometry", () => {
  it("takes the stated width, else the controlSize step, else leaves Ant Design its default", () => {
    expect(resolvePhiModalGeometry({ size: { width: 420 }, controlSize: "medium" }).width).toBe("420px");
    expect(resolvePhiModalGeometry({ controlSize: "medium" }).width).toBe(`${PHI_MODAL_WIDTH_BY_CONTROL_SIZE.medium}px`);
    expect(resolvePhiModalGeometry({}).width).toBeUndefined();
  });

  it("lets a told size stand over the stated one, axis by axis", () => {
    const geometry = resolvePhiModalGeometry({
      size: { width: 420, height: 300 },
      toldSize: { width: "50vw" },
    });
    expect(geometry.width).toBe("50vw");
    expect(geometry.blockSize).toBe("300px");
  });

  it("holds every bound inside the viewport, and is held by the viewport where it states none", () => {
    expect(resolvePhiModalGeometry({})).toMatchObject({
      minWidth: undefined,
      maxWidth: VIEWPORT_INLINE,
      minBlockSize: undefined,
      maxBlockSize: VIEWPORT_BLOCK,
    });
    const bounded = resolvePhiModalGeometry({
      minSize: { width: 400, height: 200 },
      maxSize: { width: "90vw", height: 640 },
    });
    expect(bounded.minWidth).toBe(`min(400px, ${VIEWPORT_INLINE})`);
    expect(bounded.maxWidth).toBe(`min(90vw, ${VIEWPORT_INLINE})`);
    expect(bounded.minBlockSize).toBe(`min(200px, ${VIEWPORT_BLOCK})`);
    expect(bounded.maxBlockSize).toBe(`min(640px, ${VIEWPORT_BLOCK})`);
  });
});

describe("the Drawer's geometry", () => {
  it("draws the axis it opens along, and not the other", () => {
    const pair = { size: { width: 377, height: 200 }, minSize: { width: 300 }, maxSize: { width: 600, height: 400 } };
    expect(resolvePhiDrawerGeometry({ ...pair, placement: "right" })).toEqual({
      size: 377,
      resizeMaxSize: 600,
      style: { minWidth: "300px", maxWidth: "600px" },
    });
    expect(resolvePhiDrawerGeometry({ ...pair, placement: "bottom" })).toEqual({
      size: 200,
      resizeMaxSize: 400,
      style: { maxHeight: "400px" },
    });
  });

  it("hands a length in another unit through as CSS", () => {
    expect(resolvePhiDrawerGeometry({ size: { width: "min(20rem, 85vw)" }, placement: "right" }).size).toBe("min(20rem, 85vw)");
  });

  it("hands the resize a limit only in pixels, and the panel its maximum in any unit", () => {
    expect(resolvePhiDrawerGeometry({ maxSize: { width: "80vw" }, placement: "left" })).toEqual({
      size: undefined,
      resizeMaxSize: undefined,
      style: { maxWidth: "80vw" },
    });
  });
});
