"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import type { PhiCollectionViewBindingModel } from "../../../../types/collection-provider";
import type { PhiCmsCollectionViewWidgetConfig } from "../../core/widgets/collection-view/config";
import type { PhiDashboardCardPayload, PhiDashboardCardRow } from "../../../../types/dashboard-cards";
import { PhiCardWidgetClient } from "../../core/widgets/card/client";
import { PhiCollectionViewControl } from "../../../../components/controls/phi-collection-view-control";
import { PhiAlertControl } from "../../../../components/controls/phi-alert-control";
import { PhiEmptyControl } from "../../../../components/controls/phi-empty-control";

/**
 * A Dashboard, drawn.
 *
 * The list arrives as ordinary Collection rows and each card then resolves its own payload, which is
 * the one thing the shared card View could not do: it maps fields of a row onto a card and is finished.
 * A Dashboard's rows come from N Modules that each do real work, so the cost profile is inverted and
 * the View is too.
 *
 * What the split buys is visible here: twelve cards resolve in parallel, a payload that fails leaves an
 * error in its own card, and a card that has not resolved reads as itself -- because its title, mark
 * and target were in the descriptor and are already on screen.
 */

/** A card at the width a card is still a card at, matching the shared card View's floor. */
const CARD_MIN_COLUMN_WIDTH = 260;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRows(binding: PhiCollectionViewBindingModel) {
  return (binding.data?.items ?? [])
    .filter(isRecord)
    .map((item) => item as unknown as PhiDashboardCardRow)
    .filter((row) => typeof row.cardId === "string" && typeof row.title === "string");
}

/**
 * One card, and its own request.
 *
 * No timer of its own, deliberately and checkably: a card fetches when it is asked and never on a
 * schedule it keeps itself, because pausing, staggering and backing off can only be decided where all
 * twelve are visible. Until the Controller is that clock, being asked means being mounted.
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
  const requestKey = `${area}\u0000${pathname}\u0000${row.cardId}`;
  const [resolved, setResolved] = useState<{
    key: string;
    payload: PhiDashboardCardPayload | null;
    failure: string | null;
  } | null>(null);

  useEffect(() => {
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
        return (await response.json()) as PhiDashboardCardPayload;
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
  }, [area, pathname, requestKey, row.cardId]);

  const current = resolved?.key === requestKey ? resolved : null;
  const payload = current?.payload ?? null;
  const error = current?.failure ?? payload?.error ?? null;
  return (
    <PhiCardWidgetClient
      labels={{
        ...(row.eyebrow ? { eyebrow: row.eyebrow } : {}),
        // The figure takes the place the descriptor's title held while it was loading.
        title: payload?.value ?? row.title,
        ...(payload?.description ?? row.description
          ? { description: payload?.description ?? row.description }
          : {}),
        ...(error ? { meta: error } : payload?.meta ? { meta: payload.meta } : {}),
      }}
      config={{
        variant: "compact",
        ...(row.href ? { href: row.href } : {}),
        ...(row.mark ? { iconName: row.mark } : {}),
      }}
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
  const pathname = usePathname() ?? "/";
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
