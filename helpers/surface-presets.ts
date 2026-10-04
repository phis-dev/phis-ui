import { PHI_COLOR } from "../theme/antd-css-var-contract";
import { readPhiSurface, type PhiSurface } from "../types/surface";

/**
 * The looks a Surface can be given by name: plain Surface values, written into the Surface as they are.
 *
 * Nothing stores the name. A Preset writes the values, the Inspector's style switch writes the same
 * values and reads back which of them a Surface still is -- so an author can start from a card and change
 * its line, and the switch then says `custom` rather than claiming a card it no longer is.
 */

/** A card on the page: the Site's container ground, its quiet line, the soft shadow. */
export const PHI_SURFACE_CARD = {
  background: { base: { kind: "color", color: PHI_COLOR.bgContainer }, overlay: null, filter: null },
  borderSource: "custom",
  border: { borderWidth: 1, borderStyle: "solid", borderColor: PHI_COLOR.borderSecondary },
  shadow: "soft",
} as const satisfies PhiSurface;

/**
 * The quietest ground the Theme has: a filling and nothing else -- no line, no depth. For a box that
 * already stands on a container and only needs its content set off from it; the Form Widget's `wash`
 * step, in Surface values. The fill is translucent, so on the page's own ground it all but disappears.
 */
export const PHI_SURFACE_WASH = {
  background: { base: { kind: "color", color: PHI_COLOR.fillQuaternary }, overlay: null, filter: null },
  borderSource: "none",
  shadow: "none",
} as const satisfies PhiSurface;

export const PHI_SURFACE_PRESETS = {
  card: PHI_SURFACE_CARD,
  wash: PHI_SURFACE_WASH,
} as const;

export type PhiSurfacePresetId = keyof typeof PHI_SURFACE_PRESETS;
export const PHI_SURFACE_PRESET_IDS = Object.keys(PHI_SURFACE_PRESETS) as PhiSurfacePresetId[];

function readLook(surface: PhiSurface | null | undefined) {
  const read = readPhiSurface(surface ?? null);
  if (!read) return null;
  const { tone: _tone, ...look } = read;
  void _tone;
  return Object.keys(look).length > 0 ? JSON.stringify(look) : null;
}

/**
 * Which named look a Surface is, apart from its `tone`: `none` for no look at all, a preset's id where
 * the values are exactly that preset's, `custom` for anything else.
 */
export function resolvePhiSurfacePresetId(
  surface: PhiSurface | null | undefined,
): PhiSurfacePresetId | "none" | "custom" {
  const look = readLook(surface);
  if (look == null) return "none";
  return PHI_SURFACE_PRESET_IDS.find((id) => readLook(PHI_SURFACE_PRESETS[id]) === look) ?? "custom";
}
