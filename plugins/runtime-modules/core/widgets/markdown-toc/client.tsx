"use client";

import { useState } from "react";
import { Anchor, Empty, Typography } from "antd";

import type { PhiClientBlockBaseProps, PhiNoLabels } from "../../../../../types";
import { usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import type { PhiCmsMarkdownTocWidgetConfig, PhiMarkdownTocHeading } from "./config";

export type PhiMarkdownTocWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  PhiCmsMarkdownTocWidgetConfig
>;

type PhiMarkdownTocSignalState = {
  scopeKey: string;
  headings: PhiMarkdownTocHeading[];
};

function buildAnchorItems(headings: PhiMarkdownTocHeading[], indent: number) {
  return headings.map((heading) => ({
    key: heading.id,
    href: `#${heading.id}`,
    title: (
      <span style={{ display: "block", paddingInlineStart: (heading.level - 1) * indent }}>
        {heading.text}
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
          <Typography.Text strong style={{ color: token.colorTextHeading }}>
            {title}
          </Typography.Text>
        ) : null}
        {headings.length > 0 ? (
          <Anchor
            affix={false}
            offsetTop={config?.offsetTop ?? 0}
            items={buildAnchorItems(headings, token.paddingSM)}
            style={{ width: "100%" }}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No markdown headings" />
        )}
      </div>
    </nav>
  );
}
