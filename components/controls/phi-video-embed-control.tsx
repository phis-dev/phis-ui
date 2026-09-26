"use client";

import { PlayCircleFilled } from "@ant-design/icons";
import NextImage from "next/image";
import { useState, type CSSProperties } from "react";

import { usePhiConfig } from "../root/phi-config-provider";
import { PhiButtonControl } from "./phi-button-control";
import { PhiFlexControl } from "./phi-flex-control";
import { PhiTypographyControl } from "./phi-typography-control";

export type PhiVideoEmbedControlLabels = {
  /** What the button offering to fetch the player says. */
  loadLabel: string;
  /** The notice, carrying `{recipient}` where the company belongs. */
  noticeText: string;
  /** What the link to the recipient's privacy page says. */
  privacyLabel: string;
};

export type PhiVideoEmbedControlProps = {
  /** Where the player comes from, already built from an active provider. */
  embedUrl: string;
  /** What the placeholder is titled and what the player is announced as. */
  title: string;
  /** Who receives the request, named as a company. */
  recipient: string;
  privacyUrl: string;
  aspectRatio: number;
  /** A still picture from this Site's own Media library, never the provider's thumbnail. */
  poster?: { url: string; unoptimized?: boolean } | null;
  labels: PhiVideoEmbedControlLabels;
};

/**
 * A video from somewhere else, and the request that fetches it.
 *
 * The placeholder is not a stand-in for something blocked: it is where the consent is asked, which is
 * why it names the recipient and links to their privacy page rather than saying "cookies"
 * ([design/CONSENT.md](../../design/CONSENT.md)). Nothing leaves this origin until the button is pressed
 * -- no player, no thumbnail, no ping -- and nothing is stored when it is, so there is no consent record
 * to keep and none to expire. The answer lasts this view, and the next view asks again.
 *
 * This is the only `<iframe>` in the tree, and it is here for the same reason Ant Design primitives are
 * wrapped: a third-party frame is a boundary worth having exactly one of.
 */
export function PhiVideoEmbedControl({
  embedUrl,
  title,
  recipient,
  privacyUrl,
  aspectRatio,
  poster,
  labels,
}: PhiVideoEmbedControlProps) {
  const { token } = usePhiConfig();
  const [loaded, setLoaded] = useState(false);

  const frameStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    aspectRatio: `${aspectRatio}`,
    border: `1px solid ${token.colorBorderSecondary}`,
    // A frame a Site draws itself, so it takes the Site's surface step (THEME.md, "Control shape").
    // No fallback beside it: `usePhiConfig` above throws without the Provider that writes the property.
    borderRadius: "var(--phi-surface-radius)",
    overflow: "hidden",
    background: token.colorFillTertiary,
    isolation: "isolate",
  };

  if (loaded) {
    return (
      <div style={frameStyle}>
        <iframe
          src={embedUrl}
          title={title}
          loading="lazy"
          /*
           * Autoplay because the press that mounted this frame was the ask; fullscreen and
           * picture-in-picture because a player without them is a worse player. No `sandbox`: every
           * provider's player needs scripts and same-origin storage of its own, so the attribute would
           * only break it while protecting nothing this frame can reach.
           */
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      </div>
    );
  }

  return (
    <div style={frameStyle}>
      {poster ? (
        <NextImage
          alt=""
          src={poster.url}
          fill
          unoptimized={poster.unoptimized}
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      ) : null}
      <PhiFlexControl
        vertical
        align="center"
        justify="center"
        gap={token.paddingSM}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          paddingInline: token.paddingLG,
          paddingBlock: token.padding,
          textAlign: "center",
          // Readable over any poster, and over the plain surface when there is none.
          background: poster ? token.colorBgMask : "transparent",
        }}
      >
        <PhiTypographyControl
          strong
          style={{ color: poster ? token.colorTextLightSolid : token.colorText }}
        >
          {title}
        </PhiTypographyControl>
        <PhiButtonControl
          type="primary"
          // Over a poster a filled button states a second background nobody asked for.
          ghost={Boolean(poster)}
          icon={<PlayCircleFilled />}
          label={labels.loadLabel}
          onClick={() => setLoaded(true)}
        />
        <PhiTypographyControl
          style={{
            color: poster ? token.colorTextLightSolid : token.colorTextSecondary,
            fontSize: token.fontSizeSM,
          }}
        >
          {/* The company goes where the sentence needs it, which is why the label carries a token. */}
          {labels.noticeText.replace("{recipient}", recipient)}{" "}
          <PhiTypographyControl
            presentation="link"
            href={privacyUrl}
            target="_blank"
            rel="noreferrer noopener"
            style={{ fontSize: token.fontSizeSM }}
          >
            {labels.privacyLabel}
          </PhiTypographyControl>
        </PhiTypographyControl>
      </PhiFlexControl>
    </div>
  );
}
