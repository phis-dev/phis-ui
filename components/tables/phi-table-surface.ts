import type { PhiSurface } from "../../types/surface";

/**
 * A Table's ground, in the Surface vocabulary every box uses (`types/surface.ts`, LAYOUTING.md "Surface").
 *
 * A Table draws the part of a Surface that a table can carry -- its ground -- and nothing else:
 *
 * - absent: the Table's own ground, as Ant Design draws it -- the Theme's container ground under the rows,
 *   the header and footer fills over it. The default.
 * - `null`: "None", as the Surface switch says it -- no ground at all. The Table is its row lines on
 *   whatever it stands on: the header, the footer and a summary row paint nothing either. An inspector's
 *   Tables take this one (`PHI_INSPECTOR_TABLE_PRESENTATION`, `helpers/cms-inspector-drawer.ts`).
 * - a Surface whose ground is one colour, with no line, no depth, no mode of its own and no ground per
 *   mode -- `PHI_SURFACE_WASH` is one. The whole Table stands on that colour, its header and footer too.
 *
 * A line, a shadow or a picture is a box around the Table, not the Table's ground: a Table that wants one
 * stands in a Layout or a Widget slot that draws it. The outer frame stays `bordered` / `presentation.borders`.
 */
export type PhiTableSurface = PhiSurface | null;

/** Whether a stated Surface is one a Table can draw: one colour of ground and nothing else. */
export function isPhiTableSurfaceDrawable(surface: PhiSurface): boolean {
  if (surface.backgroundDark != null) return false;
  if (surface.tone != null && surface.tone !== "inherit") return false;
  if (surface.shadow != null && surface.shadow !== "none") return false;
  if (surface.border != null || (surface.borderSource != null && surface.borderSource !== "none")) return false;
  const background = surface.background;
  if (background == null) return true;
  if (background.overlay != null || background.filter != null || background.motion != null) return false;
  return background.base.kind === "color" || background.base.kind === "none";
}

/**
 * The colour a Table with a stated Surface stands on: the Surface's ground colour, or `transparent` for
 * "None" and a Surface that paints none.
 */
export function resolvePhiTableSurfaceGround(surface: PhiTableSurface): string {
  const base = surface?.background?.base;
  return base?.kind === "color" ? base.color : "transparent";
}
