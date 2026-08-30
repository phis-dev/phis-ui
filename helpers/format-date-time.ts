const PHI_DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const PHI_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

function readPhiDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp);
}

export function formatPhiDate(value: string | null | undefined) {
  const date = readPhiDate(value);
  return date ? PHI_DATE_FORMATTER.format(date) : value || "—";
}

export function formatPhiDateTime(value: string | null | undefined) {
  const date = readPhiDate(value);
  return date ? PHI_DATE_TIME_FORMATTER.format(date) : value || "—";
}
