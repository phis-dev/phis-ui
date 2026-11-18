"use client";

import { Flex, Typography } from "antd";
import type { CSSProperties } from "react";

import { resolvePhiThemeBorderLine } from "../../helpers/border-widget-style";
import { usePhiConfig } from "../root/phi-config-provider";
import { PhiSpinControl } from "./phi-spin-control";

export type PhiMediaSourceItemTileControlProps = {
  /** What the source calls the item; also what the picture says when it cannot be shown. */
  title: string;
  /** An absolute `https:` address of a small rendition, loaded by the browser straight from the source. */
  thumbnailUrl: string;
  credit?: string | null;
  minColumnWidth: string | number;
  /** Whether this tile's own import is in flight; the tile says so and refuses a second press. */
  busy?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  onSelect?: () => void;
};

/**
 * One thing a media source offers, drawn like an Asset's tile.
 *
 * The picture is a plain `<img>`, never `next/image` and never an address on this Site's server: the
 * optimiser would make the Site's server fetch a foreign address, which is exactly what a source's
 * thumbnail must not cause. The reader's browser loads it, lazily, and tells the source no more than the
 * fact that somebody looked (`referrerPolicy`).
 */
export function PhiMediaSourceItemTileControl({
  title,
  thumbnailUrl,
  credit = null,
  minColumnWidth,
  busy = false,
  busyLabel,
  disabled = false,
  onSelect,
}: PhiMediaSourceItemTileControlProps) {
  const { token } = usePhiConfig();
  const selectable = Boolean(onSelect) && !disabled && !busy;
  const cardStyle: CSSProperties = {
    border: resolvePhiThemeBorderLine(token.colorBorderSecondary),
    borderRadius: "var(--phi-surface-radius)",
    overflow: "hidden",
    padding: 0,
    cursor: selectable ? "pointer" : "default",
    background: token.colorBgContainer,
    opacity: disabled ? 0.65 : undefined,
    textAlign: "left",
    width: "100%",
    position: "relative",
    isolation: "isolate",
    minWidth: typeof minColumnWidth === "number" ? 0 : undefined,
  };
  return (
    <div
      role={onSelect ? "button" : undefined}
      aria-busy={busy || undefined}
      aria-disabled={disabled || busy || undefined}
      tabIndex={selectable ? 0 : undefined}
      style={cardStyle}
      onClick={selectable ? onSelect : undefined}
      onKeyDown={selectable
        ? (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onSelect?.();
          }
        : undefined}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          background: token.colorFillTertiary,
          overflow: "hidden",
        }}
      >
        <img
          alt={title}
          src={thumbnailUrl}
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        {busy ? (
          <Flex
            vertical
            align="center"
            justify="center"
            gap={token.paddingXXS}
            style={{ position: "absolute", inset: 0, zIndex: 2, background: token.colorBgMask }}
          >
            <PhiSpinControl size="small" />
            {busyLabel ? (
              <Typography.Text style={{ color: token.colorTextLightSolid, fontSize: token.fontSizeSM }}>
                {busyLabel}
              </Typography.Text>
            ) : null}
          </Flex>
        ) : null}
        <div
          style={{
            position: "absolute",
            zIndex: 1,
            right: 0,
            bottom: 0,
            left: 0,
            paddingBlock: token.paddingXXS,
            paddingInline: token.paddingXS,
            background: token.colorBgMask,
          }}
        >
          <Typography.Text
            strong
            ellipsis
            title={title}
            style={{
              display: "block",
              color: token.colorTextLightSolid,
              fontSize: token.fontSizeSM,
              lineHeight: 1,
            }}
          >
            {title}
          </Typography.Text>
        </div>
      </div>
      {credit ? (
        <Typography.Text
          type="secondary"
          ellipsis={{ tooltip: credit }}
          style={{
            display: "block",
            paddingBlock: token.paddingXXS,
            paddingInline: token.paddingXS,
            fontSize: token.fontSizeSM,
          }}
        >
          {credit}
        </Typography.Text>
      ) : null}
    </div>
  );
}
