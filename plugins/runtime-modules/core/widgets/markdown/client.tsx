"use client";

import { Fragment, useEffect, useMemo, type CSSProperties, type ReactNode } from "react";

import { PhiLink } from "../../../../../components/navigation/phi-link";
import type { PhiClientBlockBaseProps, PhiNoLabels } from "../../../../../types";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../../types/signals";
import { usePhiSignalEmitter } from "../../../../../components/runtime/runtime-signal-identity";
import { usePhiConfig, type PhiConfig } from "../../../../../components/root/phi-config-provider";
import type { PhiCodeToken, PhiCodeTokenKind } from "./code-tokens";
import type { PhiMarkdownSpacingKey, PhiMarkdownTextAlign } from "../../../../../types/core-widget-placements";
import type { PhiMarkdownTocHeading } from "../markdown-toc/config";
import { PhiPlainTable } from "../../../../../components/tables/phi-plain-table";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import { PhiDividerControl } from "../../../../../components/controls/phi-divider-control";

export type PhiMarkdownInline =
  | { kind: "text"; text: string }
  | { kind: "strong"; children: PhiMarkdownInline[] }
  | { kind: "emphasis"; children: PhiMarkdownInline[] }
  | { kind: "delete"; children: PhiMarkdownInline[] }
  | { kind: "inline_code"; text: string }
  | { kind: "link"; href: string; external: boolean; children: PhiMarkdownInline[] }
  | { kind: "image"; src: string; alt: string; title?: string }
  | { kind: "break" };

export type PhiMarkdownTableAlign = "left" | "center" | "right" | null;

export type PhiMarkdownBlock =
  | { kind: "heading"; id: string; level: 1 | 2 | 3 | 4 | 5; inlines: PhiMarkdownInline[] }
  | { kind: "paragraph"; inlines: PhiMarkdownInline[] }
  | { kind: "blockquote"; children: PhiMarkdownBlock[] }
  | { kind: "list"; ordered: boolean; start?: number; items: PhiMarkdownBlock[][] }
  | {
      kind: "code";
      /**
       * The language the fence named, as `resolvePhiCodeLanguage` knows it, or `null` for a block
       * that named none or named one this house does not read. Either way the tokens below are the
       * whole block; the name is here because a reader of the rendered page should be able to tell
       * what was read, and it goes out as a `data-` attribute.
       */
      language: string | null;
      tokens: PhiCodeToken[];
    }
  | {
      kind: "table";
      header: PhiMarkdownInline[][];
      rows: PhiMarkdownInline[][][];
      /** One entry per column, from the GFM delimiter row; `null` where the column states none. */
      align: PhiMarkdownTableAlign[];
    }
  | { kind: "divider" };

export type PhiMarkdownWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  {
    blocks: PhiMarkdownBlock[];
    error?: string;
    widgetId?: string | number | null;
    tocKey?: string;
    headings?: PhiMarkdownTocHeading[];
    textAlign?: PhiMarkdownTextAlign;
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

/**
 * The colour a kind of code is drawn in, from the Theme and from nowhere else.
 *
 * Only the palette's own seeds are read -- primary, success, warning, error, info and the text
 * shades -- so a Site that repaints its palette repaints its code samples, and both halves of the
 * Theme come out right without a second table. That is also the whole budget: the palette states
 * four hues, so kinds that never meet share one. `property` belongs to the languages that are keys
 * and values and have no keywords of their own; `function` belongs to the ones that do.
 *
 * Plain text answers nothing and inherits the block's own colour, which is one `<span>` per run of
 * ordinary code that the page does not have to carry.
 */
function resolveCodeTokenColor(kind: PhiCodeTokenKind, token: PhiConfig["token"]): string | undefined {
  switch (kind) {
    case "plain":
      return undefined;
    case "comment":
      return token.colorTextTertiary;
    case "punctuation":
      return token.colorTextSecondary;
    case "keyword":
      return token.colorPrimary;
    case "string":
      return token.colorSuccess;
    case "number":
    case "literal":
      return token.colorWarning;
    case "function":
      return token.colorError;
    case "property":
      return token.colorInfo;
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
          <PhiTypographyControl key={key} code>
            {inline.text}
          </PhiTypographyControl>
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
          <PhiTypographyControl presentation="title" key={key} id={block.id} level={block.level} style={headingBlockStyle}>
            {renderInlineNodes(block.inlines)}
          </PhiTypographyControl>
        );
      case "paragraph":
        return (
          <PhiTypographyControl presentation="paragraph" key={key} style={paragraphBlockStyle}>
            {renderInlineNodes(block.inlines)}
          </PhiTypographyControl>
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
            data-phi-code-language={block.language ?? undefined}
            style={{
              margin: 0,
              padding: token.paddingLG,
              overflowX: "auto",
              borderRadius: token.borderRadiusSM,
              background: token.colorFillQuaternary,
              fontFamily: token.fontFamilyCode,
            }}
          >
            <code>
              {block.tokens.map((codeToken, tokenIndex) => {
                const color = resolveCodeTokenColor(codeToken.kind, token);
                return color == null
                  ? <Fragment key={tokenIndex}>{codeToken.text}</Fragment>
                  : <span key={tokenIndex} style={{ color }}>{codeToken.text}</span>;
              })}
            </code>
          </pre>
        );
      case "divider":
        return <PhiDividerControl key={key} style={{ margin: 0 }} />;
      case "table":
        /*
         * A plain table, not the Table Control: Markdown only shows rows, and the Control's editors,
         * sorting and drag reordering put some twenty chunks on every page with a Markdown Widget.
         */
        return (
          <PhiPlainTable
            key={key}
            columns={block.header.map((header, columnIndex) => ({
              key: `column-${columnIndex}`,
              title: renderInlineNodes(header),
              align: block.align[columnIndex] ?? null,
            }))}
            rows={block.rows.map((cells, rowIndex) => ({
              key: `row-${rowIndex}`,
              cells: cells.map((cell) => renderInlineNodes(cell)),
            }))}
          />
        );
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
      <PhiTypographyControl presentation="paragraph" type="danger" style={{ marginBottom: 0 }}>
        {config.error}
      </PhiTypographyControl>
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
    <div style={{ display: "grid", gap: 0, width: "100%", textAlign: config?.textAlign }}>
      {renderBlocks(blocks, token, paragraphBlockStyle, headingBlockStyle)}
    </div>
  );
}
