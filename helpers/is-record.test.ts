import { describe, expect, it } from "vitest";
import { isPhiRecord } from "./is-record";

describe("isPhiRecord", () => {
  it("accepts plain objects", () => {
    expect(isPhiRecord({})).toBe(true);
    expect(isPhiRecord({ key: "value" })).toBe(true);
    expect(isPhiRecord(Object.create(null))).toBe(true);
  });

  it("rejects null, arrays and primitives", () => {
    expect(isPhiRecord(null)).toBe(false);
    expect(isPhiRecord(undefined)).toBe(false);
    expect(isPhiRecord([])).toBe(false);
    expect(isPhiRecord([{ key: "value" }])).toBe(false);
    expect(isPhiRecord("text")).toBe(false);
    expect(isPhiRecord("")).toBe(false);
    expect(isPhiRecord(42)).toBe(false);
    expect(isPhiRecord(0)).toBe(false);
    expect(isPhiRecord(true)).toBe(false);
  });

  it("rejects functions", () => {
    expect(isPhiRecord(() => undefined)).toBe(false);
  });
});
