import { describe, expect, it } from "vitest";

import { formatPhiInterval, PHI_INTERVAL_DEFAULT_LABELS, readPhiIntervalValue } from "./interval";

describe("a period in Core's words", () => {
  it("says one of a unit as 'per' and several as 'every'", () => {
    expect(formatPhiInterval({ unit: "month", count: 1 }, PHI_INTERVAL_DEFAULT_LABELS)).toBe("per month");
    expect(formatPhiInterval({ unit: "month", count: 3 }, PHI_INTERVAL_DEFAULT_LABELS)).toBe("every 3 months");
    expect(formatPhiInterval({ unit: "year", count: 1 }, PHI_INTERVAL_DEFAULT_LABELS)).toBe("per year");
  });

  it("takes the words it is given, which are a translator's", () => {
    const german = { ...PHI_INTERVAL_DEFAULT_LABELS, week: { one: "pro Woche", many: "alle %1 Wochen" } };
    expect(formatPhiInterval({ unit: "week", count: 2 }, german)).toBe("alle 2 Wochen");
  });

  it("reads only a known unit and a whole count of one or more", () => {
    expect(readPhiIntervalValue({ unit: "day", count: 7 })).toEqual({ unit: "day", count: 7 });
    expect(readPhiIntervalValue({ unit: "hour", count: 1 })).toBeNull();
    expect(readPhiIntervalValue({ unit: "month", count: 0 })).toBeNull();
    expect(readPhiIntervalValue({ unit: "month", count: 1.5 })).toBeNull();
    expect(readPhiIntervalValue({ unit: "month", count: "3" })).toBeNull();
    expect(readPhiIntervalValue("month")).toBeNull();
  });
});
