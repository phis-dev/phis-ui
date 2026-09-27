import { describe, expect, it } from "vitest";

import {
  PHI_MEDIA_UPLOAD_PART_ATTEMPTS,
  isPhiMediaUploadPartWorthRepeating,
  isUsablePhiMediaUploadPlan,
  resolvePhiMediaUploadPartProgress,
  resolvePhiMediaUploadPartRange,
  resolvePhiMediaUploadStoredProgress,
} from "./media-upload-flow";

const MIB = 1024 * 1024;

/**
 * The arithmetic and the policy behind sending a body in parts.
 *
 * What is proven here is what can be wrong without anybody noticing: a range that drops the last bytes,
 * a retry that counts its progress twice, and a refusal repeated until it times out. Whether a signed
 * part URL is actually accepted is a live question and belongs to the browser tests.
 */
describe("which bytes one part covers", () => {
  const PART = 16 * MIB;

  it("numbers parts from one and cuts them at the part size", () => {
    expect(resolvePhiMediaUploadPartRange(1, PART, 40 * MIB)).toEqual({ start: 0, end: PART });
    expect(resolvePhiMediaUploadPartRange(2, PART, 40 * MIB)).toEqual({ start: PART, end: 2 * PART });
  });

  it("gives the last part the remainder rather than a full part", () => {
    expect(resolvePhiMediaUploadPartRange(3, PART, 40 * MIB)).toEqual({ start: 2 * PART, end: 40 * MIB });
  });

  it("covers every byte exactly once, for a size that is not a multiple of the part", () => {
    const size = 40 * MIB + 7;
    const count = Math.ceil(size / PART);
    let covered = 0;
    let previousEnd = 0;
    for (let partNumber = 1; partNumber <= count; partNumber += 1) {
      const { start, end } = resolvePhiMediaUploadPartRange(partNumber, PART, size);
      expect(start).toBe(previousEnd);
      covered += end - start;
      previousEnd = end;
    }
    expect(covered).toBe(size);
    expect(previousEnd).toBe(size);
  });

  it("yields nothing past the end rather than reading beyond the file", () => {
    expect(resolvePhiMediaUploadPartRange(99, PART, 10 * MIB)).toEqual({ start: 10 * MIB, end: 10 * MIB });
    expect(resolvePhiMediaUploadPartRange(1, PART, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe("whether a refused part is sent again", () => {
  it("repeats a transport failure and a server that could not", () => {
    expect(isPhiMediaUploadPartWorthRepeating(0)).toBe(true);
    expect(isPhiMediaUploadPartWorthRepeating(500)).toBe(true);
    expect(isPhiMediaUploadPartWorthRepeating(503)).toBe(true);
  });

  it("does not repeat a refusal, because a rejected signature stays rejected", () => {
    for (const status of [400, 403, 404, 409, 412]) {
      expect(isPhiMediaUploadPartWorthRepeating(status)).toBe(false);
    }
  });

  it("gives up after a bounded number of attempts rather than forever", () => {
    expect(PHI_MEDIA_UPLOAD_PART_ATTEMPTS).toBeGreaterThan(1);
    expect(PHI_MEDIA_UPLOAD_PART_ATTEMPTS).toBeLessThan(10);
  });
});

describe("how far along the whole body is", () => {
  it("sums what every part reported, so one large part in flight still moves it", () => {
    expect(resolvePhiMediaUploadPartProgress(new Map([[1, 5 * MIB]]), 20 * MIB)).toBe(25);
    expect(resolvePhiMediaUploadPartProgress(new Map([[1, 5 * MIB], [2, 5 * MIB]]), 20 * MIB)).toBe(50);
  });

  it("never reports past complete, whatever the parts claim", () => {
    // A part that reported and then started again would otherwise be counted twice.
    expect(resolvePhiMediaUploadPartProgress(new Map([[1, 30 * MIB]]), 20 * MIB)).toBe(100);
  });

  it("answers nothing for an empty body instead of dividing by it", () => {
    expect(resolvePhiMediaUploadPartProgress(new Map([[1, 0]]), 0)).toBe(0);
    expect(resolvePhiMediaUploadPartProgress(new Map(), 20 * MIB)).toBe(0);
  });
});

/**
 * Carrying on a body whose page went away.
 *
 * Two things can go wrong here and neither would look like a fault. A part already at the storage that is
 * not counted makes the bar start at zero, so the one visible sign that the reload cost nothing is gone.
 * And a plan with no part left to send -- a body that finished arriving and was never finalized -- read as
 * unusable would send the whole thing again for no reason anybody could see.
 */
describe("what an earlier attempt already delivered", () => {
  const PART = 16 * MIB;

  it("counts a stored part as the bytes it covers, from the same addressing rule", () => {
    const stored = resolvePhiMediaUploadStoredProgress([{ partNumber: 1, eTag: '"a"' }], PART, 20 * MIB);
    expect(stored.get(1)).toBe(PART);
    // Which is where the bar starts: four fifths of this body is already there.
    expect(resolvePhiMediaUploadPartProgress(stored, 20 * MIB)).toBe(80);
  });

  it("gives a stored last part the remainder rather than a full part", () => {
    const stored = resolvePhiMediaUploadStoredProgress(
      [{ partNumber: 1, eTag: '"a"' }, { partNumber: 2, eTag: '"b"' }],
      PART,
      20 * MIB,
    );
    expect(stored.get(2)).toBe(4 * MIB);
    expect(resolvePhiMediaUploadPartProgress(stored, 20 * MIB)).toBe(100);
  });

  it("counts nothing for an upload that is starting", () => {
    expect(resolvePhiMediaUploadStoredProgress([], PART, 20 * MIB).size).toBe(0);
  });

  it("accepts a plan with nothing left to send, where the parts are already stored", () => {
    const plan = {
      kind: "multipart-put" as const,
      method: "PUT" as const,
      uploadId: "upload-1",
      partSizeBytes: PART,
      parts: [],
    };
    // Nothing to deliver and nothing delivered is an answer nobody can act on.
    expect(isUsablePhiMediaUploadPlan(plan, 0)).toBe(false);
    // Nothing to deliver because it is all there: what remains is to name the parts at finalize.
    expect(isUsablePhiMediaUploadPlan(plan, 2)).toBe(true);
  });

  it("refuses a multipart plan the Provider did not name", () => {
    expect(isUsablePhiMediaUploadPlan({
      kind: "multipart-put", method: "PUT", uploadId: "", partSizeBytes: PART,
      parts: [{ partNumber: 1, url: "https://s3.invalid/1" }],
    }, 0)).toBe(false);
  });
});
