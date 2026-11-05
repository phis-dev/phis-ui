import { describe, expect, it } from "vitest";

import {
  readPhiDashboardCardPayload,
  readPhiDashboardCardRows,
  readPhiDashboardSeriesHeadline,
} from "./card-rows";

const CARD_ID = "project-stats/cards/github-views";

function payload(series: unknown) {
  return { cardId: CARD_ID, resolvedAt: "2026-11-05T08:00:00Z", series };
}

describe("a series card's payload", () => {
  it("reads labels, points and unit", () => {
    const read = readPhiDashboardCardPayload(payload({
      labels: ["Views", "Unique visitors"],
      unit: "views",
      points: [
        { at: "2026-11-04", values: [12, 4] },
        { at: "2026-11-05", values: [30, 9] },
      ],
    }));
    expect(read.series).toEqual({
      labels: ["Views", "Unique visitors"],
      unit: "views",
      points: [
        { at: "2026-11-04", values: [12, 4] },
        { at: "2026-11-05", values: [30, 9] },
      ],
    });
  });

  it("reads a series without points", () => {
    expect(readPhiDashboardCardPayload(payload({ labels: ["Downloads"], points: [] })).series)
      .toEqual({ labels: ["Downloads"], points: [] });
  });

  it("refuses a point with a value too few, naming the point", () => {
    expect(() => readPhiDashboardCardPayload(payload({
      labels: ["Views", "Unique visitors"],
      points: [{ at: "2026-11-05", values: [30] }],
    }))).toThrow(/series\.points\[0\]\.values/);
  });

  it("refuses a value that is not a finite number", () => {
    expect(() => readPhiDashboardCardPayload(payload({
      labels: ["Views"],
      points: [{ at: "2026-11-05", values: ["30"] }],
    }))).toThrow(/values/);
  });

  it("refuses a series without labels, and a point without its time", () => {
    expect(() => readPhiDashboardCardPayload(payload({ labels: [], points: [] }))).toThrow(/labels/);
    expect(() => readPhiDashboardCardPayload(payload({ labels: ["Views"], points: [{ values: [1] }] })))
      .toThrow(/points\[0\]\.at/);
  });

  it("is a form a row may name", () => {
    const [row] = readPhiDashboardCardRows([{ cardId: CARD_ID, form: "series", title: "GitHub views" }]);
    expect(row?.form).toBe("series");
    expect(() => readPhiDashboardCardRows([{ cardId: CARD_ID, form: "chart", title: "GitHub views" }]))
      .toThrow(/form/);
  });

  it("heads with the first series' latest figure", () => {
    const series = { labels: ["Views", "Unique"], points: [{ at: "2026-11-04", values: [1, 1] }, { at: "2026-11-05", values: [1234, 7] }] };
    expect(readPhiDashboardSeriesHeadline(series, "en")).toBe("1,234");
    expect(readPhiDashboardSeriesHeadline({ labels: ["Views"], points: [] }, "en")).toBeUndefined();
  });
});
