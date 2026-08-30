export const PHI_MEDIA_PICKER_MIN_COLUMN_WIDTH = 80;
export const PHI_MEDIA_PICKER_MAX_COLUMN_WIDTH = 240;
export const PHI_MEDIA_PICKER_COLUMN_WIDTH_STEP = 8;
export const PHI_MEDIA_PICKER_DEFAULT_COLUMN_WIDTH = 96;

export function normalizePhiMediaPickerMinColumnWidth(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return PHI_MEDIA_PICKER_DEFAULT_COLUMN_WIDTH;
  }

  return Math.min(
    PHI_MEDIA_PICKER_MAX_COLUMN_WIDTH,
    Math.max(PHI_MEDIA_PICKER_MIN_COLUMN_WIDTH, Math.round(value)),
  );
}
