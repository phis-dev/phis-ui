"use client";

import { useEffect, useMemo, useState } from "react";

import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import type { PhiCollectionViewBindingModel } from "../../../../types/collection-provider";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../types/collection-view-widget";
import { readPhiTimelineEntries, type PhiTimelineEntry } from "@phis/contracts/timeline";

import {
  PHI_DASHBOARD_CARD_LIST_LIMIT,
  PHI_DASHBOARD_CARD_SERIES_LIMIT,
  type PhiDashboardCardForm,
  type PhiDashboardCardPayload,
  type PhiDashboardCardRow,
  type PhiDashboardCardSeries,
} from "../../../../types/dashboard-cards";
import { PhiCardWidgetClient } from "../../../../components/widgets/shared/card-body-client";
import { type PhiCardWidgetBody } from "../../../../components/widgets/shared/card-vocabulary";
import { PHI_SURFACE_CARD } from "../../../../helpers/surface-presets";
import { PhiCollectionViewControl } from "../../../../components/controls/phi-collection-view-control";
import { PhiAlertControl } from "../../../../components/controls/phi-alert-control";
import { PhiEmptyControl } from "../../../../components/controls/phi-empty-control";
import { usePhiPathname } from "../../../../components/runtime/use-phi-pathname";
import {
  readPhiDashboardCardPayload,
  readPhiDashboardCardRows,
  readPhiDashboardSeriesHeadline,
} from "../card-rows";
import { PhiTimelineControl } from "../../../../components/controls/phi-timeline-control";
import { PhiSeriesChartControl } from "../../../../components/controls/phi-series-chart-control";
import { usePhiIntlLocale } from "../../../../components/root/phi-intl-locale";
import { formatPhiDate, formatPhiRelativeTime } from "../../../../helpers/format-date-time";

/**
 * A Dashboard, drawn.
 *
 * The list arrives as ordinary Collection rows, each carrying its first payload; a card resolves its own
 * payload only where a row came without one -- the door a refresh will go through, one card at a time
 * (DASHBOARD.md section 3). That is the one thing the shared card View could not do: it maps fields of
 * a row onto a card and is finished. A Dashboard's rows come from N Modules that each do real work, so
 * the cost profile is inverted and the View is too.
 *
 * What the split buys is visible here: a payload that fails leaves an error in its own card, and a
 * card that has not resolved reads as itself -- because its title, mark and target were in the
 * descriptor and are already on screen.
 */

/** A card at the width a card is still a card at, matching the shared card View's floor. */
const CARD_MIN_COLUMN_WIDTH = 260;

/**
 * A Module's form, and the Core body that draws it.
 *
 * Two vocabularies that agree today, and deliberately not one type. `form` is what a Module
 * declares about its contribution; `body` is what Core draws. They agree now and are allowed to stop.
 *
 * A total map rather than a condition, so a form that joins the vocabulary stops this file compiling
 * instead of quietly falling back to a heading.
 */
const CARD_BODY_BY_FORM: Record<PhiDashboardCardForm, PhiCardWidgetBody> = {
  stat: "stat",
  list: "list",
  series: "series",
};

/**
 * A `list` card's entries as the Timeline draws them: the first few, each time in the page's locale.
 *
 * Relative, because a Dashboard is read for what is recent -- "two hours ago" says that, a date makes
 * the reader do the sum. An entry that states its time in words keeps the words. Drawn here and handed
 * to the card, which does not import a list Control every page with a Card would load.
 */
function PhiDashboardCardList({ entries }: { entries: readonly PhiTimelineEntry[] }) {
  const locale = usePhiIntlLocale();
  return (
    <PhiTimelineControl
      items={entries.slice(0, PHI_DASHBOARD_CARD_LIST_LIMIT).map((entry) => ({
        key: entry.key,
        ...(entry.title ? { title: entry.title } : {}),
        content: entry.content,
        ...(entry.time ?? entry.at ? { time: entry.time ?? formatPhiRelativeTime(entry.at, locale) } : {}),
        ...(entry.icon ? { icon: entry.icon } : {}),
        ...(entry.tone ? { tone: entry.tone } : {}),
        ...(entry.pending ? { pending: true } : {}),
      }))}
    />
  );
}

/*
 * A point's day as the calendar day it names. An ISO date read by `Date` is midnight in UTC, which is
 * the day before west of Greenwich; an instant is formatted where the reader is.
 */
function formatSeriesKey(at: string, locale: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(at)
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${at}T00:00:00Z`))
    : formatPhiDate(at, locale);
}

/**
 * A `series` card's chart: its first few series over every point, each day in the page's locale. Drawn
 * here and handed to the card, as a list is, so a Card on a Public page never loads the chart Control.
 */
function PhiDashboardCardSeriesChart({ series, title }: { series: PhiDashboardCardSeries; title: string }) {
  const locale = usePhiIntlLocale();
  const labels = series.labels.slice(0, PHI_DASHBOARD_CARD_SERIES_LIMIT);
  return (
    <PhiSeriesChartControl
      locale={locale}
      title={title}
      keys={series.points.map((point) => formatSeriesKey(point.at, locale))}
      series={labels.map((label, index) => ({ label, values: series.points.map((point) => point.values[index]!) }))}
      {...(series.unit ? { unit: series.unit } : {})}
    />
  );
}

function readRows(binding: PhiCollectionViewBindingModel) {
  // A Collection holds items of no particular type; the rows are read again, not cast.
  return readPhiDashboardCardRows(binding.data?.items ?? [], "The Dashboard Collection");
}

/**
 * One card, and its own request where the list did not bring its payload.
 *
 * No timer of its own, deliberately and checkably: a card fetches when it is asked and never on a
 * schedule it keeps itself, because pausing, staggering and backing off can only be decided where all
 * twelve are visible. Until the Controller is that clock, being asked means being mounted without a
 * payload -- which, with the list answering it, nothing on this page does today. The path stays so the
 * clock has a door to knock on.
 */
function PhiDashboardCard({
  row,
  area,
  pathname,
}: {
  row: PhiDashboardCardRow;
  area: string;
  pathname: string;
}) {
  /*
   * One piece of state, carrying the request it answers.
   *
   * Clearing the payload when the request changes would be a second, synchronous write from inside the
   * effect -- a cascading render for a value nothing has read yet. Keeping the key beside the answer
   * says the same thing by comparison: an answer to a question no longer being asked is simply not this
   * card's answer.
   */
  const locale = usePhiIntlLocale();
  const requestKey = `${area}\u0000${pathname}\u0000${row.cardId}`;
  const delivered = row.payload ?? null;
  const [resolved, setResolved] = useState<{
    key: string;
    payload: PhiDashboardCardPayload | null;
    failure: string | null;
  } | null>(null);

  useEffect(() => {
    if (delivered) {
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({ area, path: pathname, card: row.cardId });
    fetch(`/api/site/dashboard-cards?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Card payload request failed (${response.status}).`);
        }
        return readPhiDashboardCardPayload(await response.json());
      })
      .then((payload) => setResolved({ key: requestKey, payload, failure: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setResolved({
          key: requestKey,
          payload: null,
          failure: error instanceof Error ? error.message : "This card is unavailable.",
        });
      });
    return () => controller.abort();
  }, [area, delivered, pathname, requestKey, row.cardId]);

  const current = delivered
    ? { key: requestKey, payload: delivered, failure: null }
    : resolved?.key === requestKey ? resolved : null;
  const payload = current?.payload ?? null;
  const error = current?.failure ?? payload?.error ?? null;
  const entries = row.form === "list" ? readPhiTimelineEntries(payload?.entries) : [];
  const series = row.form === "series" ? payload?.series ?? null : null;
  const value = payload?.value ?? (series ? readPhiDashboardSeriesHeadline(series, locale) : undefined);
  return (
    <PhiCardWidgetClient
      labels={{
        ...(row.eyebrow ? { eyebrow: row.eyebrow } : {}),
        /*
         * The title stays the title.
         *
         * It used to be replaced by the figure once one arrived, which left the eyebrow as the only
         * word saying what had been counted. The body draws the pair, so "Site users" and "42" are on
         * screen together and the card reads the same before and after it resolves.
         */
        title: row.title,
        ...(value ? { value } : {}),
        ...(payload?.description ?? row.description
          ? { description: payload?.description ?? row.description }
          : {}),
        ...(payload?.meta ? { meta: payload.meta } : {}),
      }}
      config={{
        surface: PHI_SURFACE_CARD,
        variant: "compact",
        body: CARD_BODY_BY_FORM[row.form] ?? "text",
        ...(row.href ? { href: row.href } : {}),
        ...(row.mark ? { iconName: row.mark } : {}),
      }}
      /*
       * What the card is told about its own content, and the whole of it. The card decides none of
       * this; that this file still does is what will move to a Controller when the Dashboard gets a
       * clock (DASHBOARD.md section 4).
       */
      binding={{ loading: current === null, error }}
      listContent={series ? (
        <PhiDashboardCardSeriesChart series={series} title={row.title} />
      ) : entries.length > 0 ? <PhiDashboardCardList entries={entries} /> : null}
    />
  );
}

export function PhiDashboardCardCollectionViewBinding({
  config,
  binding,
  widgetId,
}: {
  config: PhiCmsCollectionViewWidgetConfig;
  binding: PhiCollectionViewBindingModel;
  labels?: unknown;
  widgetId?: PhiCmsInstanceId | null;
}) {
  void widgetId;
  const pathname = usePhiPathname();
  const { presentation } = config;
  const rows = useMemo(() => readRows(binding), [binding]);
  const area = typeof config.source?.params?.area === "string" ? config.source.params.area : "";

  return (
    <PhiCollectionViewControl
      title={presentation.title}
      description={presentation.description}
      mode={presentation.mode}
      {...(presentation.gap ? { gap: presentation.gap } : {})}
      minColumnWidth={presentation.minColumnWidth ?? CARD_MIN_COLUMN_WIDTH}
      diagnostics={binding.error ? (
        <PhiAlertControl level="error" title={binding.error} />
      ) : null}
      body={rows.length === 0 && !binding.loading ? (
        <PhiEmptyControl description={presentation.emptyDescription ?? "No Module offers a card here yet."} />
      ) : undefined}
      items={rows.map((row) => (
        <PhiDashboardCard key={row.cardId} row={row} area={area} pathname={pathname} />
      ))}
      pagination={null}
    />
  );
}
