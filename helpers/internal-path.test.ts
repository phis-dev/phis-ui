import { describe, expect, it } from "vitest";

import { readPhiInternalPath } from "./internal-path";

/*
 * Every reader of a `next` or `path` that ends in a browser navigation shares this check, so the
 * shapes an attacker would send are named once here rather than remembered at each reader.
 */
describe("readPhiInternalPath", () => {
  it("accepts a path on this Site, with its query and fragment", () => {
    expect(readPhiInternalPath("/app/security?tab=2#factors")).toBe("/app/security?tab=2#factors");
    expect(readPhiInternalPath("  /de/kontakt ")).toBe("/de/kontakt");
    expect(readPhiInternalPath("/")).toBe("/");
  });

  it("refuses anything that is not a string or does not start with one slash", () => {
    expect(readPhiInternalPath(null)).toBeNull();
    expect(readPhiInternalPath(42)).toBeNull();
    expect(readPhiInternalPath("")).toBeNull();
    expect(readPhiInternalPath("app")).toBeNull();
    expect(readPhiInternalPath("https://evil.example/")).toBeNull();
    expect(readPhiInternalPath("javascript:alert(1)")).toBeNull();
  });

  it("refuses the scheme-relative spellings a browser would take off this origin", () => {
    expect(readPhiInternalPath("//evil.example/x")).toBeNull();
    expect(readPhiInternalPath("/\\evil.example/x")).toBeNull();
    expect(readPhiInternalPath("/app\\..\\x")).toBeNull();
  });

  it("refuses control characters", () => {
    expect(readPhiInternalPath("/app\u0000")).toBeNull();
    expect(readPhiInternalPath("/app\nSet-Cookie: x")).toBeNull();
    expect(readPhiInternalPath("/app\u007f")).toBeNull();
  });

  it("keeps a percent-encoded backslash, which stays a path segment", () => {
    expect(readPhiInternalPath("/%5Cevil.example")).toBe("/%5Cevil.example");
  });
});
