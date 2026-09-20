import { describe, expect, it } from "vitest";

import {
  PHI_STORAGE_SIZE_UNIT_BYTES,
  phiBytesToStorageSize,
  phiStorageSizeToBytes,
} from "./storage-size";

describe("storage size", () => {
  it("reads a byte count as the megabytes somebody meant when they wrote it", () => {
    expect(phiBytesToStorageSize(52_428_800)).toBe(50);
    expect(phiBytesToStorageSize(134_217_728)).toBe(128);
    expect(phiBytesToStorageSize(0)).toBe(0);
  });

  it("writes megabytes back as whole bytes", () => {
    expect(phiStorageSizeToBytes(50)).toBe(52_428_800);
    expect(phiStorageSizeToBytes(0.5)).toBe(524_288);
  });

  /*
   * The pair has to be exact for a size anybody would type, because this is the loop a quota survives:
   * shown to an administrator who changes something else on the page, and written back unchanged.
   */
  it("returns a round size unchanged through a full round trip", () => {
    for (const size of [1, 5, 10, 50, 100, 512, 1024]) {
      expect(phiBytesToStorageSize(phiStorageSizeToBytes(size))).toBe(size);
    }
  });

  it("rounds a size that is not a round count of megabytes, and says so in two places", () => {
    // 5 000 000 bytes -- a decimal five megabytes, which is not a whole binary one.
    expect(phiBytesToStorageSize(5_000_000)).toBe(4.77);
  });

  /*
   * Empty is a real answer for a quota: "no limit" is stored as null, and a field that turned it into
   * zero would state the opposite -- a Space that may hold nothing at all.
   */
  it("keeps an absent size absent in both directions", () => {
    expect(phiBytesToStorageSize(null)).toBeNull();
    expect(phiBytesToStorageSize(undefined)).toBeNull();
    expect(phiBytesToStorageSize("50")).toBeNull();
    expect(phiStorageSizeToBytes(null)).toBeNull();
  });

  it("counts a megabyte the way the tools that enforce these limits count it", () => {
    expect(PHI_STORAGE_SIZE_UNIT_BYTES).toBe(2 ** 20);
  });
});
