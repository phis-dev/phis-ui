import { describe, expect, it } from "vitest";

import { resolvePhiShellRegionChrome } from "./shell-region-style";

/**
 * A Region paints only what somebody authored (SHELL.md "Root Background and Shell Backdrop Layers").
 * Every Region used to fall back to an opaque family token, which covered the Theme Root Background
 * outright; the tokens now serve only as the ground a glass Region frosts.
 *
 * An unauthored Region resolves to no ground at all rather than to `transparent`, so it publishes no
 * ground variable and the CSS chain can offer a Chrome Region the Shell Chrome Overlay first.
 */
describe("shell region chrome background", () => {
  it("leaves an unauthored region without a ground in both modes", () => {
    for (const regionKey of ["header_main", "sider_left", "footer_main", "content"] as const) {
      expect(resolvePhiShellRegionChrome(regionKey, undefined, { mode: "light" }).background).toBeUndefined();
      expect(resolvePhiShellRegionChrome(regionKey, undefined, { mode: "dark" }).background).toBeUndefined();
    }
  });

  it("paints the ground the Region itself declares", () => {
    expect(
      resolvePhiShellRegionChrome("header_main", undefined, {
        mode: "light",
        background: "#ff00ff",
      }).background,
    ).toBe("#ff00ff");
  });

  it("paints the ground the Shell record declares for the mode", () => {
    const shellTheme = { light: { background: "#123456" }, dark: { background: "#654321" } };
    expect(resolvePhiShellRegionChrome("sider_left", shellTheme, { mode: "light" }).background).toBe(
      "#123456",
    );
    expect(resolvePhiShellRegionChrome("sider_left", shellTheme, { mode: "dark" }).background).toBe(
      "#654321",
    );
  });

  it("keeps a ground for glass to frost when nothing is authored", () => {
    const chrome = resolvePhiShellRegionChrome("header_main", undefined, {
      mode: "light",
      effect: "glass",
      tokens: { colorBgElevated: "#ffffff" },
    });
    expect(chrome.background).toBe("color-mix(in srgb, #ffffff 36%, transparent)");
    expect(chrome.effectStyle?.backdropFilter).toBeTruthy();
  });
});
