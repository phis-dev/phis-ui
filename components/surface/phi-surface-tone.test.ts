import { describe, expect, it } from "vitest";

import { resolvePhiSurfaceToneMode } from "./phi-surface-tone";

describe("the mode a tone asks for", () => {
  it("is the fixed mode for light and dark", () => {
    expect(resolvePhiSurfaceToneMode("dark", "light")).toBe("dark");
    expect(resolvePhiSurfaceToneMode("dark", "dark")).toBe("dark");
    expect(resolvePhiSurfaceToneMode("light", "dark")).toBe("light");
  });

  it("is the other mode than the page's for inverse, however deep it stands", () => {
    expect(resolvePhiSurfaceToneMode("inverse", "light")).toBe("dark");
    expect(resolvePhiSurfaceToneMode("inverse", "dark")).toBe("light");
  });

  it("is nothing for inherit", () => {
    expect(resolvePhiSurfaceToneMode("inherit", "light")).toBeNull();
  });
});
