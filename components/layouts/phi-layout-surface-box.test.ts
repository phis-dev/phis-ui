import { describe, expect, it } from "vitest";

import { resolvePhiLayoutSignalledSurfaceStyle } from "./phi-layout-surface-box";
import { resolvePhiBaseLayoutChrome } from "./phi-layout-view-model";

const given = { background: { base: { kind: "color" as const, color: "#111111" } }, shadow: "soft" as const };

describe("a Layout whose Surface a Signal changed", () => {
  const chrome = resolvePhiBaseLayoutChrome({ padding: 13, surface: given });
  const style = { position: "relative" as const, display: "grid", ...chrome.style };

  it("draws the signalled ground and keeps the Layout's own entries", () => {
    const next = resolvePhiLayoutSignalledSurfaceStyle(style, given, {
      background: { base: { kind: "color", color: "#222222" } },
    });
    expect(next.style.backgroundColor).toBe("#222222");
    expect(next.style.display).toBe("grid");
    expect(next.style.position).toBe("relative");
    expect(next.style.padding).toBe(chrome.style.padding);
  });

  it("drops a part the signalled Surface no longer has", () => {
    const next = resolvePhiLayoutSignalledSurfaceStyle(style, given, {
      background: given.background,
    });
    expect(next.style.boxShadow).toBeUndefined();
  });

  it("draws nothing of the given Surface once the Signal took all of it away", () => {
    const next = resolvePhiLayoutSignalledSurfaceStyle(style, given, null);
    expect(next.style.backgroundColor).toBeUndefined();
    expect(next.style.boxShadow).toBeUndefined();
    expect(next.style.display).toBe("grid");
  });
});
