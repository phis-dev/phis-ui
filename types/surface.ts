import { isPhiRecord } from "../helpers/is-record";
import {
  normalizePhiBackgroundWidgetConfig,
  type PhiCmsBackgroundWidgetConfig,
} from "../components/widgets/config/background";
import { readPhiCmsBorderWidgetConfig } from "./cms-border-config";
import { readPhiCmsBorderSource, type PhiCmsBorderSource } from "./cms-border-source";
import type { PhiCmsBorderWidgetConfig } from "./cms-config";
import { readPhiShadow, type PhiShadow } from "./layout-style";

/**
 * The mode a Surface's content is drawn in, against the mode the page wears.
 *
 * `inherit` follows the page. `light` and `dark` hold one mode whatever the page wears -- a dark picture
 * behind a card keeps the card's text light on a light page. `inverse` is always the other mode, so a
 * Surface contrasts with the page in both without the author stating either.
 */
export const PHI_SURFACE_TONES = ["inherit", "light", "dark", "inverse"] as const;

export type PhiSurfaceTone = (typeof PHI_SURFACE_TONES)[number];

export function isPhiSurfaceTone(value: unknown): value is PhiSurfaceTone {
  return typeof value === "string" && PHI_SURFACE_TONES.includes(value as PhiSurfaceTone);
}

/**
 * What a box looks like as a thing standing on the page: its ground, its edge, its depth, and the mode
 * its content is drawn in.
 *
 * One shape for every box that has one -- a Region, an Overlay, a Layout, a Widget. Padding is not part
 * of it, because how far content stands from the edge is geometry, not appearance; nor are a block's
 * `effects`, which say how it arrives rather than what it is.
 *
 * - `background` carries its own Filter: a glass pane or a softened paint is something the ground does.
 * - `borderSource` says where the line comes from. Only `custom` reads `border`, corners included; under
 *   `theme` and `none` the corner is the Site's surface step, so a shape change is seen at once.
 * - `shadow` is depth.
 * - `tone` is the mode the content takes, for a ground the page's own text would not read on.
 *
 * Absent means nothing: a block without a Surface paints nothing and states no edge.
 */
export type PhiSurface = {
  background?: PhiCmsBackgroundWidgetConfig | null;
  borderSource?: PhiCmsBorderSource;
  border?: PhiCmsBorderWidgetConfig | null;
  shadow?: PhiShadow | null;
  tone?: PhiSurfaceTone;
};

/**
 * Who draws a block's Surface, as a Widget declares it.
 *
 * `frame` is the ordinary case: the slot frame around the Widget paints it, and the Widget never knows.
 * `own` is a Widget whose look IS a surface -- a card with a picture clipped to its corners -- so the frame
 * leaves it alone and hands the resolved Surface in. `none` is a Widget a Surface makes no sense on; it
 * is neither offered nor drawn.
 */
export const PHI_SURFACE_POLICIES = ["frame", "own", "none"] as const;

export type PhiSurfacePolicy = (typeof PHI_SURFACE_POLICIES)[number];

/**
 * A stored Surface, read once.
 *
 * Each part is read by the reader that owns it, so a Surface holds exactly what a Background, a border or
 * a shadow would hold on its own. A Surface that states nothing reads as `null`, and the box paints
 * nothing.
 */
export function readPhiSurface(value: unknown): PhiSurface | null {
  if (!isPhiRecord(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const background = isPhiRecord(raw.background)
    ? normalizePhiBackgroundWidgetConfig(raw.background)
    : null;
  const borderSource = readPhiCmsBorderSource(raw.borderSource);
  const border = isPhiRecord(raw.border)
    ? readPhiCmsBorderWidgetConfig(raw.border) ?? null
    : null;
  const shadow = readPhiShadow(raw.shadow) ?? null;
  const tone = isPhiSurfaceTone(raw.tone) && raw.tone !== "inherit" ? raw.tone : undefined;

  const surface: PhiSurface = {
    ...(background ? { background } : {}),
    ...(borderSource ? { borderSource } : {}),
    ...(border ? { border } : {}),
    ...(shadow ? { shadow } : {}),
    ...(tone ? { tone } : {}),
  };
  return Object.keys(surface).length > 0 ? surface : null;
}

/**
 * The class a box carries for its tone, or nothing for `inherit`. Fixed per tone, so the server writes it
 * without knowing the mode; the tone scope inside writes the other mode's variables under it.
 */
export function resolvePhiSurfaceToneClassName(tone: PhiSurfaceTone | null | undefined): string | undefined {
  return tone && tone !== "inherit" ? `phi-tone-${tone}` : undefined;
}
