import { describe, expect, it } from "vitest";

import {
  buildPhiThemeGradientTokens,
  readPhiThemeGradient,
  readPhiThemeGradientKey,
  resolvePhiThemeGradients,
  resolvePhiThemeGradientText,
  resolvePhiThemeGradientWorstContrast,
} from "./phi-theme-gradients";
import { mergePhiThemePalettes } from "./phi-theme-presets";

const token = {
  colorPrimary: "#78171b",
  colorPrimaryHover: "#8d1b20",
  colorPrimaryActive: "#4d0f11",
  colorWarning: "#e59544",
  colorWarningHover: "#f1c777",
  colorWarningActive: "#c97a2c",
  colorInfo: "#63598a",
};

describe("theme gradients", () => {
  it("derives every slot from the mode's colours where the palette states none", () => {
    const gradients = resolvePhiThemeGradients(undefined, token);

    expect(gradients.gradient1.stops.map((stop) => stop.color)).toEqual(["#8d1b20", "#4d0f11"]);
    expect(gradients.gradient2.stops.map((stop) => stop.color)).toEqual(["#f1c777", "#c97a2c"]);
  });

  it("takes a stated slot over the derived one and ignores one it cannot read", () => {
    const gradients = resolvePhiThemeGradients({
      gradient1: { direction: "90deg", stops: [{ color: "#000", percent: 0 }, { color: "#fff", percent: 100 }] },
      gradient2: { direction: "sideways", stops: [] } as never,
    }, token);

    expect(gradients.gradient1.direction).toBe("90deg");
    expect(gradients.gradient2.stops[0]!.color).toBe("#f1c777");
  });

  it("writes each slot and its text as tokens, and leaves primary Buttons alone unless asked", () => {
    const plain = buildPhiThemeGradientTokens({ gradients: undefined, token });
    expect(plain.phiGradient1).toBe("linear-gradient(135deg, #8d1b20 0%, #4d0f11 100%)");
    expect(plain.phiGradient1Text).toBe("#ffffff");
    expect(plain.phiPrimaryButtonGradient).toBe("none");
    expect(plain.phiPrimaryButtonGradientHover).toBe("none");
    expect(plain.phiPrimaryButtonGradientText).toBeUndefined();

    const filled = buildPhiThemeGradientTokens({ gradients: undefined, token, primaryButtonGradient: "gradient2" });
    expect(filled.phiPrimaryButtonGradient).toBe(filled.phiGradient2);
    expect(filled.phiPrimaryButtonGradientHover).toBe("brightness(1.18) saturate(1.15)");
    expect(filled.phiPrimaryButtonGradientText).toBe(filled.phiGradient2Text);
  });

  it("picks the text that reads on the whole run and measures the weakest stop", () => {
    const gold = resolvePhiThemeGradients(undefined, token).gradient2;
    expect(resolvePhiThemeGradientText(gold)).toBe("rgba(0, 0, 0, 0.88)");
    expect(resolvePhiThemeGradientWorstContrast(gold, "#ffffff")!).toBeLessThan(4.5);
    expect(resolvePhiThemeGradientText({ ...gold, text: "#123456" })).toBe("#123456");
  });

  it("reads keys and gradients strictly", () => {
    expect(readPhiThemeGradientKey("gradient3")).toBe("gradient3");
    expect(readPhiThemeGradientKey("gradient9")).toBeUndefined();
    expect(readPhiThemeGradient({ direction: "45deg", stops: [{ color: "#fff", percent: 0 }] })).toBeNull();
    expect(readPhiThemeGradient({
      direction: "to right",
      stops: [{ color: "#fff", percent: -5 }, { color: "#000", percent: 140 }],
    })?.stops.map((stop) => stop.percent)).toEqual([0, 100]);
  });

  it("merges a Site's slots over its palette block's, per mode", () => {
    const merged = mergePhiThemePalettes(
      { modes: { dark: { gradients: { gradient1: { direction: "90deg", stops: [{ color: "#111", percent: 0 }, { color: "#222", percent: 100 }] } } } } },
      { modes: { dark: { gradients: { gradient2: { direction: "90deg", stops: [{ color: "#333", percent: 0 }, { color: "#444", percent: 100 }] } } } } },
    );
    expect(Object.keys(merged.modes?.dark?.gradients ?? {})).toEqual(["gradient1", "gradient2"]);
  });
});
