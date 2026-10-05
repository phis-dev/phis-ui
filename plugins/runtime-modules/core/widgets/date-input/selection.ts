import type { PhiCalendarSelectionMode, PhiTemporalSelection } from "../../../../../types";

/**
 * Nothing chosen, in the shape the selection mode gives it.
 *
 * A file of its own, because the live client reads it as well as the config parser, and a live client
 * takes only types from its config.
 */
export function createPhiEmptyTemporalSelection(mode: PhiCalendarSelectionMode): PhiTemporalSelection {
  if (mode === "range") return { mode: "range", start: null, end: null };
  if (mode === "multiple") return { mode: "multiple", values: [] };
  return { mode: "single", value: null };
}
