import { describe, expect, it } from "vitest";

import { PHI_BACKGROUND_BLUR_FILTER } from "../components/widgets/config/background";
import { readPhiSurface } from "../types/surface";
import { composePhiModePaint, resolvePhiModeValue } from "./mode-paint";
import { resolvePhiSurfaceStyle } from "./surface-style";

describe("paint per mode", () => {
  it("gates a value that differs and leaves one that does not", () => {
    expect(resolvePhiModeValue("red", "red")).toBe("red");
    expect(resolvePhiModeValue("red", "blue")).toBe("var(--phi-mode-light-gate, blue) var(--phi-mode-dark-gate, red)");
  });

  it("gives the mode that states nothing the property's neutral value", () => {
    const style = composePhiModePaint({ backgroundImage: "url(a.jpg)" }, { backgroundColor: "#000" });
    expect(style.backgroundImage).toBe("var(--phi-mode-light-gate, none) var(--phi-mode-dark-gate, url(a.jpg))");
    expect(style.backgroundColor).toBe("var(--phi-mode-light-gate, #000) var(--phi-mode-dark-gate, transparent)");
  });

  it("keeps the dark ground through reading a stored Surface", () => {
    const surface = readPhiSurface({
      background: { base: { kind: "color", color: "#fff" } },
      backgroundDark: { base: { kind: "color", color: "#111" } },
    });
    expect(surface?.backgroundDark?.base).toEqual({ kind: "color", color: "#111" });
  });

  it("draws both grounds on the box, the page's mode picking", () => {
    const resolved = resolvePhiSurfaceStyle(readPhiSurface({
      background: { base: { kind: "color", color: "#fff" } },
      backgroundDark: { base: { kind: "color", color: "#111" } },
    }));
    expect(resolved.style.backgroundColor).toBe(resolvePhiModeValue("#fff", "#111"));
    expect(resolved.paintsGround).toBe(true);
  });

  it("softens per mode on the ground layer when only one mode blurs", () => {
    const resolved = resolvePhiSurfaceStyle(readPhiSurface({
      background: { base: { kind: "gradient", direction: "to right", stops: [{ color: "#fff", percent: 0 }, { color: "#eee", percent: 100 }] } },
      backgroundDark: { base: { kind: "gradient", direction: "to right", stops: [{ color: "#000", percent: 0 }, { color: "#222", percent: 100 }] }, filter: "blur" },
    }));
    expect(resolved.ground?.filter).toBe(resolvePhiModeValue("none", PHI_BACKGROUND_BLUR_FILTER));
    expect(String(resolved.ground?.paint.backgroundImage)).toContain("--phi-mode-light-gate");
  });

  it("is the one ground as before without a dark one", () => {
    const resolved = resolvePhiSurfaceStyle(readPhiSurface({ background: { base: { kind: "color", color: "#fff" } } }));
    expect(resolved.style.backgroundColor).toBe("#fff");
  });
});
