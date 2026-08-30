"use client";

import { Fragment, useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import { Divider, Typography } from "antd";

import { PhiLink } from "../../../../../components/navigation/phi-link";
import type { PhiClientBlockBaseProps, PhiNoLabels } from "../../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../../types/signals";
import { usePhiSignalEmitter } from "../../../../../components/runtime/runtime-signal-identity";
import { usePhiConfig, type PhiConfig } from "../../../../../components/root/phi-config-provider";
import type { PhiMarkdownSpacingKey } from "./config";
import type { PhiMarkdownTocHeading } from "../markdown-toc/config";
import { PhiTableControl, type PhiTableControlColumn } from "../../../../../components/controls/phi-table-control";

export type PhiMarkdownInline =
  | { kind: "text"; text: string }
  | { kind: "strong"; children: PhiMarkdownInline[] }
  | { kind: "emphasis"; children: PhiMarkdownInline[] }
  | { kind: "delete"; children: PhiMarkdownInline[] }
  | { kind: "inline_code"; text: string }
  | { kind: "link"; href: string; external: boolean; children: PhiMarkdownInline[] }
  | { kind: "image"; src: string; alt: string; title?: string }
  | { kind: "break" };

export type PhiMarkdownBlock =
  | { kind: "heading"; id: string; level: 1 | 2 | 3 | 4 | 5; inlines: PhiMarkdownInline[] }
  | { kind: "paragraph"; inlines: PhiMarkdownInline[] }
  | { kind: "blockquote"; children: PhiMarkdownBlock[] }
  | { kind: "list"; ordered: boolean; start?: number; items: PhiMarkdownBlock[][] }
  | { kind: "code"; text: string }
  | { kind: "table"; header: PhiMarkdownInline[][]; rows: PhiMarkdownInline[][][] }
  | { kind: "divider" };

export type PhiMarkdownWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  {
    blocks: PhiMarkdownBlock[];
    error?: string;
    widgetId?: string | number | null;
    tocKey?: string;
    headings?: PhiMarkdownTocHeading[];
    textBlockSpacingBefore?: PhiMarkdownSpacingKey;
    textBlockSpacingAfter?: PhiMarkdownSpacingKey;
    headingBlockSpacingBefore?: PhiMarkdownSpacingKey;
    headingBlockSpacingAfter?: PhiMarkdownSpacingKey;
  }
>;

function resolveMarkdownSpacing(
  token: PhiConfig["token"],
  value: PhiMarkdownSpacingKey | undefined,
  fallback: PhiMarkdownSpacingKey | "none",
) {
  const nextValue = value ?? fallback;
  switch (nextValue) {
    case "none":
      return 0;
    case "xxs":
      return token.paddingXXS;
    case "xs":
      return token.paddingXS;
    case "sm":
      return token.paddingSM;
    case "base":
      return token.padding;
    case "md":
      return token.paddingMD;
    case "lg":
      return token.paddingLG;
    case "xl":
      return token.paddingXL;
    case "xxl":
      return token.paddingXL;
  }
}

function renderInlineNodes(inlines: PhiMarkdownInline[]): ReactNode[] {
  return inlines.map((inline, index) => {
    const key = `${inline.kind}-${index}`;

    switch (inline.kind) {
      case "text":
        return <Fragment key={key}>{inline.text}</Fragment>;
      case "strong":
        return <strong key={key}>{renderInlineNodes(inline.children)}</strong>;
      case "emphasis":
        return <em key={key}>{renderInlineNodes(inline.children)}</em>;
      case "delete":
        return <del key={key}>{renderInlineNodes(inline.children)}</del>;
      case "inline_code":
        return (
          <Typography.Text key={key} code>
            {inline.text}
          </Typography.Text>
        );
      case "link":
        return (
          <PhiLink key={key} href={inline.href || "#"} external={inline.external} newTab={inline.external}>
            {renderInlineNodes(inline.children)}
          </PhiLink>
        );
      case "image":
        return (
          <img
            key={key}
            src={inline.src}
            alt={inline.alt}
            title={inline.title || undefined}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        );
      case "break":
        return <br key={key} />;
    }
  });
}

function renderBlocks(
  blocks: PhiMarkdownBlock[],
  token: PhiConfig["token"],
  paragraphBlockStyle: CSSProperties,
  headingBlockStyle: CSSProperties,
): ReactNode[] {
  return blocks.map((block, index) => {
    const key = `${block.kind}-${index}`;

    switch (block.kind) {
      case "heading":
        return (
          <Typography.Title key={key} id={block.id} level={block.level} style={headingBlockStyle}>
            {renderInlineNodes(block.inlines)}
          </Typography.Title>
        );
      case "paragraph":
        return (
          <Typography.Paragraph key={key} style={paragraphBlockStyle}>
            {renderInlineNodes(block.inlines)}
          </Typography.Paragraph>
        );
      case "blockquote":
        return (
          <blockquote
            key={key}
            style={{
              margin: 0,
              paddingInlineStart: token.paddingLG,
              borderInlineStart: `3px solid ${token.colorBorderSecondary}`,
            }}
          >
            <div style={{ display: "grid", gap: 0 }}>
              {renderBlocks(block.children, token, paragraphBlockStyle, headingBlockStyle)}
            </div>
          </blockquote>
        );
      case "list": {
        const ListTag = block.ordered ? "ol" : "ul";
        return (
          <ListTag
            key={key}
            start={block.ordered ? block.start : undefined}
            style={{ margin: 0, paddingInlineStart: token.paddingMD }}
          >
            {block.items.map((itemBlocks, itemIndex) => (
              <li key={`${key}-item-${itemIndex}`} style={{ marginBlockEnd: token.paddingXS }}>
                <div style={{ display: "grid", gap: token.paddingXS }}>
                  {renderBlocks(itemBlocks, token, paragraphBlockStyle, headingBlockStyle)}
                </div>
              </li>
            ))}
          </ListTag>
        );
      }
      case "code":
        return (
          <pre
            key={key}
            style={{
              margin: 0,
              padding: token.paddingLG,
              overflowX: "auto",
              borderRadius: token.borderRadiusSM,
              background: token.colorFillQuaternary,
            }}
          >
            <code>{block.text}</code>
          </pre>
        );
      case "divider":
        return <Divider key={key} style={{ margin: 0 }} />;
      case "table": {
        type MarkdownTableRow = Record<string, unknown> & { key: string };
        const columns: PhiTableControlColumn<MarkdownTableRow>[] = block.header.map((header, columnIndex) => ({
          key: `column-${columnIndex}`,
          title: renderInlineNodes(header),
          fieldPath: `column-${columnIndex}`,
          sizing: { mode: "fill" },
          render: (value) => Array.isArray(value) ? renderInlineNodes(value as PhiMarkdownInline[]) : null,
        }));
        const rows: MarkdownTableRow[] = block.rows.map((cells, rowIndex) => ({
          key: `row-${rowIndex}`,
          ...Object.fromEntries(cells.map((cell, columnIndex) => [`column-${columnIndex}`, cell])),
        }));
        return <PhiTableControl key={key} rows={rows} rowIdentityPath="key" columns={columns}
          columnOrder={columns.map((column) => column.key)} sortingMode="none" sorts={[]}
          pagination={false} size="small" layout={{ mode: "auto", overflowX: "auto" }} />;
      }
    }
  });
}

export function PhiMarkdownWidgetClient({ config }: PhiMarkdownWidgetClientProps) {
  const { token } = usePhiConfig();
  const blocks = config?.blocks ?? [];
  const headings = useMemo(() => config?.headings ?? [], [config?.headings]);
  const widgetId = config?.widgetId ?? null;
  const emitSignal = usePhiSignalEmitter();

  useEffect(() => {
    if (headings.length === 0) {
      return;
    }

    emitSignal({
      scope: "page",
      channel: "meta",
      action: "change",
      value: {
        markdownWidgetId: widgetId,
        markdownTocKey: config?.tocKey ?? null,
        markdownTocHeadings: headings,
      },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.markdownToc,
      receiver: "broadcast",
    });
  }, [config?.tocKey, emitSignal, headings, widgetId]);

  if (config?.error) {
    return (
      <Typography.Paragraph type="danger" style={{ marginBottom: 0 }}>
        {config.error}
      </Typography.Paragraph>
    );
  }

  if (blocks.length === 0) {
    return null;
  }

  const paragraphBlockStyle: CSSProperties = {
    margin: 0,
    marginBlockStart: resolveMarkdownSpacing(token, config?.textBlockSpacingBefore, "none"),
    marginBlockEnd: resolveMarkdownSpacing(token, config?.textBlockSpacingAfter, "sm"),
  };
  const headingBlockStyle: CSSProperties = {
    margin: 0,
    marginBlockStart: resolveMarkdownSpacing(token, config?.headingBlockSpacingBefore, "none"),
    marginBlockEnd: resolveMarkdownSpacing(token, config?.headingBlockSpacingAfter, "sm"),
  };

  return (
    <div style={{ display: "grid", gap: 0, width: "100%" }}>
      {renderBlocks(blocks, token, paragraphBlockStyle, headingBlockStyle)}
    </div>
  );
}
