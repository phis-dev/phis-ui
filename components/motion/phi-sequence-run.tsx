"use client";

import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { usePhiConfig } from "../root/phi-config-provider";
import { PhiButtonControl } from "../controls/phi-button-control";
import {
  resolvePhiCarouselCurrentPage,
  resolvePhiCarouselPageStarts,
  resolvePhiCarouselStep,
} from "../layouts/phi-carousel-pages";
import { PhiIcon } from "../shell/phi-icon";
import { resolvePhiSpacingScaleValue } from "../widgets/config/spacing-options";
import {
  PHI_SEQUENCE_SETTINGS_DEFAULTS,
  type PhiSequenceSettings,
} from "../widgets/config/sequence-settings";
import type { PhiSequenceControlLabels } from "../widgets/label-types/sequence";
import { PhiSequenceViewport, resolvePhiSequenceWindowStart } from "./phi-sequence-viewport";
import { usePhiSequenceAutoplay } from "./use-phi-sequence-autoplay";
import { usePhiSequenceGestures } from "./use-phi-sequence-gestures";

/** The dots' label, `%1` the first and `%2` the last item a page shows. */
function formatPageLabel(template: string, from: number, to: number) {
  return template.replace("%1", String(from)).replace("%2", String(to));
}

/** How many items stand in the window: never more than there are, never fewer than one. */
export function resolvePhiSequenceRunSpan(visibleCount: number | undefined, itemCount: number) {
  return Math.min(visibleCount ?? PHI_SEQUENCE_SETTINGS_DEFAULTS.visibleCount, Math.max(itemCount, 1));
}

/**
 * A run of items shown a few at a time, and the two things the browser will not do for us.
 *
 * The first is knowing which item is next. Native lazy loading decides from an element's distance to
 * the viewport, so on a fade -- where every item sits in the same place -- it loads all of them at once,
 * and on a slide it loads the next one as it arrives, during the transition. So the window says what
 * loads: what is mounted is wanted, and an item that loads anything should load it eagerly.
 *
 * The second is stopping: `usePhiSequenceAutoplay` holds every way to decline movement nobody asked
 * for, and the Pause button is the one a finger has, since a finger neither hovers nor tabs. Where
 * the window stops -- the last window rather than the last multiple of the window -- is the Carousel
 * Layout's list of stops (`phi-carousel-pages.ts`), read by the arrows, the dots and the timer alike.
 *
 * What the items are is the caller's: the Gallery's pictures, the Entries list's cards.
 */
export function PhiSequenceRun({
  items,
  settings,
  labels,
  itemStyle,
}: {
  /** Keyed by the caller; the run neither wraps nor rekeys them. */
  items: readonly ReactNode[];
  settings: PhiSequenceSettings | undefined;
  labels: PhiSequenceControlLabels;
  itemStyle?: CSSProperties;
}) {
  const { token } = usePhiConfig();
  const defaults = PHI_SEQUENCE_SETTINGS_DEFAULTS;
  const loop = settings?.loop ?? defaults.loop;
  const controls = settings?.controls ?? defaults.controls;
  const autoplayMs = settings?.autoplayMs ?? defaults.autoplayMs;
  const itemCount = items.length;

  const [activeIndex, setActiveIndex] = useState(0);

  const span = resolvePhiSequenceRunSpan(settings?.visibleCount, itemCount);
  const pageStarts = useMemo(() => resolvePhiCarouselPageStarts(itemCount, span), [itemCount, span]);
  const lastStart = pageStarts[pageStarts.length - 1] ?? 0;

  const step = useCallback((direction: 1 | -1) => {
    setActiveIndex((current) => resolvePhiCarouselStep(pageStarts, current, direction, loop));
  }, [loop, pageStarts]);
  const advance = useCallback(() => step(1), [step]);
  const autoplay = usePhiSequenceAutoplay({ intervalMs: autoplayMs, active: itemCount > span, advance });
  // A step somebody took: the next automatic one is a whole interval away again.
  const stepByHand = useCallback((direction: 1 | -1) => {
    step(direction);
    autoplay.restart();
  }, [autoplay, step]);
  const gestures = usePhiSequenceGestures({ step: stepByHand });

  if (itemCount === 0) {
    return null;
  }

  const windowStart = resolvePhiSequenceWindowStart({
    activeIndex,
    visibleCount: span,
    itemCount,
    anchor: "start",
  });
  const pageCount = pageStarts.length;
  const currentPage = resolvePhiCarouselCurrentPage(pageStarts, windowStart);

  const atStart = windowStart <= 0;
  const atEnd = windowStart >= lastStart;
  // Two disabled arrows over a single item say nothing; the dots already know to stay away.
  const showArrows = (controls === "arrows" || controls === "both") && itemCount > span;
  const showDots = (controls === "dots" || controls === "both") && pageCount > 1;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.region}
      style={{ display: "flex", flexDirection: "column", gap: token.marginXS, width: "100%", minWidth: 0, ...gestures.style }}
      {...autoplay.holdHandlers}
      {...gestures.handlers}
    >
      {/* Announced only while it stands still: a moving sequence read aloud is noise. */}
      <div style={{ position: "relative", minWidth: 0 }} aria-live={autoplay.running ? "off" : "polite"}>
        <PhiSequenceViewport
          items={[...items]}
          activeIndex={activeIndex}
          visibleCount={span}
          anchor="start"
          transition={settings?.transition ?? defaults.transition}
          {...(settings?.durationMs === undefined ? {} : { durationMs: settings.durationMs })}
          {...(settings?.easing === undefined ? {} : { easing: settings.easing })}
          lookahead={settings?.lookahead ?? defaults.lookahead}
          mountPolicy={settings?.mountPolicy ?? defaults.mountPolicy}
          gap={resolvePhiSpacingScaleValue(settings?.gap ?? defaults.gap)}
          itemStyle={itemStyle}
        />
        {showArrows ? (
          <>
            <div style={{ position: "absolute", insetBlockStart: "50%", insetInlineStart: token.marginXS, transform: "translateY(-50%)" }}>
              <PhiButtonControl
                icon={<PhiIcon name="left" size="inherit" />}
                ariaLabel={labels.previous}
                shape="circle"
                disabled={atStart && !loop}
                onClick={() => stepByHand(-1)}
              />
            </div>
            <div style={{ position: "absolute", insetBlockStart: "50%", insetInlineEnd: token.marginXS, transform: "translateY(-50%)" }}>
              <PhiButtonControl
                icon={<PhiIcon name="right" size="inherit" />}
                ariaLabel={labels.next}
                shape="circle"
                disabled={atEnd && !loop}
                onClick={() => stepByHand(1)}
              />
            </div>
          </>
        ) : null}
        {autoplay.offered ? (
          // The one stop a finger has: hovering and tabbing are not things a touch screen does.
          <div style={{ position: "absolute", insetBlockEnd: token.marginXS, insetInlineEnd: token.marginXS }}>
            <PhiButtonControl
              icon={<PhiIcon name={autoplay.stopped ? "play-circle" : "pause-circle"} size="inherit" />}
              ariaLabel={autoplay.stopped ? labels.play : labels.pause}
              ariaPressed={autoplay.stopped}
              shape="circle"
              onClick={autoplay.toggleStopped}
            />
          </div>
        ) : null}
      </div>
      {showDots ? (
        <div role="group" aria-label={labels.pages} style={{ display: "flex", justifyContent: "center", gap: token.marginXXS }}>
          {Array.from({ length: pageCount }, (_, page) => (
            <button
              key={page}
              type="button"
              aria-label={formatPageLabel(
                labels.page,
                (pageStarts[page] ?? 0) + 1,
                Math.min((pageStarts[page] ?? 0) + span, itemCount),
              )}
              aria-current={page === currentPage || undefined}
              onClick={() => {
                setActiveIndex(pageStarts[page] ?? 0);
                autoplay.restart();
              }}
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
