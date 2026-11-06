import { describe, expect, it } from "vitest";

import {
  buildPhiThemeGradientTokens,
  readPhiThemeGradient,
  readPhiThemeGradientKey,
  resolvePhiThemeGradients,
  resolvePhiThemeGradientText,
  resolvePhiThemeGradientWorstContrast,
  resolvePhiThemeGradientContrast,
  resolvePhiThemeGradientInks,
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

  it("picks the Theme's text colour that reads on the whole run, or the one the slot states", () => {
    const inks = { light: "#ffffff", dark: "rgba(0, 0, 0, 0.88)" };
    const gold = resolvePhiThemeGradients(undefined, token).gradient2;
    expect(resolvePhiThemeGradientText(gold, inks)).toBe("rgba(0, 0, 0, 0.88)");
    expect(resolvePhiThemeGradientWorstContrast(gold, "#ffffff")!).toBeLessThan(4.5);
    expect(resolvePhiThemeGradientText({ ...gold, text: "light" }, inks)).toBe("#ffffff");
  });

  it("takes the Theme's text colours: the light solid text, and the darker of text and ground", () => {
    expect(resolvePhiThemeGradientInks({ colorTextLightSolid: "#fffaf0", colorText: "rgba(34, 58, 97, 0.88)", colorBgBase: "#ffffff" }))
      .toEqual({ light: "#fffaf0", dark: "rgba(34, 58, 97, 0.88)" });
    expect(resolvePhiThemeGradientInks({ colorTextLightSolid: "#ffffff", colorText: "rgba(255, 255, 255, 0.85)", colorBgBase: "#0b1020" }))
      .toEqual({ light: "#ffffff", dark: "#0b1020" });
  });

  it("keeps only a tone as a slot's text, never a colour", () => {
    const run = { direction: "90deg", stops: [{ color: "#000", percent: 0 }, { color: "#fff", percent: 100 }] };
    expect(readPhiThemeGradient({ ...run, text: "dark" })?.text).toBe("dark");
    expect(readPhiThemeGradient({ ...run, text: "#123456" })?.text).toBeUndefined();
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

describe("gradient label contrast", () => {
  const run = { direction: "90deg" as const, stops: [{ color: "#4D0F11", percent: 0 }, { color: "#E59544", percent: 100 }] };

  it("names the stop the label reads worst on", () => {
    const contrast = resolvePhiThemeGradientContrast(run, "#ffffff")!;
    expect(contrast.stopIndex).toBe(1);
    expect(contrast.color).toBe("#E59544");
    expect(contrast.ratio).toBeLessThan(4.5);
  });

  it("finds it under the pointer, where the run is lighter and white reads worse", () => {
    const rest = resolvePhiThemeGradientContrast({ ...run, stops: [run.stops[1]!, run.stops[1]!] }, "#ffffff")!;
    expect(rest.hover).toBe(true);
  });

  it("lays a translucent label on the stop before it measures", () => {
    const solid = resolvePhiThemeGradientWorstContrast(run, "#000000")!;
    const translucent = resolvePhiThemeGradientWorstContrast(run, "rgba(0, 0, 0, 0.5)")!;
    expect(translucent).toBeLessThan(solid);
  });

  it("says nothing about a colour it cannot read", () => {
    expect(resolvePhiThemeGradientContrast(run, "var(--ant-color-text)")).toBeNull();
  });
});

describe("a slot that states only its text", () => {
  it("keeps the derived run and takes the chosen tone", () => {
    const derived = resolvePhiThemeGradients(undefined, { colorPrimary: "#8d1b20" }).gradient1;
    const chosen = resolvePhiThemeGradients({ gradient1: { text: "dark" } }, { colorPrimary: "#8d1b20" }).gradient1;
    expect(chosen.stops).toEqual(derived.stops);
    expect(chosen.text).toBe("dark");
  });
});
