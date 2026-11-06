import { describe, expect, it } from "vitest";

import { PHI_GLASS_LAYOUT_EFFECT_DEFINITIONS, resolvePhiLayoutEffectStyle } from "../../../helpers/layout-style";
import { normalizePhiBackgroundWidgetConfig, resolvePhiBackgroundWidgetStyle } from "./background";

const linear = { kind: "gradient", direction: "160deg", stops: [{ color: "#161322", percent: 0 }, { color: "#4D0F11", percent: 100 }] };

describe("gradient glows", () => {
  it("lays the fields of light over the linear gradient, first on top", () => {
    const style = resolvePhiBackgroundWidgetStyle({
      base: { ...linear, glows: [
        { color: "#E59544", opacity: 0.35, x: "82%", y: "8%", width: "60%", height: "50%" },
        { color: "#8D1B20", x: "10%", y: "70%", width: "55%", fade: 60 },
      ] },
    });
    expect(style.backgroundImage).toBe(
      "radial-gradient(60% 50% at 82% 8%, color-mix(in srgb, #E59544 35%, transparent) 0%, transparent 70%), "
      + "radial-gradient(55% 55% at 10% 70%, #8D1B20 0%, transparent 60%), "
      + "linear-gradient(160deg, #161322 0%, #4D0F11 100%)",
    );
  });

  it("leaves out a field it cannot read and keeps the rest", () => {
    const config = normalizePhiBackgroundWidgetConfig({
      base: { ...linear, glows: [{ color: "#fff", x: "calc(1px)", y: "0%", width: "50%" }, { color: "#fff", x: "0%", y: "0%", width: 40, opacity: 3 }] },
    });
    expect(config.base.kind === "gradient" ? config.base.glows : null).toEqual([{ color: "#fff", x: "0%", y: "0%", width: "40%", opacity: 1 }]);
  });

  it("is the plain linear gradient without glows", () => {
    expect(resolvePhiBackgroundWidgetStyle({ base: linear }).backgroundImage).toBe("linear-gradient(160deg, #161322 0%, #4D0F11 100%)");
  });
});

describe("clear glass", () => {
  it("frosts with almost none of the ground's colour", () => {
    const style = resolvePhiLayoutEffectStyle({ effect: "clear", background: "#ffffff" });
    expect(style?.backdropFilter).toBe(PHI_GLASS_LAYOUT_EFFECT_DEFINITIONS.clear.filter);
    expect(style?.backgroundColor).toBe("color-mix(in srgb, #ffffff 22%, transparent)");
  });
});
