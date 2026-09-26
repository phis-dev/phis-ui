import { PHI_LAYOUT } from "../../../theme/phi-tokens";
import {
  resolvePhiRenderableBlockGeometry,
  type PhiRenderableBlockGeometryInput,
  type PhiResolvedBlockGeometry,
} from "../../../types/renderable-block-geometry";

/**
 * The two things the root scaffold adds to what the slot frame already writes.
 *
 * The scaffold's slot is a `PhiSlotChildFrame`, and that frame states the general answers inline: a
 * minimum of `0`, a maximum of `100%`, and a width and a height from its policy -- `100%` where the
 * root fills, `fit-content` where it is its content, the stated length where it states one. An inline
 * style wins over every stylesheet, so a scaffold that restated those answers was writing into a
 * declaration that never applied. It restated all six of them, with fallbacks of its own (`100%`,
 * `auto`, `0`, `none`) and with a band handed down by the Region -- and none of it could be seen.
 * That is the answer to the open question: the general answers are the frame's, and the scaffold does
 * not have an exception to state. A Region that wants a band writes it on the box that gives the room,
 * which is where the Structure Region already writes it.
 *
 * What is left is what the frame cannot say. The flex is one: the frame writes no `flex`, and a root
 * that states a size on either axis must stop flexing or the slot stretches it past the size it just
 * stated. The stated width and height are the other, and only for the server preview, which builds its
 * frame without the root's config and would otherwise lose them; everywhere else the frame writes the
 * same value inline and these are inherited and unused. They are written only when there is one, so the
 * declaration that reads them is never left holding an empty variable -- the attribute that gates it is
 * the same "the root stated a size" the value comes from.
 */
export function resolvePhiRootScaffoldProperties(
  geometry: PhiResolvedBlockGeometry,
): Record<`--phi-root-scaffold-${string}`, string> {
  return {
    "--phi-root-scaffold-flex": geometry.explicitInline || geometry.explicitBlock ? "0 0 auto" : "1 1 auto",
    ...(geometry.inline.size == null ? {} : { "--phi-root-scaffold-explicit-width": geometry.inline.size.css }),
    ...(geometry.block.size == null ? {} : { "--phi-root-scaffold-explicit-height": geometry.block.size.css }),
  };
}

/**
 * The width the Canvas gives a sider Region, from the draft's geometry read once: its stated width,
 * else its minimum, else the house sidebar width -- the same order the live Shell falls through.
 */
export function resolvePhiBuilderSiderWidth(draft: PhiRenderableBlockGeometryInput | null | undefined) {
  const geometry = resolvePhiRenderableBlockGeometry(draft);
  return geometry.inline.size?.css ?? geometry.inline.min?.css ?? `${PHI_LAYOUT.sidebarWidth}px`;
}
