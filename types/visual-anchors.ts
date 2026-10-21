import type { PhiSignalAddress } from "./signals";

/*
 * Visual anchors ([design/TOURS.md](../design/TOURS.md), Visual-anchor registration), apart from the Tour
 * definition in `types/tours.ts`: Controls and Widgets that only mark and offer their parts import this,
 * and every Client chunk that does would otherwise carry the Tour's definition checks along with it.
 */

/**
 * The addresses a step can point at: a CMS instance, one of its declared subcontrols, a Region. A
 * Controller is an address too, but it owns no element, so it is never a visual target.
 */
export type PhiVisualAnchorAddress = Exclude<PhiSignalAddress, `controller:${string}`>;

/**
 * The attribute a Phi Control marks one of its parts with -- a Table's header row, its toolbar -- so the
 * Widget drawing that Control can offer the part as `cms:<instanceId>:<part>` (design/TOURS.md,
 * Visual-anchor registration). An inert mark until a Widget registers the part: the address is the
 * Widget's contract, the attribute only says where the part is drawn.
 */
export const PHI_VISUAL_ANCHOR_PART_ATTRIBUTE = "data-phi-anchor-part";

/** The instance a part address belongs to -- `cms:<id>` of `cms:<id>:<part>` -- or `null` for a whole one. */
export function readPhiVisualAnchorOwner(address: string): PhiVisualAnchorAddress | null {
  const [family, instanceId, part] = address.split(":");
  return family === "cms" && instanceId && part ? `cms:${instanceId}` as PhiVisualAnchorAddress : null;
}
