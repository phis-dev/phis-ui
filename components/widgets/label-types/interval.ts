import type { PhiIntervalUnit, PhiIntervalValue } from "../../../types/table-widget";

/**
 * How Core says a period, per unit: for one of it ("per month") and for several, with `%1` for the
 * count ("every %1 months"). Words from a Label Set rather than `Intl`'s unit names, because `Intl`
 * says "3 months" -- a length -- where a price needs "every 3 months", and a translator can reach a
 * Label Set where nobody can reach `Intl`.
 */
export type PhiIntervalLabels = Readonly<Record<PhiIntervalUnit, { one: string; many: string }>>;

export const PHI_INTERVAL_DEFAULT_LABELS: PhiIntervalLabels = {
  day: { one: "per day", many: "every %1 days" },
  week: { one: "per week", many: "every %1 weeks" },
  month: { one: "per month", many: "every %1 months" },
  year: { one: "per year", many: "every %1 years" },
};

const PHI_INTERVAL_UNITS: readonly string[] = ["day", "week", "month", "year"] satisfies readonly PhiIntervalUnit[];

/** `value` as a period, or `null` where it is not one: a known unit and a whole count of one or more. */
export function readPhiIntervalValue(value: unknown): PhiIntervalValue | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const { unit, count } = value as Record<string, unknown>;
  return typeof unit === "string" && PHI_INTERVAL_UNITS.includes(unit) && Number.isSafeInteger(count) && (count as number) >= 1
    ? { unit: unit as PhiIntervalUnit, count: count as number }
    : null;
}

/** A period in Core's words: `{ unit: "month", count: 1 }` is "per month", `count: 3` "every 3 months". */
export function formatPhiInterval(value: PhiIntervalValue, labels: PhiIntervalLabels) {
  const words = labels[value.unit];
  return value.count === 1 ? words.one : words.many.replace("%1", String(value.count));
}
