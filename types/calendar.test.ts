import { describe, expect, it } from "vitest";

import {
  phiCalendarEventFallsOnDate,
  resolvePhiCalendarEventDays,
  resolvePhiCalendarMonthPanelDays,
  type PhiCalendarEvent,
} from "./calendar";

function timed(start: string, end: string): PhiCalendarEvent {
  return { id: "e", title: "E", allDay: false, start: { instant: start }, end: { instant: end } };
}

describe("calendar event days", () => {
  it("reads the day in the calendar's zone, not in UTC or the browser's", () => {
    // 23:30 in Zurich is 21:30 UTC the same day and 17:30 in New York.
    const event = timed("2026-09-30T21:30:00Z", "2026-09-30T21:45:00Z");
    expect(phiCalendarEventFallsOnDate(event, "2026-09-30", "Europe/Zurich")).toBe(true);
    expect(phiCalendarEventFallsOnDate(event, "2026-10-01", "Europe/Zurich")).toBe(false);
    // 00:30 in Zurich on the 1st is still the 30th in UTC.
    const afterMidnight = timed("2026-09-30T22:30:00Z", "2026-09-30T23:00:00Z");
    expect(phiCalendarEventFallsOnDate(afterMidnight, "2026-10-01", "Europe/Zurich")).toBe(true);
    expect(phiCalendarEventFallsOnDate(afterMidnight, "2026-09-30", "Europe/Zurich")).toBe(false);
  });

  it("shows a timed event on every day it covers", () => {
    const event = timed("2026-09-28T08:00:00Z", "2026-09-30T10:00:00Z");
    expect(resolvePhiCalendarEventDays(event, "UTC")).toEqual({
      isoStart: "2026-09-28",
      isoEndExclusive: "2026-10-01",
    });
    expect(phiCalendarEventFallsOnDate(event, "2026-09-29", "UTC")).toBe(true);
  });

  it("does not reach into the day an event ends on at midnight", () => {
    const event = timed("2026-09-28T20:00:00Z", "2026-09-29T00:00:00Z");
    expect(resolvePhiCalendarEventDays(event, "UTC")).toEqual({
      isoStart: "2026-09-28",
      isoEndExclusive: "2026-09-29",
    });
  });

  it("keeps an all-day event's own dates", () => {
    const event: PhiCalendarEvent = {
      id: "a",
      title: "A",
      allDay: true,
      startDate: { calendar: "gregory", isoDate: "2026-09-28" },
      endDateExclusive: { calendar: "gregory", isoDate: "2026-09-30" },
    };
    expect(phiCalendarEventFallsOnDate(event, "2026-09-29", "Pacific/Auckland")).toBe(true);
    expect(phiCalendarEventFallsOnDate(event, "2026-09-30", "Pacific/Auckland")).toBe(false);
  });
});

describe("month panel days", () => {
  it("spans six whole weeks from the week the month starts in", () => {
    // 1 September 2026 is a Tuesday.
    expect(resolvePhiCalendarMonthPanelDays("2026-09-01", 1)).toEqual({
      isoStart: "2026-08-31",
      isoEndExclusive: "2026-10-12",
    });
    expect(resolvePhiCalendarMonthPanelDays("2026-09-01", 0)).toEqual({
      isoStart: "2026-08-30",
      isoEndExclusive: "2026-10-11",
    });
  });
});
