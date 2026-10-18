import { describe, expect, it } from "vitest";

import { readPhiTourProgress, recordPhiTourProgress, shouldOfferPhiTour } from "./progress";

const TOUR = { id: "@phis/ui/modules/theme/workspace", version: 2 } as const;

describe("Tour progress", () => {
  it("offers a Tour nobody finished, and one finished only in an earlier version", () => {
    expect(shouldOfferPhiTour(null, TOUR)).toBe(true);
    expect(shouldOfferPhiTour(recordPhiTourProgress(null, { ...TOUR, version: 1 }, "completed"), TOUR)).toBe(true);
  });

  it("does not offer a Tour completed or dismissed in its current version", () => {
    expect(shouldOfferPhiTour(recordPhiTourProgress(null, TOUR, "completed"), TOUR)).toBe(false);
    expect(shouldOfferPhiTour(recordPhiTourProgress(null, TOUR, "dismissed"), TOUR)).toBe(false);
  });

  it("reads back what it wrote and drops what it does not recognise", () => {
    const written = recordPhiTourProgress(null, TOUR, "dismissed");
    expect(readPhiTourProgress(JSON.parse(JSON.stringify(written)))).toEqual(written);
    expect(readPhiTourProgress({ tours: { a: { version: "1", status: "completed" }, b: { version: 1, status: "open" } } }))
      .toEqual({ tours: {} });
    expect(readPhiTourProgress(null)).toEqual({ tours: {} });
  });
});
