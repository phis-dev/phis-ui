"use client";

import { useState } from "react";

import type { PhiClientBlockBaseProps, PhiNoLabels } from "../../../../../types";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import type { PhiMarkdownTocHeading } from "../../../../../types/markdown";
import type { PhiCmsMarkdownTocWidgetConfig } from "./config";
import { PhiAnchorNavControl } from "../../../../../components/controls/phi-anchor-nav-control";
import { PhiEmptyControl } from "../../../../../components/controls/phi-empty-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";

export type PhiMarkdownTocWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  PhiCmsMarkdownTocWidgetConfig
>;

type PhiMarkdownTocSignalState = {
  scopeKey: string;
  headings: PhiMarkdownTocHeading[];
};

/*
 * Indented by depth below the shallowest heading listed, not below `h1`: a contents that starts at `h3`
 * (a document whose headings moved down under a page title) would otherwise stand two steps off its line.
 */
function buildAnchorItems(headings: PhiMarkdownTocHeading[], indent: number) {
  const topLevel = headings.reduce((lowest, heading) => Math.min(lowest, heading.level), Infinity);
  return headings.map((heading) => ({
    key: heading.id,
    href: `#${heading.id}`,
    title: (
      // One line, ending in an ellipsis where it is too long; the whole title then shows on hover, in the
      // house tooltip, and only where something was cut.
      <span style={{ display: "block", paddingInlineStart: (heading.level - topLevel) * indent, minWidth: 0 }}>
        <PhiTypographyControl
          ellipsis={{ tooltip: heading.text }}
          style={{ display: "block", color: "inherit", fontSize: "inherit", lineHeight: "inherit" }}
        >
          {heading.text}
        </PhiTypographyControl>
      </span>
    ),
  }));
}

function filterHeadings(headings: PhiMarkdownTocHeading[], config: PhiCmsMarkdownTocWidgetConfig | undefined) {
  const minLevel = config?.minLevel ?? 1;
  const maxLevel = config?.maxLevel ?? 5;
  return headings.filter((heading) => heading.level >= minLevel && heading.level <= maxLevel);
}

function matchesMarkdownTocSignal(payload: Record<string, unknown>, config: PhiCmsMarkdownTocWidgetConfig | undefined) {
  if (config?.bindingMode !== "target") {
    return true;
  }

  if (config.markdownWidgetId && String(payload.markdownWidgetId ?? "") !== config.markdownWidgetId) {
    return false;
  }

  if (config.tocKey && payload.markdownTocKey !== config.tocKey) {
    return false;
  }

  return Boolean(config.markdownWidgetId || config.tocKey);
}

export function PhiMarkdownTocWidgetClient({ config }: PhiMarkdownTocWidgetClientProps) {
  const { token } = usePhiConfig();
  const [signalState, setSignalState] = useState<PhiMarkdownTocSignalState | null>(null);
  const scopeKey = [
    config?.bindingMode ?? "auto",
    config?.markdownWidgetId ?? "",
    config?.tocKey ?? "",
    config?.minLevel ?? 1,
    config?.maxLevel ?? 5,
  ].join(":");
  const headings = signalState?.scopeKey === scopeKey ? signalState.headings : config?.headings ?? [];
  const showTitle = config?.showTitle !== false;
  const title = config?.title?.trim() || "Contents";

  usePhiSignalListener(
    (signal) => {
      if (signal.action !== "change") {
        return;
      }
      const value = signal.value && typeof signal.value === "object"
        ? signal.value as Record<string, unknown>
        : null;
      const nextHeadings = value?.markdownTocHeadings;
      if (!Array.isArray(nextHeadings) || !matchesMarkdownTocSignal(value ?? {}, config)) {
        return;
      }

      setSignalState({ scopeKey, headings: filterHeadings(nextHeadings, config) });
    },
    { scopes: ["page"], channels: ["meta"] },
  );

  return (
    <nav
      aria-label="Markdown table of contents"
      style={{
        width: "100%",
        maxHeight: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        minWidth: 0,
      }}
    >
      <div style={{ display: "grid", gap: token.paddingSM, width: "100%", minWidth: 0 }}>
        {showTitle ? (
          // Indented as far as the entries' text: the Anchor's rail (`lineWidthBold`) and its link inset
          // (`linkPaddingInlineStart`, which is `padding`).
          <PhiTypographyControl
            strong
            style={{ color: token.colorTextHeading, paddingInlineStart: token.lineWidthBold + token.padding }}
          >
            {title}
          </PhiTypographyControl>
        ) : null}
        {headings.length > 0 ? (
          <PhiAnchorNavControl
            offsetTop={config?.offsetTop ?? 0}
            items={buildAnchorItems(headings, token.paddingSM)}
            style={{ width: "100%" }}
          />
        ) : (
          <PhiEmptyControl description="No markdown headings" />
        )}
      </div>
    </nav>
  );
}
