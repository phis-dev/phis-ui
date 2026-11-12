"use client";

import type { PhiSearchSnippetSegment } from "@phis/contracts/search";

import { PhiEmptyControl } from "../../../../../components/controls/phi-empty-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import { PhiLink } from "../../../../../components/navigation/phi-link";
import type { PhiSearchResultsWidgetLabels } from "../../../../../components/widgets/label-types/search-results";
import type { PhiCmsAreaKey } from "../../../../../constants/cms-areas";
import { formatPhiTranslation } from "../../../../../helpers/translation-format";
import { PHI_SPACE } from "../../../../../theme/antd-css-var-contract";
import type { PhiClientBlockBaseProps } from "../../../../../types";

export type PhiSearchResultsWidgetHit = {
  /** The Page's address as a visitor's link is written: locale and Area in front. */
  href: string;
  title: string;
  description: string;
  snippet: PhiSearchSnippetSegment[];
  area: PhiCmsAreaKey;
};

export type PhiSearchResultsWidgetClientConfig = {
  /** The author's heading; absent, the label set's, which names the query. */
  title?: string;
  minLength: number;
} & (
  | { state: "idle" }
  | { state: "short"; query: string }
  | { state: "results"; query: string; total: number; hits: PhiSearchResultsWidgetHit[] }
);

export type PhiSearchResultsWidgetClientProps = PhiClientBlockBaseProps<
  PhiSearchResultsWidgetLabels,
  PhiSearchResultsWidgetClientConfig
>;

function PhiSearchSnippet({ segments }: { segments: PhiSearchSnippetSegment[] }) {
  if (segments.length === 0) return null;
  return (
    <PhiTypographyControl presentation="paragraph" style={{ marginBottom: 0 }}>
      {segments.map((segment, index) => (
        segment.match
          ? <PhiTypographyControl key={index} mark>{segment.text}</PhiTypographyControl>
          : <span key={index}>{segment.text}</span>
      ))}
    </PhiTypographyControl>
  );
}

/**
 * The hits as a list a reader scans: the Page's title as the link, its description, and the passage the
 * query was found in with the words marked. The heading says what was searched for and how many Pages
 * answered, so a reader who arrived by a pasted link knows what they are looking at.
 */
export function PhiSearchResultsWidgetClient({ labels, config }: PhiSearchResultsWidgetClientProps) {
  if (!config) return null;

  if (config.state === "idle") {
    return <PhiTypographyControl type="secondary">{labels.idle}</PhiTypographyControl>;
  }
  if (config.state === "short") {
    return (
      <PhiTypographyControl type="secondary">
        {formatPhiTranslation(labels.short, [String(config.minLength)])}
      </PhiTypographyControl>
    );
  }

  const heading = config.title ?? formatPhiTranslation(labels.heading, [config.query]);
  const count = config.total === 1 ? labels.countOne : formatPhiTranslation(labels.count, [String(config.total)]);

  return (
    <section aria-label={labels.region} style={{ display: "flex", flexDirection: "column", gap: PHI_SPACE.sm }}>
      <div style={{ display: "flex", flexDirection: "column", gap: PHI_SPACE.xxs }}>
        <PhiTypographyControl presentation="title" level={2} style={{ marginTop: 0, marginBottom: 0 }}>
          {heading}
        </PhiTypographyControl>
        {config.hits.length > 0 ? <PhiTypographyControl type="secondary">{count}</PhiTypographyControl> : null}
      </div>
      {config.hits.length === 0 ? (
        <PhiEmptyControl description={formatPhiTranslation(labels.empty, [config.query])} />
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: PHI_SPACE.base }}>
          {config.hits.map((hit) => (
            <li key={hit.href} style={{ display: "flex", flexDirection: "column", gap: PHI_SPACE.xxs }}>
              <PhiTypographyControl presentation="title" level={3} style={{ marginTop: 0, marginBottom: 0 }}>
                <PhiLink href={hit.href}>{hit.title}</PhiLink>
              </PhiTypographyControl>
              <PhiTypographyControl type="secondary" style={{ fontSize: "0.85em" }}>{hit.href}</PhiTypographyControl>
              {hit.description ? (
                <PhiTypographyControl presentation="paragraph" style={{ marginBottom: 0 }}>{hit.description}</PhiTypographyControl>
              ) : null}
              <PhiSearchSnippet segments={hit.snippet} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
