"use client";

import { PlayCircleFilled } from "@ant-design/icons";
import NextImage from "next/image";
import { useEffect, useState, type CSSProperties } from "react";

import { usePhiConfig } from "../root/phi-config-provider";
import {
  grantPhiVideoVisitConsent,
  revokePhiVideoVisitConsent,
  seedPhiVideoVisitConsent,
  usePhiVideoVisitConsent,
} from "../runtime/phi-video-consent-store";
import { PhiButtonControl } from "./phi-button-control";
import { PhiFlexControl } from "./phi-flex-control";
import { PhiTypographyControl } from "./phi-typography-control";

export type PhiVideoEmbedControlLabels = {
  /** What the button offering to fetch the player says. */
  loadLabel: string;
  /** What the button offering to load this provider's videos for the rest of the visit says. */
  loadVisitLabel: string;
  /** The notice, carrying `%1` where the company belongs. */
  noticeText: string;
  /** What a player that loaded from the visit-long answer says, carrying `%1` for the company. */
  visitActiveText: string;
  /** What the control taking that answer back says. */
  forgetLabel: string;
  /** What the link to the recipient's privacy page says. */
  privacyLabel: string;
};

export type PhiVideoEmbedControlProps = {
  /** Where the player comes from, already built from an active provider. */
  embedUrl: string;
  /**
   * Which provider, so an answer given at one placeholder reaches the others.
   *
   * The key and not the title: it is what the visit-long answer is filed under, and consent is per
   * purpose rather than per embed.
   */
  providerKey: string;
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
  providerKey,
  title,
  recipient,
  privacyUrl,
  aspectRatio,
  poster,
  labels,
}: PhiVideoEmbedControlProps) {
  const { token } = usePhiConfig();
  const [pressed, setPressed] = useState(false);
  const visitUnlocked = usePhiVideoVisitConsent(providerKey);

  /*
   * From an effect, because the Server rendered a placeholder and what is in session storage is known
   * only to this tab. Reading it during a render would make the first Client render disagree with the
   * Server's -- the Form draft is restored the same way, and for the same reason.
   */
  useEffect(() => {
    seedPhiVideoVisitConsent(providerKey);
  }, [providerKey]);

  const loaded = pressed || visitUnlocked;

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
    const frame = (
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

    if (!visitUnlocked) {
      return frame;
    }

    /*
     * The way back, next to the player the answer opened.
     *
     * Withdrawal has to be possible at any time and as easily as the consent was given, and the
     * placeholder that asked is gone once it is granted -- so this is where it has to live. Only for the
     * visit-long answer: a single press stores nothing, so there is nothing to take back.
     */
    return (
      <PhiFlexControl vertical gap={token.paddingXS} style={{ width: "100%", minWidth: 0 }}>
        {frame}
        <PhiFlexControl align="center" gap={token.paddingXS} wrap>
          <PhiTypographyControl type="secondary" style={{ fontSize: token.fontSizeSM }}>
            {labels.visitActiveText.replace("%1", recipient)}
          </PhiTypographyControl>
          <PhiButtonControl
            type="link"
            size="small"
            label={labels.forgetLabel}
            onClick={() => {
              revokePhiVideoVisitConsent(providerKey);
              setPressed(false);
            }}
          />
        </PhiFlexControl>
      </PhiFlexControl>
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
        {/*
          * Two controls, labelled apart, and neither doing more than it says.
          *
          * A single button reading "Load video" that quietly unlocked every video would misstate the
          * extent of the processing, which is its own listed breach ([design/CONSENT.md](../../design/CONSENT.md),
          * "On granularity"). So the wider answer is its own press, it names the visit, and nothing is
          * preselected -- the narrow one remains the easier of the two and stores nothing at all.
          */}
        <PhiFlexControl align="center" justify="center" gap={token.paddingXS} wrap>
          <PhiButtonControl
            type="primary"
            // Over a poster a filled button states a second background nobody asked for.
            ghost={Boolean(poster)}
            icon={<PlayCircleFilled />}
            label={labels.loadLabel}
            onClick={() => setPressed(true)}
          />
          <PhiButtonControl
            type="link"
            label={labels.loadVisitLabel}
            onClick={() => grantPhiVideoVisitConsent(providerKey)}
          />
        </PhiFlexControl>
        <PhiTypographyControl
          style={{
            color: poster ? token.colorTextLightSolid : token.colorTextSecondary,
            fontSize: token.fontSizeSM,
          }}
        >
          {/* The company goes where the sentence needs it, which is why the label carries a token. */}
          {labels.noticeText.replace("%1", recipient)}{" "}
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
