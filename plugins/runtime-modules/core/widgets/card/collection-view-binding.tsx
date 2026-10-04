"use client";

import { useCallback, useMemo } from "react";

import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import type { PhiCollectionViewBindingModel } from "../../../../../types/collection-provider";
import type { PhiCmsCollectionCardPresentation } from "../../../../../types/core-widget-placements";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../../types/collection-view-widget";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiCollectionViewControl } from "../../../../../components/controls/phi-collection-view-control";
import { PhiEmptyControl } from "../../../../../components/controls/phi-empty-control";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import { PhiCardWidgetClient, type PhiCardWidgetClientConfig } from "../../../../../components/widgets/shared/card-body-client";
import { PHI_CARD_DEFAULT_SURFACE } from "../../../../../components/widgets/shared/card-vocabulary";
import { resolvePhiImagePresentation } from "../../../../../components/media/image-presentation";
import { normalizePhiCssSize } from "../../../../../components/layouts/phi-layout-contract";
import { usePhiSearchDraft } from "../../../../../components/widgets/client/shared/phi-search-draft";

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

/**
 * How narrow a column of cards may get before it stops being one.
 *
 * The Collection control defaults to the width a Media tile wants -- a small square with no words in it
 * -- and a card at that width wraps its text a word at a time and reads as a column of syllables. A card
 * is mostly language, so its floor is set by the shortest line worth reading rather than by a thumbnail.
 *
 * Still a floor and not a width: the grid fills the row with equal columns from here upwards, so a wide
 * page gets more cards rather than wider ones, and a narrow one gets a single column instead of a
 * squeezed pair.
 */
const CARD_MIN_COLUMN_WIDTH = 260;

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

/**
 * A row's mark as an icon name: a name stays a name, and a Site path -- a Media delivery path -- is drawn
 * as the picture it points at. A foreign address is not a mark the house draws.
 */
function readIconName(value: string | undefined) {
  if (!value) return undefined;
  if (value.startsWith("/")) return `asset:${value}`;
  return /^[a-z]+:\/\//iu.test(value) ? undefined : value;
}

function readTruth(item: Record<string, unknown>, path: string | undefined) {
  if (!path) return false;
  const value = path.split(".").reduce<unknown>(
    (current, key) => (current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined),
    item,
  );
  return value === true || value === "true" || value === 1;
}

function buildCard(item: Record<string, unknown>, card: PhiCmsCollectionCardPresentation | undefined) {
  const labels = {
    eyebrow: readPath(item, card?.eyebrow),
    title: readPath(item, card?.title) ?? readPath(item, "name") ?? readPath(item, "title"),
    description: readPath(item, card?.description) ?? readPath(item, "description"),
    meta: readPath(item, card?.meta),
    actionLabel: readPath(item, card?.actionLabel),
    value: readPath(item, card?.value),
  };
  /*
   * Two pictures with two jobs, and the fallbacks say which is which. A cover opens the card and takes
   * the width it is given; a mark sits beside the title and is read at one size. Falling the cover back
   * to the icon turned every icon into a poster.
   */
  const imageUrl = readPath(item, card?.imageUrl) ?? readPath(item, "coverUrl") ?? readPath(item, "imageUrl");
  const config: PhiCardWidgetClientConfig = {
    surface: PHI_CARD_DEFAULT_SURFACE,
    image: imageUrl
      ? {
          presentation: resolvePhiImagePresentation({ sourceKind: "url", sourceUrl: imageUrl }),
          source: "url",
          alt: labels.title ?? "",
        }
      : null,
    iconName: readIconName(readPath(item, card?.icon) ?? readPath(item, "icon")),
    href: readPath(item, card?.href),
    actionHref: readPath(item, card?.actionHref),
    ...(card?.variant ? { variant: card.variant } : {}),
    ...(card?.body ? { body: card.body } : {}),
    highlight: readTruth(item, card?.highlight),
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
  const { setQuery } = binding;
  const onSearchChange = useCallback(
    (search: string) => setQuery((current) => ({ ...current, page: 1, search })),
    [setQuery],
  );
  const { draft: searchDraft, setDraft: setSearchDraft } = usePhiSearchDraft({
    query: binding.query.search ?? "",
    onQueryChange: onSearchChange,
    debounceMs: 250,
  });

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
      minColumnWidth={presentation.minColumnWidth ?? CARD_MIN_COLUMN_WIDTH}
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
        <PhiEmptyControl description={presentation.emptyDescription ?? "Nothing here yet."} />
      ) : undefined}
      items={cards}
      pagination={features.pagination?.enabled === false ? null : {
        page: binding.query.page ?? 1,
        pageSize: binding.query.pageSize ?? features.pagination?.pageSize ?? 20,
        total: binding.data?.total ?? items.length,
        ...(features.pagination?.compact === undefined
          ? {}
          : { simple: features.pagination.compact }),
        showSizeChanger: (features.pagination?.pageSizes?.length ?? 0) > 0,
        ...(features.pagination?.pageSizes === undefined
          ? {}
          : { pageSizeOptions: features.pagination.pageSizes }),
        onChange: (page: number, pageSize: number) =>
          binding.setQuery((current) => ({ ...current, page, pageSize })),
      }}
    />
  );
}
