import { describe, expect, it } from "vitest";

import { readPhiBackgroundPatternInkFromCss, serializePhiBackgroundPatternInkCss } from "./background";
import type { PhiBackgroundPatternInk } from "./background-pattern-contract";
import {
  PHI_BACKGROUND_COLOR_OVERLAY_DEFAULT_INK,
  PHI_BACKGROUND_PATTERN_DEFAULT_INK,
  mergePhiBackgroundPatternInkEdit,
  resolvePhiBackgroundOverlayInk,
  switchPhiBackgroundPatternInkKind,
  withPhiBackgroundPatternInkDirection,
} from "./background-pattern-live";

const storedGradient: PhiBackgroundPatternInk = {
  kind: "gradient",
  direction: "100deg",
  stops: [
    { color: "rgba(0, 0, 0, 0.8)", percent: 0 },
    { color: "var(--phi-color-primary)", percent: 30 },
    { color: "#336699", percent: 70 },
    { color: "transparent", percent: 100 },
  ],
};

describe("Overlay ink: colour or gradient", () => {
  it("recognises a stored gradient ink as gradient, with its four stops and direction", () => {
    const ink = resolvePhiBackgroundOverlayInk({ kind: "color", ink: storedGradient });
    expect(ink.kind).toBe("gradient");
    const round = readPhiBackgroundPatternInkFromCss(serializePhiBackgroundPatternInkCss(storedGradient));
    expect(round).toEqual(storedGradient);
  });

  it("keeps an absent ink meaning the default of its kind", () => {
    expect(resolvePhiBackgroundOverlayInk({ kind: "color" })).toBe(PHI_BACKGROUND_COLOR_OVERLAY_DEFAULT_INK);
    expect(resolvePhiBackgroundOverlayInk({ kind: "pattern" })).toBe(PHI_BACKGROUND_PATTERN_DEFAULT_INK);
  });

  it("a direction change writes only the direction", () => {
    const next = withPhiBackgroundPatternInkDirection(storedGradient, "to top");
    expect(next).toEqual({ ...storedGradient, direction: "to top" });
    expect((next as { stops: unknown }).stops).toBe((storedGradient as { stops: unknown }).stops);
  });

  it("colour to gradient to colour keeps the remembered values", () => {
    const colour: PhiBackgroundPatternInk = { kind: "color", color: "#ff0000" };
    const fresh = switchPhiBackgroundPatternInkKind(colour, "gradient", null);
    expect(fresh).toEqual({
      kind: "gradient",
      direction: "to bottom",
      stops: [
        { color: "#ff0000", percent: 0 },
        { color: "transparent", percent: 100 },
      ],
    });
    expect(switchPhiBackgroundPatternInkKind(colour, "gradient", storedGradient)).toBe(storedGradient);
    expect(switchPhiBackgroundPatternInkKind(storedGradient, "color", colour)).toBe(colour);
    expect(switchPhiBackgroundPatternInkKind(storedGradient, "color", null)).toEqual({
      kind: "color",
      color: "rgba(0, 0, 0, 0.8)",
    });
  });

  it("an untouched value is unchanged: no switch and no edit writes anything new", () => {
    expect(switchPhiBackgroundPatternInkKind(storedGradient, "gradient", null)).toBe(storedGradient);
    expect(mergePhiBackgroundPatternInkEdit(storedGradient, null)).toBeNull();
  });

  it("a stop edit through the picker keeps the ink's direction", () => {
    const edited = readPhiBackgroundPatternInkFromCss("linear-gradient(90deg, #111111 0%, #222222 100%)");
    const merged = mergePhiBackgroundPatternInkEdit(storedGradient, edited);
    expect(merged).toMatchObject({ kind: "gradient", direction: "100deg" });
  });
});
