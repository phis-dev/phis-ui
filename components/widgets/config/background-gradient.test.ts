import { describe, expect, it } from "vitest";

import {
  normalizePhiBackgroundWidgetConfig,
  readPhiBackgroundBaseCss,
  readPhiBackgroundGradientCss,
  readPhiBackgroundPatternInkFromCss,
} from "./background";

/**
 * A CSS gradient becomes a gradient Base or is refused. It never becomes a colour: stored that way it
 * would be edited as a flat swatch that has lost its stops.
 */
describe("readPhiBackgroundGradientCss", () => {
  it("reads a first colour stop as a stop, not as a direction", () => {
    expect(readPhiBackgroundGradientCss("linear-gradient(red 0%, blue 100%)")).toEqual({
      gradient: {
        kind: "gradient",
        direction: "to bottom",
        stops: [{ color: "red", percent: 0 }, { color: "blue", percent: 100 }],
      },
    });
  });

  it("reads an angle and decimal stop positions", () => {
    expect(readPhiBackgroundGradientCss("linear-gradient(90deg, red 12.5%, blue 87.5%)")?.gradient)
      .toEqual({
        kind: "gradient",
        direction: "90deg",
        stops: [{ color: "red", percent: 12.5 }, { color: "blue", percent: 87.5 }],
      });
  });

  it("reads a side direction and colours with parentheses", () => {
    expect(readPhiBackgroundGradientCss(
      "linear-gradient(to right, rgb(16, 142, 233) 0%, rgba(0 0 0 / 50%) 100%)",
    )?.gradient).toEqual({
      kind: "gradient",
      direction: "to right",
      stops: [{ color: "rgb(16, 142, 233)", percent: 0 }, { color: "rgba(0 0 0 / 50%)", percent: 100 }],
    });
  });

  it("converts other angle units to degrees", () => {
    expect(readPhiBackgroundGradientCss("linear-gradient(0.25turn, red, blue)")?.gradient?.direction)
      .toBe("90deg");
  });

  it("places stops without a position the way CSS does", () => {
    expect(readPhiBackgroundGradientCss("linear-gradient(red, green, blue)")?.gradient?.stops).toEqual([
      { color: "red", percent: 0 },
      { color: "green", percent: 50 },
      { color: "blue", percent: 100 },
    ]);
  });

  it("is not asked about a string that is no gradient", () => {
    expect(readPhiBackgroundGradientCss("#ff0000")).toBeNull();
    expect(readPhiBackgroundGradientCss("url(\"/a.png\")")).toBeNull();
  });

  it("refuses a gradient a Base cannot hold", () => {
    for (const css of [
      "linear-gradient(red 0%)",
      "linear-gradient(to top right, red, blue)",
      "linear-gradient(90deg, red 10px, blue)",
      "linear-gradient(90deg, red 10% 20%, blue)",
      "linear-gradient(90deg, red, blue",
      "radial-gradient(red, blue)",
    ]) {
      expect(readPhiBackgroundGradientCss(css)?.problem, css).toEqual(expect.any(String));
    }
  });
});

describe("gradient CSS in the Base readers", () => {
  it("never stores an unreadable gradient as a colour", () => {
    const css = "linear-gradient(to top right, red, blue)";
    expect(readPhiBackgroundBaseCss(css)).toBeNull();
    expect(normalizePhiBackgroundWidgetConfig(css).base).toEqual({ kind: "none" });
    expect(normalizePhiBackgroundWidgetConfig({ background: css }).base).toEqual({ kind: "none" });
    expect(readPhiBackgroundPatternInkFromCss(css)).toBeNull();
  });

  it("still reads a colour and a readable gradient", () => {
    expect(readPhiBackgroundBaseCss("#101018")).toEqual({ kind: "color", color: "#101018" });
    expect(normalizePhiBackgroundWidgetConfig({
      background: "linear-gradient(90deg, red 12.5%, blue 87.5%)",
    }).base.kind).toBe("gradient");
  });
});
