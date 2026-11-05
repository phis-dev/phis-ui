import { readPhiTimelineEntry, type PhiTimelineEntry } from "@phis/contracts/timeline";

import {
  isPhiDashboardCardId,
  type PhiDashboardCardPayload,
  type PhiDashboardCardSeries,
  type PhiDashboardCardSeriesPoint,
  type PhiDashboardCardRow,
} from "../../../types/dashboard-cards";
import {
  createPhiResponseReader,
  requirePhiField,
  type PhiConfigReader,
} from "../../../components/widgets/config/strict-config-reader";

/*
 * The Dashboard's rows and payloads, read as the Site's door writes them (`gateway/dashboard-cards-route.ts`).
 *
 * Both came in by cast: the list's rows as "an object, so a row", and a refreshed payload as whatever
 * the door answered. A row without its title then disappeared without a word, and a payload of the wrong
 * shape rendered as an empty card. Read field by field now, a wrong answer is an error naming the field,
 * which the Collection shows as the card list's error.
 */

const PHI_DASHBOARD_CARD_FORMS = ["stat", "list", "series"] as const;

function readCardId(reader: PhiConfigReader) {
  return requirePhiField(reader, "cardId", "a Dashboard card id", (key) =>
    reader.value(key, "a Dashboard card id", (value) => (isPhiDashboardCardId(value) ? value : undefined)));
}

function readTimelineEntry(reader: PhiConfigReader, index: number): PhiTimelineEntry {
  return readPhiTimelineEntry(reader.record) ?? reader.fail(String(index), "a timeline entry with a key", reader.record);
}

/*
 * A series is read whole: a point with one value too few would draw a line that drops to nothing on the
 * day it lost, which looks like data. So each point states a finite number for every label, or the payload
 * is an error naming the point.
 */
function readSeries(reader: PhiConfigReader): PhiDashboardCardSeries {
  const labels = requirePhiField(reader, "labels", "a list of series labels", reader.stringList);
  if (labels.length === 0) {
    reader.fail("labels", "at least one series label", labels);
  }
  const points = requirePhiField(reader, "points", "a list of points", (key) =>
    reader.list(key, (point): PhiDashboardCardSeriesPoint => ({
      at: requirePhiField(point, "at", "an ISO date or instant", point.string),
      values: requirePhiField(point, "values", `${labels.length} finite numbers, one per label`, (valuesKey) =>
        point.value(valuesKey, `${labels.length} finite numbers, one per label`, (value) =>
          Array.isArray(value)
          && value.length === labels.length
          && value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
            ? (value as number[])
            : undefined)),
    })));
  const unit = reader.string("unit");
  return { labels, points, ...(unit === undefined ? {} : { unit }) };
}

function readPayloadFields(reader: PhiConfigReader): PhiDashboardCardPayload {
  const value = reader.string("value");
  const entries = reader.list("entries", readTimelineEntry);
  const series = reader.object("series", readSeries);
  const description = reader.string("description");
  const meta = reader.string("meta");
  const error = reader.string("error");
  return {
    cardId: readCardId(reader),
    ...(value === undefined ? {} : { value }),
    ...(entries === undefined ? {} : { entries }),
    ...(series === undefined ? {} : { series }),
    ...(description === undefined ? {} : { description }),
    ...(meta === undefined ? {} : { meta }),
    ...(error === undefined ? {} : { error }),
    resolvedAt: requirePhiField(reader, "resolvedAt", "an instant", reader.string),
  };
}

function readRowFields(reader: PhiConfigReader): PhiDashboardCardRow {
  const eyebrow = reader.string("eyebrow");
  const description = reader.string("description");
  const mark = reader.string("mark");
  const href = reader.string("href");
  const payload = reader.object("payload", readPayloadFields);
  return {
    cardId: readCardId(reader),
    form: requirePhiField(reader, "form", '"stat", "list" or "series"', (key) => reader.oneOf(key, PHI_DASHBOARD_CARD_FORMS)),
    title: requirePhiField(reader, "title", "a text", reader.string),
    ...(eyebrow === undefined ? {} : { eyebrow }),
    ...(description === undefined ? {} : { description }),
    ...(mark === undefined ? {} : { mark }),
    ...(href === undefined ? {} : { href }),
    ...(payload === undefined ? {} : { payload }),
  };
}

/** The card rows a list answer carries, or a Collection holds. */
export function readPhiDashboardCardRows(value: unknown, source = "The Dashboard card list"): PhiDashboardCardRow[] {
  return createPhiResponseReader({ cards: value }, source).list("cards", readRowFields) ?? [];
}

/** One card's refreshed payload. */
export function readPhiDashboardCardPayload(value: unknown): PhiDashboardCardPayload {
  return readPayloadFields(createPhiResponseReader(value, "The Dashboard card"));
}

/** The latest figure of the first series: the headline of a `series` card whose provider states none. */
export function readPhiDashboardSeriesHeadline(series: PhiDashboardCardSeries, locale: string): string | undefined {
  const latest = series.points[series.points.length - 1]?.values[0];
  return latest === undefined ? undefined : new Intl.NumberFormat(locale).format(latest);
}
