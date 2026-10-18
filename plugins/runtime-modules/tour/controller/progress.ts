import type { PhiTourDefinition } from "../../../../types/tours";

export type PhiTourProgressStatus = "completed" | "dismissed";

/**
 * Where one person stands in every Tour of a Site, kept under one user-state value.
 *
 * Per Tour only the version last finished and how: a Tour completed or dismissed in its current version
 * is not offered by itself again, and raising the version offers it anew. The history of earlier versions
 * is not kept -- the value is bounded by the Module's 4 KB namespace, and a version is all an offer needs.
 */
export type PhiTourProgress = {
  tours: Readonly<Record<string, { version: number; status: PhiTourProgressStatus }>>;
};

export function readPhiTourProgress(value: unknown): PhiTourProgress {
  const tours: Record<string, { version: number; status: PhiTourProgressStatus }> = {};
  const raw = typeof value === "object" && value !== null
    ? (value as { tours?: unknown }).tours
    : null;
  if (typeof raw === "object" && raw !== null) {
    for (const [id, entry] of Object.entries(raw as Record<string, unknown>)) {
      const record = entry as { version?: unknown; status?: unknown } | null;
      if (
        typeof record?.version === "number"
        && (record.status === "completed" || record.status === "dismissed")
      ) {
        tours[id] = { version: record.version, status: record.status };
      }
    }
  }
  return { tours };
}

/** Whether a Tour opens by itself: never finished in this version, either way. */
export function shouldOfferPhiTour(progress: PhiTourProgress | null, tour: Pick<PhiTourDefinition, "id" | "version">) {
  const entry = progress?.tours[tour.id];
  return !entry || entry.version < tour.version;
}

export function recordPhiTourProgress(
  progress: PhiTourProgress | null,
  tour: Pick<PhiTourDefinition, "id" | "version">,
  status: PhiTourProgressStatus,
): PhiTourProgress {
  return { tours: { ...progress?.tours, [tour.id]: { version: tour.version, status } } };
}
