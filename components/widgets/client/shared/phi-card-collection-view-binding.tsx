"use client";

import { Empty } from "antd";
import { useEffect, useMemo, useState } from "react";

import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import type { PhiCollectionViewBindingModel } from "../../../../types/collection-provider";
import type {
  PhiCmsCollectionCardPresentation,
  PhiCmsCollectionViewWidgetConfig,
} from "../../../../plugins/runtime-modules/core/widgets/collection-view/config";
import { PhiAlertControl } from "../../../controls/phi-alert-control";
import { PhiCollectionViewControl } from "../../../controls/phi-collection-view-control";
import { PhiTextControl } from "../../../controls/phi-text-control";
import { PhiCardWidgetClient } from "../../../../plugins/runtime-modules/core/widgets/card/client";
import { normalizePhiCssSize } from "../../../layouts/phi-layout-contract";

/**
 * A Collection drawn as Cards.
 *
 * Nothing here is new: the Collection control already lays items out and paginates them, and the Card
 * Widget already knows what a card looks like. What sat between them was the one thing neither could
 * know -- which field of a row is the title -- and that is now stated in the Widget's configuration,
 * where the rest of the presentation lives.
 *
 * So an Add-on with rows to show writes no interface at all: it registers this View for its resource
 * and says which paths mean what. A resource that outgrows the mapping ships its own View instead,
 * which is one field in its registration -- the Media library is what that looks like.
 */

function readPath(item: Record<string, unknown>, path: string | undefined) {
  if (!path) {
    return undefined;
  }
  // A dot path, because a provider's rows are documents and the interesting field is often one level
  // in. Anything that is not a string or a number is not a label and is left alone.
  const value = path.split(".").reduce<unknown>(
    (current, key) => (current && typeof current === "object"
      ? (current as Record<string, unknown>)[key]
      : undefined),
    item,
  );
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function buildCard(item: Record<string, unknown>, card: PhiCmsCollectionCardPresentation | undefined) {
  const labels = {
    eyebrow: readPath(item, card?.eyebrow),
    title: readPath(item, card?.title) ?? readPath(item, "name") ?? readPath(item, "title"),
    description: readPath(item, card?.description) ?? readPath(item, "description"),
    meta: readPath(item, card?.meta),
    actionLabel: readPath(item, card?.actionLabel),
  };
  const config = {
    imageUrl: readPath(item, card?.imageUrl),
    href: readPath(item, card?.href),
    actionHref: readPath(item, card?.actionHref),
    ...(card?.variant ? { variant: card.variant } : {}),
  };
  return { labels, config };
}

export function PhiCardCollectionViewBinding({
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
  const { presentation, features } = config;
  const items = useMemo(
    () => (binding.data?.items ?? []) as Record<string, unknown>[],
    [binding.data?.items],
  );
  const [searchDraft, setSearchDraft] = useState(binding.query.search ?? "");

  // Typing is not a query. The draft is what a person sees; the query follows once they stop.
  useEffect(() => {
    if (searchDraft === (binding.query.search ?? "")) {
      return;
    }
    const timer = window.setTimeout(() => {
      binding.setQuery((current) => ({ ...current, page: 1, search: searchDraft }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [binding, searchDraft]);

  const cards = items.map((item, index) => {
    const card = buildCard(item, presentation.card);
    return (
      <PhiCardWidgetClient
        key={readPath(item, "id") ?? readPath(item, "slug") ?? String(index)}
        labels={card.labels}
        config={card.config}
      />
    );
  });

  return (
    <PhiCollectionViewControl
      title={presentation.title}
      description={presentation.description}
      mode={presentation.mode}
      {...(presentation.gap ? { gap: presentation.gap } : {})}
      {...(presentation.minColumnWidth ? { minColumnWidth: presentation.minColumnWidth } : {})}
      filters={features.search?.enabled ? (
        <PhiTextControl
          inputType="search"
          value={searchDraft}
          placeholder={features.search.placeholder}
          ariaLabel={features.search.placeholder ?? "Search"}
          onChange={(value) => setSearchDraft(value ?? "")}
          style={{
            flex: "1 1 12rem",
            minWidth: normalizePhiCssSize(features.search.minWidth) ?? "10rem",
          }}
          size={presentation.controlSize}
        />
      ) : null}
      diagnostics={binding.error ? (
        <PhiAlertControl level="error" title={binding.error} />
      ) : null}
      body={items.length === 0 && !binding.loading ? (
        <Empty description={presentation.emptyDescription ?? "Nothing here yet."} />
      ) : undefined}
      items={cards}
      pagination={features.pagination?.enabled === false ? null : {
        page: binding.query.page ?? 1,
        pageSize: binding.query.pageSize ?? features.pagination?.pageSize ?? 20,
        total: binding.data?.total ?? items.length,
        ...(features.pagination?.simple === undefined
          ? {}
          : { simple: features.pagination.simple }),
        ...(features.pagination?.showSizeChanger === undefined
          ? {}
          : { showSizeChanger: features.pagination.showSizeChanger }),
        onChange: (page: number, pageSize: number) =>
          binding.setQuery((current) => ({ ...current, page, pageSize })),
      }}
    />
  );
}
