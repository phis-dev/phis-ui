import { describe, expect, it } from "vitest";

import {
  readPhiGeometryProfileLength,
  writePhiGeometryProfileLength,
} from "./phi-geometry-control";

/*
 * The Control edits one profile at a time and leaves the other two where the author put them. Narrow
 * first: the cascade runs upward from `compact`, so the empty field above it shows what stands there.
 */
describe("a stored length, one profile at a time", () => {
  it("reads a plain length as stated at compact and inherited above it", () => {
    expect(readPhiGeometryProfileLength(320, "compact")).toEqual({ stated: 320, inherited: null });
    expect(readPhiGeometryProfileLength(320, "medium")).toEqual({ stated: null, inherited: 320 });
    expect(readPhiGeometryProfileLength(320, "wide")).toEqual({ stated: null, inherited: 320 });
  });

  it("reads a profile value with the cascade underneath it", () => {
    const stored = { compact: 200, wide: "40rem" };
    expect(readPhiGeometryProfileLength(stored, "medium")).toEqual({ stated: null, inherited: 200 });
    expect(readPhiGeometryProfileLength(stored, "wide")).toEqual({ stated: "40rem", inherited: 200 });
  });

  it("writes compact into a plain length as the plain length", () => {
    expect(writePhiGeometryProfileLength(320, "compact", 240)).toBe(240);
    expect(writePhiGeometryProfileLength(undefined, "compact", 240)).toBe(240);
    expect(writePhiGeometryProfileLength(320, "compact", null)).toBeNull();
  });

  it("turns a plain length into profiles when a wider room gets its own value", () => {
    expect(writePhiGeometryProfileLength(320, "wide", 640)).toEqual({ compact: 320, wide: 640 });
    expect(writePhiGeometryProfileLength(null, "medium", "50%")).toEqual({ medium: "50%" });
  });

  it("leaves the other profiles where they were", () => {
    expect(writePhiGeometryProfileLength({ compact: 200, wide: 640 }, "medium", 400))
      .toEqual({ compact: 200, medium: 400, wide: 640 });
  });

  /* The smallest stored form that means the same: what names only compact is the plain length. */
  it("collapses back to the plain length, and to nothing", () => {
    expect(writePhiGeometryProfileLength({ compact: 200, wide: 640 }, "wide", null)).toBe(200);
    expect(writePhiGeometryProfileLength({ wide: 640 }, "wide", undefined)).toBeNull();
  });
});
