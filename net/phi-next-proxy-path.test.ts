import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { encodePhiProxyPathSegments, PhiProxyPathError } from "./phi-next-proxy";

describe("the path a proxy door forwards", () => {
  it("keeps a decoded slash inside its segment instead of opening a new one", () => {
    // What Next hands over for `/api/site/x%2F..%2F..%2Fv1%2Fx`.
    expect(encodePhiProxyPathSegments(["x/../../v1/x"])).toBe("/x%2F..%2F..%2Fv1%2Fx");
    const target = new URL(`http://server.test/api/site${encodePhiProxyPathSegments(["x/../../v1/x"])}`);
    expect(target.pathname.startsWith("/api/site/")).toBe(true);
  });

  it("keeps a decoded query or fragment mark in the path", () => {
    expect(encodePhiProxyPathSegments(["a?b", "c#d"])).toBe("/a%3Fb/c%23d");
  });

  it("refuses segments URL parsing would resolve as steps", () => {
    expect(() => encodePhiProxyPathSegments(["a", ".."])).toThrow(PhiProxyPathError);
    expect(() => encodePhiProxyPathSegments(["."])).toThrow(PhiProxyPathError);
    expect(() => encodePhiProxyPathSegments(["a", ""])).toThrow(PhiProxyPathError);
  });

  it("forwards an ordinary path as it was", () => {
    expect(encodePhiProxyPathSegments(["media", "12", "variants"])).toBe("/media/12/variants");
    expect(encodePhiProxyPathSegments(undefined)).toBe("");
  });

  it("encodes a percent sign, so `%2e%2e` cannot become a step either", () => {
    const suffix = encodePhiProxyPathSegments(["%2e%2e", "v1"]);
    expect(new URL(`http://server.test/api/site${suffix}`).pathname).toBe("/api/site/%252e%252e/v1");
  });
});
