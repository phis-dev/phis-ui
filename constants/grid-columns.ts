/** How many slots a row of a Grid holds, at one width. Each divides the 24 tracks evenly. */
export const PHI_GRID_COLUMN_COUNTS = [1, 2, 3, 4, 6] as const;

export type PhiGridColumnCount = (typeof PHI_GRID_COLUMN_COUNTS)[number];

export function isPhiGridColumnCount(value: unknown): value is PhiGridColumnCount {
  return PHI_GRID_COLUMN_COUNTS.includes(value as PhiGridColumnCount);
}
