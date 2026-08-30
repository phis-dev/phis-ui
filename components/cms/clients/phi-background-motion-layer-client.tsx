"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";

import {
  PHI_BACKGROUND_PARALLAX_DEFAULT_STRENGTH,
  normalizePhiBackgroundWidgetConfig,
  resolvePhiBackgroundWidgetStyle,
  type PhiBackgroundMotion,
  type PhiCmsBackgroundWidgetConfig,
} from "../../widgets/config/background";
import {
  normalizeMediaFocalRect,
  resolveFocalRectCoverCropBox,
  type MediaFocalRect,
} from "../../media/focal-rect";

type PhiBackgroundMotionEntry = {
  host: HTMLElement;
  wrapper: HTMLDivElement;
  layer: HTMLDivElement;
  motion: PhiBackgroundMotion;
  visible: boolean;
  viewportAnchored: boolean;
  scrollContainers: HTMLElement[];
  scrollAnchor: number;
  focalRect: MediaFocalRect | null;
  imageSize: { width: number; height: number } | null;
  fixedImageTop: number | null;
  fixedGeometryKey: string | null;
  baseBackgroundSize: string;
  baseBackgroundPosition: string;
  overlaySizes: string[];
};

const motionEntries = new Set<PhiBackgroundMotionEntry>();
let motionFrame: number | null = null;
let motionIntersectionObserver: IntersectionObserver | null = null;
let motionResizeObserver: ResizeObserver | null = null;
let reducedMotionQuery: MediaQueryList | null = null;

function resetMotionLayerGeometry(entry: PhiBackgroundMotionEntry) {
  const layer = entry.layer;
  layer.style.left = "";
  layer.style.top = "";
  layer.style.bottom = "";
  layer.style.width = "";
  layer.style.height = "";
  layer.style.insetInline = "0";
  layer.style.insetBlock = "0";
  layer.style.backgroundAttachment = "scroll";
  layer.style.backgroundSize = entry.baseBackgroundSize;
  layer.style.backgroundPosition = entry.baseBackgroundPosition;
}

/**
 * Every element whose own scrolling moves this host's content, the host included: a Region becomes a
 * scroll container by carrying `overflowY: auto` on the very shell that hosts the motion, so a walk
 * that starts at the parent misses the only scroller there is. Resolved once at registration, like
 * `viewportAnchored`, rather than re-walked every frame.
 */
function collectPhiMotionScrollContainers(host: HTMLElement) {
  const containers: HTMLElement[] = [];
  for (
    let node: HTMLElement | null = host;
    node && node !== document.body && node !== document.documentElement;
    node = node.parentElement
  ) {
    const overflowY = window.getComputedStyle(node).overflowY;
    // Only a real scroller counts. `visible` reports a scrollHeight past its box whenever content
    // overflows, and counting that would hand every oversized host a journey it never travels.
    if (overflowY === "auto" || overflowY === "scroll") containers.push(node);
  }
  return containers;
}

/**
 * The distance `readMotionScrollOffset` can ever report, so a proportion taken against it is a real
 * fraction of the journey. It mirrors that function edge for edge: whatever contributes offset here
 * contributes range there.
 */
function readMotionScrollRange(containers: readonly HTMLElement[]) {
  let range = document.documentElement.scrollHeight - window.innerHeight;
  for (const container of containers) range += container.scrollHeight - container.clientHeight;
  return range;
}

/**
 * A host is viewport anchored when it stops travelling with the document -- which a Region achieves by
 * sticking an ANCESTOR, not the motion host itself. Reading only the host's own position left the flag
 * false for every authored sticky Region, so its parallax froze the moment the Region came to rest.
 */
function isPhiMotionHostViewportAnchored(host: HTMLElement) {
  for (let node: HTMLElement | null = host; node; node = node.parentElement) {
    const position = window.getComputedStyle(node).position;
    if (position === "sticky" || position === "fixed") return true;
    if (node === document.body) break;
  }
  return false;
}

function readMotionScrollOffset(containers: readonly HTMLElement[]) {
  let offset = window.scrollY;
  for (const container of containers) offset += container.scrollTop;
  return offset;
}

/**
 * Motion modes draw the ORIGINAL asset (never a variant) at the scale where its focal cover
 * crop exactly fills the host, so the resting view is identical to the static rendering and
 * the material around the crop is what the motion reveals. This computes that placement:
 * the drawn image size and how much surplus image extends beyond each host edge.
 */
function resolveMotionImagePlacement(
  entry: PhiBackgroundMotionEntry,
  hostWidth: number,
  hostHeight: number,
) {
  const image = entry.imageSize!;
  const cropBox = resolveFocalRectCoverCropBox(
    image.width,
    image.height,
    Math.max(1, Math.round(hostWidth)),
    Math.max(1, Math.round(hostHeight)),
    entry.focalRect,
  );
  const scaleX = hostWidth / cropBox.width;
  const scaleY = hostHeight / cropBox.height;
  const drawnWidth = image.width * scaleX;
  const drawnHeight = image.height * scaleY;
  const surplusLeft = cropBox.left * scaleX;
  const surplusTop = cropBox.top * scaleY;
  return {
    drawnWidth,
    drawnHeight,
    surplusLeft,
    surplusTop,
    surplusBottom: drawnHeight - surplusTop - hostHeight,
  };
}

// Overlay layers (noise, patterns) keep their declared sizing; only the base image layer —
// always the last entry in the background lists — gets the pixel crop.
function applyMotionLayerBackground(
  entry: PhiBackgroundMotionEntry,
  drawnWidth: number,
  drawnHeight: number,
  positionX: number,
  positionY: number,
) {
  entry.layer.style.backgroundSize = [
    ...entry.overlaySizes,
    `${drawnWidth}px ${drawnHeight}px`,
  ].join(", ");
  entry.layer.style.backgroundPosition = [
    ...Array(entry.overlaySizes.length).fill(entry.baseBackgroundPosition || "center"),
    `${positionX}px ${positionY}px`,
  ].join(", ");
}

function scheduleMotionFrame() {
  if (motionFrame != null) return;
  motionFrame = window.requestAnimationFrame(() => {
    motionFrame = null;
    const reducedMotion = reducedMotionQuery?.matches === true;
    const viewportWidth = Math.max(window.innerWidth, 1);
    const viewportHeight = Math.max(window.innerHeight, 1);

    motionEntries.forEach((entry) => {
      if (!entry.visible && !reducedMotion) return;
      /*
       * A host that scrolls its own content is also the layer's containing block, so an absolutely
       * positioned layer scrolls away with that content while a static CSS background stays on the
       * element. Compensating on the clipping wrapper puts every mode back on the visible box, which
       * is what the resting view is defined against.
       */
      entry.wrapper.style.transform =
        entry.host.scrollTop === 0 && entry.host.scrollLeft === 0
          ? ""
          : `translate3d(${entry.host.scrollLeft}px, ${entry.host.scrollTop}px, 0)`;
      // Until the natural image size is known the crop cannot be computed, so the layer stays
      // in its static host-covering form. Reduced motion keeps that form permanently.
      if (reducedMotion || entry.imageSize == null) {
        resetMotionLayerGeometry(entry);
        entry.layer.style.transform = "translate3d(0, 0, 0)";
        return;
      }

      if (entry.motion.mode === "fixed") {
        // The layer spans the viewport so the image can stay put while the host scrolls
        // across it; the host clips the layer to its own box.
        const rect = entry.host.getBoundingClientRect();
        entry.layer.style.insetInline = "auto";
        entry.layer.style.insetBlock = "auto";
        entry.layer.style.left = "0";
        entry.layer.style.top = "0";
        entry.layer.style.width = `${viewportWidth}px`;
        entry.layer.style.height = `${viewportHeight}px`;
        entry.layer.style.backgroundAttachment = "scroll";
        entry.layer.style.transform = `translate3d(${-rect.left}px, ${-rect.top}px, 0)`;

        const placement = resolveMotionImagePlacement(entry, rect.width, rect.height);
        const geometryKey = `${viewportWidth}x${viewportHeight}:${rect.width}x${rect.height}`;
        if (entry.fixedImageTop == null || entry.fixedGeometryKey !== geometryKey) {
          entry.fixedImageTop = rect.top - placement.surplusTop;
          entry.fixedGeometryKey = geometryKey;
        }
        // Keep the image anchored in viewport coordinates while it still covers the host;
        // at the image edges it moves along with the host instead of leaving a gap.
        const imageTop = Math.min(
          rect.top,
          Math.max(entry.fixedImageTop, rect.top + rect.height - placement.drawnHeight),
        );
        applyMotionLayerBackground(
          entry,
          placement.drawnWidth,
          placement.drawnHeight,
          rect.left - placement.surplusLeft,
          imageTop,
        );
        return;
      }

      if (entry.motion.mode !== "parallax") return;
      const rect = entry.host.getBoundingClientRect();
      const strength = Math.max(
        0,
        Math.min(1, entry.motion.strength ?? PHI_BACKGROUND_PARALLAX_DEFAULT_STRENGTH),
      );
      const direction = entry.motion.direction === "reverse" ? -1 : 1;
      const placement = resolveMotionImagePlacement(entry, rect.width, rect.height);
      const range = entry.motion.travel === "range";
      /*
       * The layer bleeds beyond the host only as far as the original actually has surplus material, so
       * the travel never exposes a gap and never rescales the crop. `rate` additionally caps the room it
       * will use at the distance a rate of `strength` can cover; `range` wants all of it, because it
       * divides that room across the whole progress rather than spending it at a fixed speed.
       */
      const overscan = range
        ? Number.POSITIVE_INFINITY
        : Math.ceil(((viewportHeight + Math.max(rect.height, 1)) * strength) / 2);
      const topBleed = Math.min(overscan, Math.max(0, Math.floor(placement.surplusTop)));
      const bottomBleed = Math.min(overscan, Math.max(0, Math.floor(placement.surplusBottom)));
      const centerDelta = rect.top + rect.height / 2 - viewportHeight / 2;
      /*
       * Progress is the same quantity in both travel modes -- how far through the effect's life the
       * reader is -- and it is measured differently only because the two host kinds live differently. An
       * anchored host is alive for the whole scroll; a travelling one for its own crossing of the
       * viewport, which is why `rate` sizes its cap to exactly that crossing.
       */
      const span = (viewportHeight + Math.max(rect.height, 1)) / 2;
      const progress = entry.viewportAnchored
        ? (readMotionScrollOffset(entry.scrollContainers) - entry.scrollAnchor) / Math.max(1, readMotionScrollRange(entry.scrollContainers))
        : -centerDelta / span;
      const signed = Math.max(-1, Math.min(1, progress)) * direction;
      const rawOffset = range
        ? signed * strength * (signed >= 0 ? topBleed : bottomBleed)
        : (entry.viewportAnchored
            ? (readMotionScrollOffset(entry.scrollContainers) - entry.scrollAnchor) * strength * direction
            : -centerDelta * strength * direction);
      const offset = Math.max(-bottomBleed, Math.min(topBleed, rawOffset));

      entry.layer.style.left = "";
      entry.layer.style.width = "";
      entry.layer.style.height = "";
      entry.layer.style.insetInline = "0";
      entry.layer.style.insetBlock = "auto";
      entry.layer.style.top = `${-topBleed}px`;
      entry.layer.style.bottom = `${-bottomBleed}px`;
      entry.layer.style.backgroundAttachment = "scroll";
      entry.layer.style.transform = `translate3d(0, ${offset}px, 0)`;
      applyMotionLayerBackground(
        entry,
        placement.drawnWidth,
        placement.drawnHeight,
        -placement.surplusLeft,
        topBleed - placement.surplusTop,
      );
    });
  });
}

function ensureMotionCoordinator() {
  if (motionIntersectionObserver == null) {
    motionIntersectionObserver = new IntersectionObserver((records) => {
      records.forEach((record) => {
        motionEntries.forEach((entry) => {
          if (entry.host === record.target) entry.visible = record.isIntersecting;
        });
      });
      scheduleMotionFrame();
    }, { rootMargin: "25% 0px" });
  }
  if (motionResizeObserver == null) {
    motionResizeObserver = new ResizeObserver(scheduleMotionFrame);
  }
  if (reducedMotionQuery == null) {
    reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionQuery.addEventListener("change", scheduleMotionFrame);
  }
  if (motionEntries.size === 0) {
    window.addEventListener("scroll", scheduleMotionFrame, { capture: true, passive: true });
    window.addEventListener("resize", scheduleMotionFrame, { passive: true });
  }
}

function registerMotionEntry(entry: PhiBackgroundMotionEntry) {
  ensureMotionCoordinator();
  motionEntries.add(entry);
  motionIntersectionObserver?.observe(entry.host);
  motionResizeObserver?.observe(entry.host);
  scheduleMotionFrame();

  return () => {
    motionEntries.delete(entry);
    motionIntersectionObserver?.unobserve(entry.host);
    motionResizeObserver?.unobserve(entry.host);
    if (motionEntries.size !== 0) return;

    window.removeEventListener("scroll", scheduleMotionFrame, true);
    window.removeEventListener("resize", scheduleMotionFrame);
    reducedMotionQuery?.removeEventListener("change", scheduleMotionFrame);
    motionIntersectionObserver?.disconnect();
    motionResizeObserver?.disconnect();
    motionIntersectionObserver = null;
    motionResizeObserver = null;
    reducedMotionQuery = null;
    if (motionFrame != null) window.cancelAnimationFrame(motionFrame);
    motionFrame = null;
  };
}

export function PhiBackgroundMotionLayerClient({
  config,
}: {
  config: PhiCmsBackgroundWidgetConfig;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const normalized = useMemo(() => normalizePhiBackgroundWidgetConfig(config), [config]);
  const motion = normalized.base.kind === "image" ? normalized.motion : null;
  const backgroundStyle = useMemo(
    () =>
      resolvePhiBackgroundWidgetStyle({
        ...normalized,
        // Motion modes always draw the original asset: a variant is already reduced to the
        // visible crop and leaves the effect no material to reveal. The focal rect steers
        // the crop; a configured variant is deliberately ignored here.
        base:
          normalized.base.kind === "image"
            ? { ...normalized.base, variantKey: null, variantVersion: null }
            : normalized.base,
        effect: null,
        motion: null,
      }),
    [normalized],
  );

  useEffect(() => {
    const wrapper = hostRef.current;
    const host = wrapper?.parentElement;
    const layer = layerRef.current;
    if (!wrapper || !host || !layer || !motion || motion.mode === "static") return;
    const scrollContainers = collectPhiMotionScrollContainers(host);
    const entry: PhiBackgroundMotionEntry = {
      host,
      wrapper,
      layer,
      motion,
      visible: true,
      viewportAnchored: isPhiMotionHostViewportAnchored(host),
      scrollContainers,
      scrollAnchor: readMotionScrollOffset(scrollContainers),
      focalRect:
        normalized.base.kind === "image"
          ? normalizeMediaFocalRect(normalized.base.focalRect ?? null)
          : null,
      imageSize: null,
      fixedImageTop: null,
      fixedGeometryKey: null,
      baseBackgroundSize: layer.style.backgroundSize,
      baseBackgroundPosition: layer.style.backgroundPosition,
      // The base image is always the last background layer; everything before it is overlay.
      overlaySizes: layer.style.backgroundSize.split(",").map((part) => part.trim()).slice(0, -1),
    };

    // The crop math needs the natural image size. The probe element only reads dimensions;
    // the browser reuses the already-requested background image.
    let probe: HTMLImageElement | null = null;
    const imageUrlMatches = [...String(backgroundStyle.backgroundImage ?? "").matchAll(/url\("([^"]+)"\)/g)];
    const imageUrl = imageUrlMatches.at(-1)?.[1];
    if (imageUrl) {
      probe = new Image();
      probe.onload = () => {
        if (probe && probe.naturalWidth > 0 && probe.naturalHeight > 0) {
          entry.imageSize = { width: probe.naturalWidth, height: probe.naturalHeight };
          scheduleMotionFrame();
        }
      };
      probe.src = imageUrl;
    }

    const unregister = registerMotionEntry(entry);
    return () => {
      if (probe) probe.onload = null;
      probe = null;
      unregister();
    };
  }, [motion, normalized, backgroundStyle]);

  if (!motion || motion.mode === "static" || normalized.base.kind !== "image") return null;

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      data-phi-background-motion={motion.mode}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: "inherit",
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      <div
        ref={layerRef}
        style={{
          ...backgroundStyle,
          position: "absolute",
          insetInline: 0,
          insetBlock: 0,
          willChange: "transform",
        } as CSSProperties}
      />
    </div>
  );
}
