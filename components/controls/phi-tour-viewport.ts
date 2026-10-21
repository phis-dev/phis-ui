/**
 * Where a Tour step's target is brought into view: below whatever stays stuck at the top of the window.
 *
 * Ant Design's Tour knows neither. It scrolls only when the target is not wholly inside the window, so a
 * target taller than the window is scrolled on every step and every scroll event -- to the middle, its
 * top under the Header -- and a target under a sticky Header counts as seen and is not scrolled at all.
 * So the owning Controller sets the window's scroll padding to the cover before the step is presented
 * (design/TOURS.md, Target readiness), `PhiTourControl` hands Ant Design the alignment that fits the
 * target, and once the step stands it brings in a target Ant Design took for seen. Every scroll then
 * aims at the same place, and the one Ant Design repeats on every scroll event moves nothing.
 *
 * Not while the previous step is still shown: Ant Design scrolls back to a shown target that leaves the
 * window, so a scroll begun before the new step is presented is undone by the old one.
 *
 * The cover is found from the target outwards, not by searching the document: the Shell's Header bands
 * and a Page's sticky band are siblings of something the target stands in, so the bands are found among
 * the earlier siblings of the target's ancestors that are stuck, sit at the top, and stand over the target.
 */

/** Whether the viewer asked for less motion: the Tour then jumps rather than glides. */
function prefersPhiTourReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export function resolvePhiTourScrollBehavior(): ScrollBehavior {
  return prefersPhiTourReducedMotion() ? "auto" : "smooth";
}

/** Air between the cover and the target, so a highlighted edge is not drawn against the Header. */
const PHI_TOUR_VIEWPORT_GAP = 8;

function isStuck(element: Element) {
  const { position } = getComputedStyle(element);
  return position === "sticky" || position === "fixed";
}

/** How far down from the window's top the bands that stay put over `target` reach, in pixels. */
function readPhiTourTopCover(target: HTMLElement) {
  const viewHeight = window.innerHeight;
  const targetRect = target.getBoundingClientRect();
  let cover = 0;
  for (let node: Element | null = target; node && node !== document.body; node = node.parentElement) {
    for (let sibling = node.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
      if (!isStuck(sibling)) continue;
      const rect = sibling.getBoundingClientRect();
      const atTop = rect.height > 0 && rect.top < viewHeight / 2 && rect.height < viewHeight / 2;
      const overTarget = rect.left < targetRect.right && rect.right > targetRect.left;
      if (atTop && overTarget) cover = Math.max(cover, rect.bottom);
    }
  }
  return Math.max(0, Math.round(cover));
}

/**
 * Centered where the target fits below the cover, top-aligned under it where it does not: a target
 * taller than what is left of the window is read from its top.
 */
export function resolvePhiTourScrollBlock(
  target: HTMLElement,
  cover = readPhiTourTopCover(target),
): Extract<ScrollLogicalPosition, "center" | "start"> {
  const free = window.innerHeight - cover - PHI_TOUR_VIEWPORT_GAP * 2;
  return target.getBoundingClientRect().height <= free ? "center" : "start";
}

/**
 * Keeps the window's scroll padding at the cover over `target`, so every `scrollIntoView` -- Ant
 * Design's included -- aligns below it. Returns the cover.
 */
export function holdPhiTourViewport(target: HTMLElement) {
  const cover = readPhiTourTopCover(target);
  document.documentElement.style.scrollPaddingTop = `${cover + PHI_TOUR_VIEWPORT_GAP}px`;
  return cover;
}

/**
 * Brings `target` into the part of the window nothing covers. A target already wholly in that part --
 * or, taller than it, already standing at its top -- is left where it is. Returns whether it scrolled.
 */
export function bringPhiTourTargetIntoView(target: HTMLElement, behavior: ScrollBehavior) {
  const cover = holdPhiTourViewport(target);
  const rect = target.getBoundingClientRect();
  const block = resolvePhiTourScrollBlock(target, cover);
  const inView = block === "center"
    ? rect.top >= cover && rect.bottom <= window.innerHeight
    : Math.abs(rect.top - cover - PHI_TOUR_VIEWPORT_GAP) <= 1;
  if (inView) return false;
  target.scrollIntoView({ block, inline: "nearest", behavior });
  return true;
}

/** The window's scroll padding as it was before a Tour set it. */
export function releasePhiTourViewport() {
  document.documentElement.style.scrollPaddingTop = "";
}
