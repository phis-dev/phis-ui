"use client";

import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { theme } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import {
  PhiSequenceViewport,
  resolvePhiSequenceWindowStart,
} from "../../../../../components/motion/phi-sequence-viewport";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiLink } from "../../../../../components/navigation/phi-link";
import type { PhiCmsGalleryWidgetConfig, PhiGalleryImage } from "./config";

/**
 * A run of pictures, and the two things the browser will not do for us.
 *
 * The first is knowing which picture is next. Native lazy loading decides from an element's distance
 * to the viewport, so on a fade -- where every picture sits in the same place -- it loads all of them
 * at once, and on a slide it loads the next one as it arrives, during the transition. Next's escape
 * hatch for a scrolling container, `lazyRoot`, is a deprecated no-op in Next 16. So the window says
 * what loads: what is mounted is wanted, and what is wanted is fetched eagerly.
 *
 * The second is stopping. Autoplay is movement nobody asked for, so it does not start under reduced
 * motion, and it pauses while somebody is pointing at it or has tabbed into it -- a picture that
 * slides away under the cursor is the reason carousels have a bad name.
 */

const DEFAULT_ASPECT_RATIO = "16 / 9";
const DEFAULT_GAP = "8px";

const defaultPageLabel = (from: number, to: number) => `Show pictures ${from} to ${to}`;

/**
 * The words a screen reader says.
 *
 * Passed in rather than translated here, because this Widget has no server half yet to run them
 * through `trBulk`. A caller that already knows the Site's language -- the Marketplace's detail view
 * is the first -- supplies its own; the defaults keep an unwired Builder gallery usable rather than
 * silent.
 */
export type PhiGalleryWidgetLabels = {
  previous?: string;
  next?: string;
  page?: (from: number, to: number) => string;
};

export type PhiGalleryWidgetProps = {
  config?: PhiCmsGalleryWidgetConfig;
  labels?: PhiGalleryWidgetLabels;
};

function GalleryPicture({ image, fit }: { image: PhiGalleryImage; fit: "cover" | "contain" }) {
  const { token } = theme.useToken();
  const picture = (
    <img
      src={image.url}
      alt={image.alt ?? ""}
      // Unconditionally eager, and that is the whole mechanism: nothing outside the window and its
      // lookahead is mounted, so reaching this line already means the picture is wanted. `lazy` would
      // hand the decision back to a browser that cannot see a track.
      loading="eager"
      decoding="async"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: fit,
        borderRadius: token.borderRadius,
        background: token.colorFillQuaternary,
      }}
    />
  );
  return image.href
    ? <PhiLink href={image.href} style={{ display: "block", width: "100%", height: "100%" }}>{picture}</PhiLink>
    : picture;
}

export function PhiGalleryWidget({ config, labels }: PhiGalleryWidgetProps) {
  const { token } = theme.useToken();
  const images = useMemo(() => config?.images ?? [], [config?.images]);
  const visibleCount = config?.visibleCount ?? 1;
  const windowAnchor = config?.windowAnchor ?? "start";
  const loop = config?.loop ?? false;
  const controls = config?.controls ?? "both";
  const autoplayMs = config?.autoplayMs ?? 0;

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const span = Math.min(visibleCount, Math.max(images.length, 1));
  // The last window rather than the last picture: past this the window would hang off the end, and
  // stepping to it would move nothing.
  const lastStart = Math.max(0, images.length - span);

  const step = useCallback((direction: 1 | -1) => {
    setActiveIndex((current) => {
      const next = current + direction * span;
      if (next > lastStart) return loop ? 0 : lastStart;
      if (next < 0) return loop ? lastStart : 0;
      return next;
    });
  }, [lastStart, loop, span]);

  const reducedMotion = useRef(false);
  useEffect(() => {
    reducedMotion.current = typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (autoplayMs <= 0 || paused || images.length <= span || reducedMotion.current) {
      return undefined;
    }
    const timer = window.setInterval(() => step(1), autoplayMs);
    return () => window.clearInterval(timer);
  }, [autoplayMs, images.length, paused, span, step]);

  if (images.length === 0) {
    return null;
  }

  const windowStart = resolvePhiSequenceWindowStart({
    activeIndex: activeIndex,
    visibleCount: span,
    itemCount: images.length,
    anchor: windowAnchor,
  });
  const lookahead = config?.lookahead ?? 1;
  const pageCount = Math.ceil(images.length / span);
  const currentPage = Math.min(Math.floor(windowStart / span), pageCount - 1);

  const frameStyle: CSSProperties = {
    aspectRatio: config?.aspectRatio ?? DEFAULT_ASPECT_RATIO,
    minWidth: 0,
  };

  const atStart = windowStart <= 0;
  const atEnd = windowStart >= lastStart;

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: token.marginXS, minWidth: 0 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div style={{ position: "relative", minWidth: 0 }}>
        <PhiSequenceViewport
          items={images.map((image, index) => (
            <GalleryPicture
              key={`${image.url}-${index}`}
              image={image}
              fit={config?.fit ?? "cover"}
            />
          ))}
          activeIndex={activeIndex}
          visibleCount={span}
          anchor={windowAnchor}
          transition={config?.transition ?? "slide"}
          {...(config?.durationMs === undefined ? {} : { durationMs: config.durationMs })}
          {...(config?.easing === undefined ? {} : { easing: config.easing })}
          lookahead={lookahead}
          mountPolicy={config?.mountPolicy ?? "lazy-keep"}
          gap={config?.gap ?? DEFAULT_GAP}
          itemStyle={frameStyle}
        />
        {controls === "arrows" || controls === "both" ? (
          <>
            <div style={{ position: "absolute", insetBlockStart: "50%", insetInlineStart: token.marginXS, transform: "translateY(-50%)" }}>
              <PhiButtonControl
                icon={<LeftOutlined />}
                ariaLabel={labels?.previous ?? "Previous"}
                shape="circle"
                disabled={atStart && !loop}
                onClick={() => step(-1)}
              />
            </div>
            <div style={{ position: "absolute", insetBlockStart: "50%", insetInlineEnd: token.marginXS, transform: "translateY(-50%)" }}>
              <PhiButtonControl
                icon={<RightOutlined />}
                ariaLabel={labels?.next ?? "Next"}
                shape="circle"
                disabled={atEnd && !loop}
                onClick={() => step(1)}
              />
            </div>
          </>
        ) : null}
      </div>
      {(controls === "dots" || controls === "both") && pageCount > 1 ? (
        <div style={{ display: "flex", justifyContent: "center", gap: token.marginXXS }}>
          {Array.from({ length: pageCount }, (_, page) => (
            <button
              key={page}
              type="button"
              aria-label={(labels?.page ?? defaultPageLabel)(
                page * span + 1,
                Math.min((page + 1) * span, images.length),
              )}
              aria-current={page === currentPage || undefined}
              onClick={() => setActiveIndex(Math.min(page * span, lastStart))}
              style={{
                width: page === currentPage ? token.controlHeightXS : token.marginXS,
                height: token.marginXS,
                padding: 0,
                border: "none",
                cursor: "pointer",
                borderRadius: token.borderRadiusSM,
                background: page === currentPage ? token.colorPrimary : token.colorFill,
                transition: `width ${token.motionDurationMid}, background ${token.motionDurationMid}`,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
